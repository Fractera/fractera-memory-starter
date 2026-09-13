// @api приём объекта целиком: память сама описывает файл и кладёт его в четыре хранилища — вход `/v1/keep_object`
import { NextResponse } from "next/server"
import { ingest } from "@/lib/fractera/objects"
import { fetchUrl } from "@/lib/fractera/fetch-url"
import { benchGuard } from "@/lib/bench-guard"

// ДВЕРЬ ПРИЁМА ОБЪЕКТА (194-15, с 194-16 — и по адресу).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13: «Делай полный вариант: методы объектов в API»; про `media` у remember —
// «Через ingest».
//
// 🔒 ЧЕМ ОНА ОТЛИЧАЕТСЯ ОТ ДВЕРИ СТЕНДА `object-test`: там человек делает два хода — получает описание,
// правит его и только потом сохраняет. Внешний зовущий (API, Telegram) второго хода не делает, поэтому
// здесь оба хода — одна функция `ingest()`: описание моделью, если своё не прислано, затем `keep()`.
// Хранилища, откат и строка таблицы — те же самые, второго пути записи нет.
//
// 🔒 ДВА ТЕЛА, ОДИН ПУТЬ (194-16): форма с файлом в части `file` — или JSON с `url`, и тогда файл скачивает сама
// память (`fetchUrl`, с защитой от петли и частной сети). Дальше оба тела идут одним `ingest()`.
//
// 🔒 СНАРУЖИ СЮДА НЕ ВОЙТИ: замок `benchGuard` — сессия архитектора или секрет машины. Внешний зовущий
// приходит в договор `/v1/keep_object` с ключом памяти, и `server.mjs` проводит тело сюда потоком по петле
// с секретом машины. Ключ памяти эту дверь не открывает — это проверяет прибор.
//
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

/** Отказы, в которых виновато присланное (400); остальное — состояние хранилищ, модели или чужого сервера (502). */
const SENDERS_FAULT = new Set([
  "bad-form",
  "bad-json",
  "bad-url",
  "describe-empty-file",
  "describe-kind-unsupported",
  "empty-file",
  "is-a-page",
  "no-about",
  "no-name",
  "no-url",
  "url-forbidden",
  "url-too-large",
])

const deny = (error: string, why?: string) =>
  NextResponse.json(
    { error, ok: false, ...(why ? { why } : {}) },
    { status: SENDERS_FAULT.has(error) ? 400 : 502 },
  )

type Fields = {
  anchors?: string[]
  author?: string
  full?: string
  name?: string
  source?: string
  summary?: string
  tags?: string[]
  title?: string
  who?: string
}

async function answer(bytes: Uint8Array, mime: string, fallbackName: string, f: Fields, url?: string) {
  const r = await ingest({
    anchors: f.anchors,
    // 🔒 АВТОР — СЛОВАМИ ЗОВУЩЕГО, А НЕ ИЗ ЗАМКА: здесь замок всегда секрет машины (проводник договора), и
    // «прибор» в происхождении был бы ложью. Не назван — ключ человека `who`.
    author: f.author ?? f.who,
    bytes,
    full: f.full,
    mime,
    name: f.name ?? fallbackName,
    source: f.source ?? "api",
    summary: f.summary,
    tags: f.tags,
    title: f.title,
    who: f.who,
  })
  if (!r.ok) {
    const ours = SENDERS_FAULT.has(r.error) || r.error.includes("no-anchor")
    return NextResponse.json(
      { error: r.error, messageId: r.messageId ?? null, ok: false, ...(r.why ? { why: r.why } : {}) },
      { status: ours ? 400 : 502 },
    )
  }
  return NextResponse.json({
    described: r.described,
    kind: r.kind,
    messageId: r.messageId,
    ms: r.ms,
    object: r.card,
    ok: true,
    summary: r.summary,
    title: r.title,
    ...(url ? { url } : {}),
  })
}

export async function POST(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  // ── JSON с адресом (194-16) ────────────────────────────────────────────────
  if ((request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return deny("bad-json")
    }
    const str = (k: string) => {
      const v = body[k]
      return typeof v === "string" && v.trim() ? v.trim() : undefined
    }
    const arr = (k: string) => (Array.isArray(body[k]) ? (body[k] as unknown[]).map(String) : undefined)
    const url = str("url")
    if (!url) return deny("no-url")
    const got = await fetchUrl(url)
    if (!got.ok) return deny(got.error, got.why)
    return answer(
      got.bytes,
      got.mime,
      got.name,
      {
        anchors: arr("anchors"),
        author: str("author"),
        full: str("full"),
        name: str("name"),
        source: str("source"),
        summary: str("summary"),
        tags: arr("tags"),
        title: str("title"),
        who: str("who"),
      },
      got.finalUrl,
    )
  }

  // ── форма с файлом (194-15) ────────────────────────────────────────────────
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return deny("bad-form")
  }

  const file = form.get("file")
  if (!(file instanceof Blob)) return deny("empty-file")

  const text = (k: string) => {
    const v = form.get(k)
    return typeof v === "string" && v.trim() ? v.trim() : undefined
  }
  /** Массив из JSON-строки формы. Не массив — `undefined`: «не передано» ≠ «пусто». */
  const list = (k: string): string[] | undefined => {
    const v = form.get(k)
    if (typeof v !== "string") return undefined
    try {
      const parsed: unknown = JSON.parse(v)
      return Array.isArray(parsed) ? parsed.map(String) : undefined
    } catch {
      return undefined
    }
  }

  return answer(new Uint8Array(await file.arrayBuffer()), file.type, (file as File).name ?? "", {
    anchors: list("anchors"),
    author: text("author"),
    full: text("full"),
    name: text("name"),
    source: text("source"),
    summary: text("summary"),
    tags: list("tags"),
    title: text("title"),
    who: text("who"),
  })
}

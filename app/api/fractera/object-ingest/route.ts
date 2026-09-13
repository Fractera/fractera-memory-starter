// @api приём объекта целиком: память сама описывает файл и кладёт его в четыре хранилища — вход `/v1/keep_object`
import { NextResponse } from "next/server"
import { ingest } from "@/lib/fractera/objects"
import { benchGuard } from "@/lib/bench-guard"

// ДВЕРЬ ПРИЁМА ОБЪЕКТА (194-15).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13: «Делай полный вариант: методы объектов в API».
//
// 🔒 ЧЕМ ОНА ОТЛИЧАЕТСЯ ОТ ДВЕРИ СТЕНДА `object-test`: там человек делает два хода — получает описание,
// правит его и только потом сохраняет. Внешний зовущий (API, Telegram) второго хода не делает, поэтому
// здесь оба хода — одна функция `ingest()`: описание моделью, если своё не прислано, затем `keep()`.
// Хранилища, откат и строка таблицы — те же самые, второго пути записи нет.
//
// 🔒 СНАРУЖИ СЮДА НЕ ВОЙТИ: замок `benchGuard` — сессия архитектора или секрет машины. Внешний зовущий
// приходит в договор `/v1/keep_object` с ключом памяти, и `server.mjs` проводит тело сюда потоком по петле
// с секретом машины. Ключ памяти эту дверь не открывает — это проверяет прибор.
//
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

/** Отказы, в которых виновато присланное (400); остальное — состояние хранилищ или модели (502). */
const SENDERS_FAULT = new Set([
  "bad-form",
  "describe-empty-file",
  "describe-kind-unsupported",
  "empty-file",
  "no-about",
  "no-name",
])

const deny = (error: string, status: number) => NextResponse.json({ error, ok: false }, { status })

export async function POST(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return deny("bad-form", 400)
  }

  const file = form.get("file")
  if (!(file instanceof Blob)) return deny("empty-file", 400)

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

  const r = await ingest({
    anchors: list("anchors"),
    // 🔒 АВТОР — СЛОВАМИ ЗОВУЩЕГО, А НЕ ИЗ ЗАМКА: здесь замок всегда секрет машины (проводник договора), и
    // «прибор» в происхождении был бы ложью. Не назван — ключ человека `who`.
    author: text("author") ?? text("who"),
    bytes: new Uint8Array(await file.arrayBuffer()),
    full: text("full"),
    mime: file.type,
    name: text("name") ?? (file as File).name ?? "",
    source: text("source") ?? "api",
    summary: text("summary"),
    tags: list("tags"),
    title: text("title"),
    who: text("who"),
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
  })
}

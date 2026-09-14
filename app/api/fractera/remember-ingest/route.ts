// @api приём «Сказать» с файлами: форма договора `/v1/remember` — фраза, параметры и вложения одним запросом
import { NextResponse } from "next/server"
import { METHODS } from "@/contract.mjs"
import { benchGuard } from "@/lib/bench-guard"
import { ingest } from "@/lib/fractera/objects"
import { rememberText } from "@/lib/answer-text.mjs"
import { remember } from "@/lib/verbs.mjs"
import { say } from "@/lib/words.mjs"

// ДВЕРЬ ПРИЁМА «СКАЗАТЬ» С ФАЙЛАМИ (200-5).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-14: у чёрного ящика два глагола, «всё остальное это включение в эти два типа»;
// вложения — «кнопку загрузить аудио кнопку загрузить видео кнопка загрузить и так далее».
//
// 🔒 ФОРМА ТЕЛА: часть `payload` — JSON-тело `remember` целиком (фраза, `who`, расширенные параметры, `links`,
// `youtube`, `media`), части `files` — сами файлы. Второго словаря полей нет: всё, что умеет JSON-ветка,
// едет в `payload` без перевода в поля формы.
//
// 🔒 ВТОРОГО ПУТИ ЗАПИСИ НЕТ. Файл ложится тем же `ingest()`, что у `object-ingest`; фраза, ссылки и адреса
// файлов — тем же `remember()`, что у JSON-ветки `server.mjs`. Дверь только разбирает форму.
//
// 🔒 ОБЯЗАТЕЛЬНОЕ ПРОВЕРЯЕТСЯ ДО ФАЙЛОВ И ТЕМ ЖЕ ОТКАЗОМ ДОГОВОРА: без `who` или `text` файлы не ложатся вовсе,
// а ответ — `missing-params`, как у JSON-ветки. Иначе форма и JSON отказывали бы разными словами.
//
// 🔒 СНАРУЖИ СЮДА НЕ ВОЙТИ: замок `benchGuard` — сессия архитектора или секрет машины. Внешний зовущий
// приходит в `/v1/remember` с ключом памяти, и `server.mjs` проводит форму сюда потоком по петле.
//
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

type Fate = {
  error?: string
  id?: string
  kind?: string
  messageId?: number
  name: string
  ok: boolean
  title?: string
  why?: string
}

// 🔒 ОТКАЗ НЕСЁТ `text` И `objects`, КАК ЛЮБОЙ ОТВЕТ «СКАЗАТЬ» (200-6): схема `output` договора требует их всегда.
const refuse = (status: number, body: Record<string, unknown>) =>
  NextResponse.json({ ok: false, ...body, objects: [], text: String(body.what_happened ?? "") }, { status })

export async function POST(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return refuse(400, { error: "bad-json", what_happened: say("bad-json") })
  }

  let payload: Record<string, unknown> = {}
  const raw = form.get("payload")
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object")
      payload = parsed as Record<string, unknown>
    } catch {
      return refuse(400, { error: "bad-json", what_happened: say("bad-json") })
    }
  }
  const lang = typeof payload.lang === "string" ? payload.lang : undefined

  const declared = METHODS.find((m) => m.name === "remember")
  const missing = (declared?.params ?? []).filter((p) => p.required && !payload[p.name]).map((p) => p.name)
  if (missing.length) {
    return refuse(400, {
      error: "missing-params",
      missing,
      what_happened: say("missing-params", lang, { names: missing.join(", ") }),
    })
  }

  const who = String(payload.who)
  const files = form.getAll("files").filter((f): f is File => f instanceof File)
  const fates: Fate[] = []
  for (const file of files) {
    const name = file.name || "file"
    const r = await ingest({
      author: who,
      bytes: new Uint8Array(await file.arrayBuffer()),
      mime: file.type,
      name,
      source: "api",
      who,
    })
    fates.push(
      r.ok
        ? { id: r.card?.id, kind: r.kind, messageId: r.messageId, name, ok: true, title: r.title }
        : { error: r.error, name, ok: false, ...(r.why ? { why: r.why } : {}) },
    )
  }

  const answer = (await remember(payload as never)) as Record<string, unknown>
  const objects = [...fates, ...(Array.isArray(answer.objects) ? answer.objects : [])]
  // 🔒 ФАЙЛЫ ЛЕГЛИ ДО `remember()` И В ЕГО ТЕКСТЕ ИХ НЕТ — текст пересобирается тем же помощником по всем объектам (200-6).
  const text = rememberText({
    noted: answer.noted as never,
    objects: objects as never,
    what_happened: answer.what_happened as string | undefined,
  })
  return NextResponse.json({ ...answer, objects, text })
}

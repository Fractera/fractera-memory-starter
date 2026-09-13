#!/usr/bin/env node
// ПРИБОР 194-15: ВНЕШНИЙ ЗОВУЩИЙ КЛАДЁТ ФАЙЛ ЧЕРЕЗ ДОГОВОР, И ОН ЛОЖИТСЯ В ЧЕТЫРЕ ХРАНИЛИЩА.
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13: «Делай полный вариант: методы объектов в API».
//
// 🔒 ПУТЬ ЧУЖОГО ИНСТРУМЕНТА, А НЕ СВОЕГО ПРОЦЕССА: публичный `https://memory.aifa.dev/v1/keep_object` и ключ
// памяти `x-memory-key`. Секрет машины прибор берёт только для того, чтобы читать хранилища МИМО кода
// памяти, прямо у слоя данных, — двери на слово не верим.
// 🔒 НЕГАТИВЫ: без ключа — 401; не multipart — 400; род, которого память не читает, — 400 и ни одной строки;
// ключ памяти не открывает внутреннюю дверь `object-ingest`.
// 🛑 ЦЕНА: один ход Claude по подписке (описание картинки, десятки секунд), одно встраивание, разбор графом.
// УБОРКА ПО МЕТКЕ `who = probe-194-15`, документ графа — после разбора (свежий движок не удаляет, находка 194-4).
//
// Запуск на сервере: node scripts/probe/v1-objects.mjs

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "https://memory.aifa.dev"
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const IMAGE_URL = process.env.IMAGE_URL ?? "https://www.fractera.ai/404.jpg"
const WHO = "probe-194-15"
const AUTHOR = "Прибор 194-15 (внешний API)"

function machineEnv(name) {
  try {
    for (const line of readFileSync("/etc/fractera/secrets.env", "utf8").split("\n")) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    }
  } catch { /* вне сервера — пусто */ }
  return ""
}
const KEY = process.env.DATA_SECRET || machineEnv("DATA_SECRET")
const H = { "Content-Type": "application/json", "X-Data-Secret": KEY }
const MEMORY_KEY = (() => {
  try {
    return readFileSync(process.env.MEMORY_API_KEY_FILE ?? "/etc/fractera/memory-api-key", "utf8").trim()
  } catch {
    return ""
  }
})()

const sql = async (text, params = []) =>
  (await fetch(`${DATA}/db/migrate`, { body: JSON.stringify({ params, sql: text }), headers: H, method: "POST" })).json()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const graphDocs = async () => {
  const d = await (await fetch(`${DATA}/service/rag/documents`, { headers: { "X-Data-Secret": KEY } })).json().catch(() => ({}))
  return Object.entries(d.statuses ?? {}).flatMap(([status, list]) => (list ?? []).map((x) => ({ ...x, status })))
}
const rowsOfProbe = async () =>
  (await sql("SELECT id, status, error, object_id, vector_id, rag_source FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows ?? []

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}
const keepObject = (form, headers = { "x-memory-key": MEMORY_KEY }) =>
  fetch(`${BASE}/v1/keep_object`, { body: form, headers, method: "POST" })

console.log("===PROBE_V1_OBJECTS===")
say(Boolean(MEMORY_KEY) && Boolean(KEY), `ключ памяти ${MEMORY_KEY ? "есть" : "НЕТ"}, секрет машины ${KEY ? "есть" : "НЕТ"}`)
await sql("DELETE FROM messages_that_came_into_memory WHERE who = ? AND object_id IS NULL", [WHO])

// ── договор объявляет метод ─────────────────────────────────────────────────
const c = await (await fetch(`${BASE}/v1/contract`, { headers: { "x-memory-key": MEMORY_KEY } })).json().catch(() => ({}))
const m = (c.methods ?? []).find((x) => x.name === "keep_object")
say(m?.body === "multipart" && (m?.params ?? []).some((p) => p.name === "file" && p.required), `договор ${c.version}: keep_object body=${m?.body}, file обязателен`)

// ── негатив 1: без ключа ────────────────────────────────────────────────────
const noKey = new FormData()
noKey.append("file", new Blob(["probe"], { type: "text/plain" }), "probe-194-15-nokey.txt")
const r1 = await keepObject(noKey, {})
say(r1.status === 401, `без ключа → ${r1.status}`)

// ── негатив 2: не multipart ─────────────────────────────────────────────────
const r2 = await fetch(`${BASE}/v1/keep_object`, {
  body: JSON.stringify({ name: "x.txt" }),
  headers: { "Content-Type": "application/json", "x-memory-key": MEMORY_KEY },
  method: "POST",
})
const j2 = await r2.json().catch(() => ({}))
say(r2.status === 400 && j2.error === "not-multipart", `JSON вместо формы → ${r2.status} ${j2.error}`)

// ── негатив 3: род, которого память не читает ───────────────────────────────
const exe = new FormData()
exe.append("file", new Blob([new Uint8Array([77, 90, 144, 0, 3, 0, 0, 0])], { type: "application/octet-stream" }), "probe-194-15.exe")
exe.append("who", WHO)
const r3 = await keepObject(exe)
const j3 = await r3.json().catch(() => ({}))
say(r3.status === 400 && j3.error === "describe-kind-unsupported", `.exe → ${r3.status} ${j3.error}`)
say((await rowsOfProbe()).length === 0, "после отказа по роду строк таблицы с меткой прибора — 0")

// ── негатив 4: ключ памяти не открывает внутреннюю дверь ────────────────────
const inner = new FormData()
inner.append("file", new Blob(["probe"], { type: "text/plain" }), "probe-194-15-inner.txt")
const r4 = await fetch(`${BASE}/api/fractera/object-ingest`, { body: inner, headers: { "x-memory-key": MEMORY_KEY }, method: "POST", redirect: "manual" })
say(r4.status !== 200 && (await rowsOfProbe()).length === 0, `ключ памяти во внутреннюю дверь → ${r4.status}, строк 0`)

// ── положительный: настоящая картинка ───────────────────────────────────────
const img = await fetch(IMAGE_URL)
const bytes = new Uint8Array(await img.arrayBuffer())
say(img.ok && bytes.length > 1000, `картинка ${IMAGE_URL}: ${img.status}, ${bytes.length} байт`)

const form = new FormData()
form.append("file", new Blob([bytes], { type: img.headers.get("content-type") ?? "image/jpeg" }), "probe-194-15-404.jpg")
form.append("source", "api")
form.append("author", AUTHOR)
form.append("who", WHO)
const t0 = Date.now()
const r5 = await keepObject(form)
const saved = await r5.json().catch((e) => ({ parse: String(e) }))
say(
  r5.status === 200 && saved.ok === true && saved.described === true && Boolean(saved.object?.id),
  `сохранено за ${Date.now() - t0} мс: ${r5.status} messageId ${saved.messageId} object ${saved.object?.id} kind ${saved.kind} described ${saved.described}${saved.ok ? "" : " " + JSON.stringify(saved).slice(0, 300)}`,
)
if (saved.ok) console.log(`  title: ${saved.title}\n  summary: ${String(saved.summary).slice(0, 220)}`)

const row = saved.messageId
  ? (await sql("SELECT id, status, source, author, who, kind, object_id, vector_id, rag_source, described_by FROM messages_that_came_into_memory WHERE id = ?", [saved.messageId])).rows?.[0]
  : null
console.log(`строка: ${JSON.stringify(row)}`)
say(row?.source === "api" && row?.author === AUTHOR && row?.kind === "image", `происхождение: source=${row?.source}, author=${row?.author}, kind=${row?.kind}`)

if (row) {
  const media = ((await (await fetch(`${DATA}/media`, { headers: { "X-Data-Secret": KEY } })).json()).items ?? []).find((x) => String(x.id) === String(row.object_id))
  say(Boolean(media) && String(media.description ?? "").length > 200, `1 объект: файл ${row.object_id}, размер ${media?.size ?? "?"}, полное описание ${String(media?.description ?? "").length} знаков`)
  say(Number(media?.size ?? -1) === bytes.length || media?.size === undefined, `1 объект: размер в складе = отправленному (${media?.size} / ${bytes.length})`)

  const vec = (await sql("SELECT id, ref_id, ref_table FROM vectors WHERE id = ?", [row.vector_id])).rows?.[0]
  say(vec?.ref_id === String(row.object_id) && vec?.ref_table === "media", `2 вектор: карточка ${row.vector_id} → media ${vec?.ref_id}`)

  let doc = null
  const tg = Date.now()
  for (let i = 0; i < 36; i++) {
    doc = (await graphDocs()).find((d) => String(d.file_path ?? "").startsWith(row.rag_source))
    if (doc && ["processed", "failed"].includes(doc.status)) break
    await sleep(5000)
  }
  say(doc?.status === "processed", `3 граф: документ ${doc?.id} по ${row.rag_source} → ${doc?.status ?? "не найден"} за ${Math.round((Date.now() - tg) / 1000)} с`)
}

// ── уборка по метке ─────────────────────────────────────────────────────────
const mine = (await sql("SELECT object_id, vector_id, rag_source FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows ?? []
const docIds = (await graphDocs()).filter((d) => mine.some((x) => x.rag_source && String(d.file_path ?? "").startsWith(x.rag_source))).map((d) => String(d.id))
if (docIds.length) {
  const del = await fetch(`${DATA}/service/rag/documents/delete_document`, { body: JSON.stringify({ delete_file: false, doc_ids: docIds }), headers: H, method: "DELETE" })
  console.log(`удаление документов графа: ${del.status}`)
}
for (const x of mine) {
  if (x.object_id) await fetch(`${DATA}/media/${x.object_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
  if (x.vector_id) await fetch(`${DATA}/vectors/${x.vector_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
}
await sql("DELETE FROM messages_that_came_into_memory WHERE who = ?", [WHO])
await sleep(20000)
const left = (await graphDocs()).filter((d) => docIds.includes(String(d.id))).length
say(left === 0 && (await rowsOfProbe()).length === 0, `уборка: строк убрано ${mine.length}, документов графа осталось ${left}`)

console.log(failed === 0 ? "✓ OK" : `✗ FAILED ${failed}`)
console.log("===PROBE_V1_OBJECTS_END===")
process.exit(failed === 0 ? 0 : 1)

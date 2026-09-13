#!/usr/bin/env node
// ПРИБОР 194-7: ЧЕТЫРЕ РОДА ЖИВЫХ ФАЙЛОВ ЧЕРЕЗ ДОГОВОР — КАРТИНКА, PDF, ВИДЕО, ЗВУК — И СОСТАВ БАЗЫ ДО = ПОСЛЕ.
//
// 🎯 ТЗ 194-7: «картинка, PDF, аудио и короткое видео… метка who = probe-194; уборка по метке со сверкой состава
// базы». Видео живьём до этого прибора не проверялось ни разу (запись 194-2).
//
// 🔒 ПУТЬ ЧУЖОГО ИНСТРУМЕНТА: публичный `https://memory.aifa.dev/v1/keep_object` с ключом памяти. Картинка, PDF и
// видео называются адресом витрины `www.fractera.ai` (память скачивает сама); звук вырезается `ffmpeg` из того же
// видео и уходит формой — так проверены оба тела договора.
// 🔒 СОСТАВ БАЗЫ СЧИТАЕТСЯ ДО И ПОСЛЕ ЧЕТЫРЬМЯ ЧИСЛАМИ: строки таблицы, файлы медиатеки, карточки векторов, документы
// графа. Уборка ждёт разбора КАЖДОГО документа графа (урок 194-16) и сверяет остаток с нулём.
// 🛑 ЦЕНА: 4 хода Claude по подписке + 2 расшифровки OpenAI (видео и звук). Прибор долгий — запускать в фоне.
//
// Запуск на сервере: node scripts/probe/object-describe.mjs

import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const BASE = process.env.MEMORY_URL ?? "https://memory.aifa.dev"
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const SITE = process.env.SITE_URL ?? "https://www.fractera.ai"
const WHO = "probe-194"
const AUTHOR = "Прибор 194-7 (четыре рода)"

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
const mediaItems = async () =>
  ((await (await fetch(`${DATA}/media`, { headers: { "X-Data-Secret": KEY } })).json().catch(() => ({}))).items ?? [])

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}

async function composition() {
  const rows = (await sql("SELECT COUNT(*) AS n FROM messages_that_came_into_memory")).rows?.[0]?.n ?? -1
  const vectors = (await sql("SELECT COUNT(*) AS n FROM vectors")).rows?.[0]?.n ?? -1
  return { graph: (await graphDocs()).length, media: (await mediaItems()).length, rows: Number(rows), vectors: Number(vectors) }
}

console.log("===PROBE_OBJECT_DESCRIBE===")
say(Boolean(MEMORY_KEY) && Boolean(KEY), `ключ памяти ${MEMORY_KEY ? "есть" : "НЕТ"}, секрет машины ${KEY ? "есть" : "НЕТ"}`)
say((await sql("SELECT COUNT(*) AS n FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows?.[0]?.n === 0, "до прогона строк с меткой прибора нет")
const before = await composition()
console.log(`состав до: ${JSON.stringify(before)}`)

// ── звук: вырезать дорожку из видео витрины ─────────────────────────────────
const VIDEO_URL = process.env.VIDEO_URL ?? `${SITE}/blog-media/boris-chernoy-post-1.mp4`
const dir = mkdtempSync(join(tmpdir(), "probe-194-7-"))
let audioBytes = null
try {
  const video = new Uint8Array(await (await fetch(VIDEO_URL)).arrayBuffer())
  writeFileSync(join(dir, "v.mp4"), video)
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", join(dir, "v.mp4"), "-vn", "-ac", "1", "-b:a", "96k", join(dir, "probe-194-7-voice.m4a")])
  audioBytes = readFileSync(join(dir, "probe-194-7-voice.m4a"))
  say(audioBytes.length > 1000, `звук вырезан из ${VIDEO_URL}: ${audioBytes.length} байт`)
} catch (e) {
  say(false, `звук не вырезан: ${String(e.message).slice(0, 160)}`)
}

const keepUrl = async (url) => {
  const r = await fetch(`${BASE}/v1/keep_object`, {
    body: JSON.stringify({ author: AUTHOR, source: "api", url, who: WHO }),
    headers: { "Content-Type": "application/json", "x-memory-key": MEMORY_KEY },
    method: "POST",
  })
  return { j: await r.json().catch(() => ({})), status: r.status }
}
const keepForm = async (bytes, name, type) => {
  const f = new FormData()
  f.append("file", new Blob([bytes], { type }), name)
  f.append("source", "api")
  f.append("author", AUTHOR)
  f.append("who", WHO)
  const r = await fetch(`${BASE}/v1/keep_object`, { body: f, headers: { "x-memory-key": MEMORY_KEY }, method: "POST" })
  return { j: await r.json().catch(() => ({})), status: r.status }
}

const cases = [
  { kind: "image", run: () => keepUrl(`${SITE}/404.jpg`), stamps: false },
  { kind: "pdf", run: () => keepUrl(`${SITE}/docs/ai-company-brain-en.pdf`), stamps: false },
  { kind: "video", run: () => keepUrl(VIDEO_URL), stamps: true },
  { kind: "audio", run: () => (audioBytes ? keepForm(audioBytes, "probe-194-7-voice.m4a", "audio/mp4") : Promise.resolve({ j: { error: "no-audio" }, status: 0 })), stamps: true },
]

for (const c of cases) {
  const t0 = Date.now()
  const { j, status } = await c.run()
  const ms = Date.now() - t0
  say(status === 200 && j.ok === true && j.described === true && j.kind === c.kind, `${c.kind}: ${status} за ${ms} мс, kind ${j.kind}, described ${j.described}, messageId ${j.messageId}${j.ok ? "" : " " + JSON.stringify(j).slice(0, 240)}`)
  if (!j.ok) continue
  console.log(`  title: ${j.title}`)
  const row = (await sql("SELECT status, source, author, object_id, vector_id, rag_source FROM messages_that_came_into_memory WHERE id = ?", [j.messageId])).rows?.[0]
  say(row?.status === "saved" && row?.object_id && row?.vector_id && row?.rag_source && row?.source === "api" && row?.author === AUTHOR, `${c.kind}: строка saved, три ссылки, source api, автор записан`)
  const media = (await mediaItems()).find((m) => String(m.id) === String(row?.object_id))
  const full = String(media?.description ?? "")
  say(full.length >= 80, `${c.kind}: полное описание рядом с файлом, ${full.length} знаков`)
  if (c.stamps) {
    const n = (full.match(/\[\d{2}:\d{2}[–-]\d{2}:\d{2}\]/g) ?? []).length
    say(n > 0, `${c.kind}: метки времени [мм:сс–мм:сс] в полном описании: ${n}`)
  }
}

// ── уборка по метке, с ожиданием разбора каждого документа ──────────────────
const mine = (await sql("SELECT object_id, vector_id, rag_source FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows ?? []
const ofMine = (list) => list.filter((d) => mine.some((x) => x.rag_source && String(d.file_path ?? "").startsWith(x.rag_source)))
const tw = Date.now()
for (let i = 0; i < 72; i++) {
  const pending = ofMine(await graphDocs()).filter((d) => !["processed", "failed"].includes(d.status))
  if (!pending.length) break
  await sleep(5000)
}
const docs = ofMine(await graphDocs())
say(docs.length === mine.length && docs.every((d) => d.status === "processed"), `граф: документов прибора ${docs.length} из ${mine.length}, все processed за ${Math.round((Date.now() - tw) / 1000)} с`)
const docIds = docs.map((d) => String(d.id))
for (let attempt = 0; attempt < 3 && docIds.length; attempt++) {
  const left = (await graphDocs()).filter((d) => docIds.includes(String(d.id))).map((d) => String(d.id))
  if (!left.length) break
  const del = await fetch(`${DATA}/service/rag/documents/delete_document`, { body: JSON.stringify({ delete_file: false, doc_ids: left }), headers: H, method: "DELETE" })
  console.log(`удаление документов графа (${left.length}), попытка ${attempt + 1}: ${del.status}`)
  await sleep(15000)
}
for (const x of mine) {
  if (x.object_id) await fetch(`${DATA}/media/${x.object_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
  if (x.vector_id) await fetch(`${DATA}/vectors/${x.vector_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
}
await sql("DELETE FROM messages_that_came_into_memory WHERE who = ?", [WHO])
rmSync(dir, { force: true, recursive: true })

const after = await composition()
console.log(`состав после: ${JSON.stringify(after)}`)
say(JSON.stringify(after) === JSON.stringify(before), "состав базы после = до (строки, файлы, карточки, документы графа)")

console.log(failed === 0 ? "✓ OK" : `✗ FAILED ${failed}`)
console.log("===PROBE_OBJECT_DESCRIBE_END===")
process.exit(failed === 0 ? 0 : 1)

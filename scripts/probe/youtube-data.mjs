#!/usr/bin/env node
// ПРИБОР 195-4: РОЛИК YOUTUBE ЧИТАЕТСЯ ОФИЦИАЛЬНЫМ API, ГЛАВЫ РАЗБИРАЮТСЯ, ОТКАЗЫ НАЗЫВАЮТСЯ ПОИМЁННО.
//
// 🎯 СЛОВА ВЛАДЕЛЬЦА 2026-09-14: «делай 195-4 с главами»; «найди описание в каких случаях придёт отказ и стандартизируй этот отказ в нашем API
// от памяти»; «посмотри можешь ли ты получать Snippet от видео чтобы сохранить его как связанно изображение».
//
// 🔒 РАЗБОР ГЛАВ ПРОВЕРЯЕТСЯ ТЕМ ЖЕ КОДОМ, ЧТО РАБОТАЕТ В СЛУЖБЕ (`lib/youtube-chapters.mjs`), А НЕ КОПИЕЙ: копия доказывала бы себя.
// 🔒 ПРИБОР РАБОТАЕТ ДО И ПОСЛЕ ПОЯВЛЕНИЯ КЛЮЧА и печатает, какую ветку прогнал: без ключа обязан быть назван отказ, с ключом — пройден
// весь путь до четырёх хранилищ и связанной обложки.
// 🛑 ЗНАЧЕНИЕ КЛЮЧА НЕ ЧИТАЕТСЯ И НЕ ПЕЧАТАЕТСЯ: прибор видит только «задан или нет» — по ответу двери.
// 🛑 УБОРКА ПО МЕТКЕ `probe-195-4`.
//
// Запуск на сервере: node scripts/probe/youtube-data.mjs

import { readFileSync } from "node:fs"
import { chapterAt, parseChapters, secondsOfUrl, youtubeId } from "/opt/fractera/memory/lib/youtube-chapters.mjs"

const BASE = process.env.MEMORY_URL ?? "https://memory.aifa.dev"
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const WHO = "probe-195-4"
const VIDEO = "https://www.youtube.com/watch?v=BYXbuik3dgA&t=4119s"

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
const G = { "x-data-secret": KEY }
const sql = async (text, params = []) =>
  (await fetch(`${DATA}/db/migrate`, { body: JSON.stringify({ params, sql: text }), headers: H, method: "POST" })).json()

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}

console.log("===PROBE_YOUTUBE_DATA===")

// ── A1: разбор глав на НАСТОЯЩЕМ описании ролика владельца (текст публичный) ──
const DESCRIPTION = [
  "Elon Musk on orbital data centers, Grok, Optimus and TeraFab.",
  "",
  "0:00:00 Orbital data centers",
  "0:36:46 Grok and alignment",
  "0:59:56 xAI’s business plan",
  "1:17:21 Optimus and humanoid manufacturing",
  "1:30:22 Does China win by default?",
  "1:44:16 Lessons from running SpaceX",
  "2:20:08 DOGE",
  "2:38:28 TeraFab",
  "",
  "Sponsors and links below.",
].join("\n")
const chapters = parseChapters(DESCRIPTION)
say(chapters.length === 8, `A1: глав разобрано ${chapters.length} из 8`)
const at = chapterAt(4119, chapters)
say(at?.title === "xAI’s business plan", `A1: 4119 с попадает в «${at?.title ?? "—"}» (начало ${at?.stamp ?? "—"})`)
say(chapters[0]?.seconds === 0 && chapters.at(-1)?.seconds === 9508, `A1: границы 0 с … ${chapters.at(-1)?.seconds} с`)

// ── A2: негативы разбора — одинокая метка оглавлением не считается ───────────
say(parseChapters("смотрите с 12:30, там главное").length === 0, "A2: метка посреди фразы главой не становится")
say(parseChapters("12:30 один пункт").length === 0, "A2: одна метка — не оглавление")
say(youtubeId("https://youtu.be/BYXbuik3dgA") === "BYXbuik3dgA" && youtubeId("https://example.com/watch?v=BYXbuik3dgA") === null,
  "A2: адрес ролика узнаётся, чужой адрес — нет")
say(secondsOfUrl(VIDEO) === 4119 && secondsOfUrl("https://youtu.be/BYXbuik3dgA?t=1h8m39s") === 4119,
  "A2: секунда из адреса читается в обоих видах (t=4119s и t=1h8m39s)")

// ── B: дверь описания на ролике ─────────────────────────────────────────────
const d = await fetch(`${BASE}/api/fractera/link-test/describe`, { body: JSON.stringify({ url: VIDEO }), headers: H, method: "POST" })
const dj = await d.json().catch(() => ({}))
const keyMissing = dj.error === "youtube-key-missing"
console.log(`B: дверь ответила ${d.status} ${dj.error ?? "ok"} ${dj.why ? `(${String(dj.why).slice(0, 120)})` : ""}`)

if (keyMissing) {
  say(d.status === 400, "B: ключа нет — назван отказ youtube-key-missing, а не молчание (ветка «до ключа»)")
  const bad = await fetch(`${BASE}/api/fractera/link-test/describe`, { body: JSON.stringify({ url: "https://www.youtube.com/watch?v=00000000000" }), headers: H, method: "POST" })
  const bj = await bad.json().catch(() => ({}))
  say(bj.error === "youtube-key-missing", `B: без ключа даже несуществующий ролик отказывает ключом, а не сетью (${bj.error})`)
  console.log("🛑 Ветка «с ключом» не прогнана: ключ в складе секретов машины не задан — вставляет владелец в карточке «Настройки».")
} else {
  // ── ветка «с ключом»: весь путь до четырёх хранилищ и связанной обложки ────
  say(d.status === 200 && dj.ok === true && dj.source === "youtube-api", `B: ролик прочитан официальным API (source=${dj.source})`)
  say(Array.isArray(dj.chapters) && dj.chapters.length === 8, `B: двери вернули ${dj.chapters?.length ?? 0} глав`)
  say(dj.chapterOfAsked?.title === "xAI’s business plan", `B: глава для 4119 с — «${dj.chapterOfAsked?.title ?? "—"}»`)
  say(Boolean(dj.thumbnail?.url), `B: обложка названа API: ${dj.thumbnail?.width}×${dj.thumbnail?.height}`)
  say(dj.url === "https://www.youtube.com/watch?v=BYXbuik3dgA", `B: адрес сохранён каноническим: ${dj.url}`)

  const form = new FormData()
  form.append("file", new Blob([dj.snapshot], { type: "text/markdown" }), dj.name)
  form.append("url", dj.url)
  form.append("about", dj.summary)
  form.append("full", dj.full)
  form.append("title", dj.title)
  form.append("tags", JSON.stringify(dj.tags ?? []))
  form.append("anchors", JSON.stringify(dj.anchors ?? []))
  form.append("described_by", dj.described_by ?? "")
  form.append("language", dj.language ?? "und")
  form.append("who", WHO)
  if (dj.thumbnail?.url) form.append("thumbnail", dj.thumbnail.url)
  const s = await fetch(`${BASE}/api/fractera/link-ingest`, { body: form, headers: G, method: "POST" })
  const sj = await s.json().catch(() => ({}))
  say(s.status === 200 && sj.ok === true, `B: сохранено, messageId ${sj.messageId}, обложка ${JSON.stringify(sj.thumbnail)}`)

  const row = sj.messageId
    ? (await sql("SELECT id, kind, url, status, object_id FROM messages_that_came_into_memory WHERE id = ?", [sj.messageId])).rows?.[0]
    : null
  say(row?.kind === "web" && row?.url === dj.url && row?.status === "saved", `B: строка ролика kind=${row?.kind} url=${row?.url}`)
  const thumbRow = sj.thumbnail?.messageId
    ? (await sql("SELECT id, kind, url, object_id FROM messages_that_came_into_memory WHERE id = ?", [sj.thumbnail.messageId])).rows?.[0]
    : null
  say(thumbRow?.kind === "image" && Boolean(thumbRow?.object_id), `B: обложка легла объектом kind=${thumbRow?.kind} id=${thumbRow?.id}`)
  const link = sj.thumbnail?.messageId
    ? (await sql("SELECT id FROM messages_that_came_into_memory__links WHERE message_id = ? AND previous_message_id = ?", [sj.thumbnail.messageId, sj.messageId])).rows?.[0]
    : null
  say(Boolean(link?.id), `B: связь обложки с роликом записана (строка связей ${link?.id ?? "нет"})`)

  // Уборка по метке
  const mine = (await sql("SELECT object_id, vector_id, rag_source FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows ?? []
  for (const m of mine) {
    if (m.object_id) await fetch(`${DATA}/media/${m.object_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
    if (m.vector_id) await fetch(`${DATA}/vectors/${m.vector_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
  }
  await sql("DELETE FROM messages_that_came_into_memory WHERE who = ?", [WHO])
  const left = (await sql("SELECT COUNT(*) AS n FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows?.[0]?.n
  say(Number(left) === 0, `уборка: своих строк было ${mine.length}, осталось ${left}`)
}

console.log(failed ? `✗ ПРОВАЛ: ${failed}` : "✓ OK")
console.log("===PROBE_YOUTUBE_DATA_DONE===")
process.exit(failed ? 1 : 0)

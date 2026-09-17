#!/usr/bin/env node
// ПРИБОР 194-8: ПРОСМОТР ПОЛУЧАЕТ PDF, MARKDOWN И HTML С ИХ НАСТОЯЩИМИ ТИПАМИ.
//
// 🔒 МОДЕЛЬ НЕ ЗОВЁТСЯ: описание приносит прибор, якорей нет — граф не трогается.
// 🔒 ПРОВЕРКА ТОЙ ЖЕ ДВЕРЬЮ, ЧТО У ПРОСМОТРА: `GET object-file?id=` — тип и байты.
// 🔒 HTML СОДЕРЖИТ `<script>`: песочницу проверяет сборка (`allow-scripts` без `allow-same-origin`),
// а здесь — что файл доезжает как `text/html`, а не как скачиваемый двоичный.
// 🛑 УБОРКА ПО МЕТКЕ `who = probe-194`.
//
// Запуск на сервере: node scripts/probe/object-preview-kinds.mjs

import { readFileSync, readdirSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const WHO = "probe-194"

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
const sql = async (text, params = []) =>
  (await fetch(`${DATA}/db/migrate`, { body: JSON.stringify({ params, sql: text }), headers: H, method: "POST" })).json()

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}

const docs = "/tmp/obj-corpus/docs"
const pdf = readdirSync(docs).find((n) => n.endsWith(".pdf"))
const md = readdirSync(docs).find((n) => n.endsWith(".md"))
const html = `<!doctype html><html><head><title>Проба 194-8</title></head><body><h1>Проба просмотра HTML</h1><script>document.body.append(" · скрипт выполнен")</script></body></html>`

const CASES = [
  { bytes: pdf ? readFileSync(`${docs}/${pdf}`) : null, mime: "application/pdf", name: pdf ?? "нет.pdf", want: "application/pdf" },
  { bytes: md ? readFileSync(`${docs}/${md}`) : null, mime: "text/markdown", name: md ?? "нет.md", want: "text/markdown" },
  { bytes: Buffer.from(html, "utf8"), mime: "text/html", name: "probe-194-8.html", want: "text/html" },
]

console.log("===PROBE_PREVIEW===")
for (const c of CASES) {
  if (!c.bytes) {
    say(false, `${c.name}: нет файла в корпусе`)
    continue
  }
  const form = new FormData()
  form.append("file", new Blob([c.bytes], { type: c.mime }), c.name)
  form.append("about", `Проба 194-8: просмотр ${c.want}, файл ${c.name}, достаточно слов для карточки поиска.`)
  form.append("who", WHO)
  const saved = await (await fetch(`${BASE}/api/fractera/object-test`, { body: form, headers: { "x-data-secret": KEY }, method: "POST" })).json()
  if (!saved.ok) {
    say(false, `${c.name}: сохранение отказало ${JSON.stringify(saved)}`)
    continue
  }
  const view = await (await fetch(`${BASE}/api/fractera/object-test?message=${saved.messageId}`, { headers: { "x-data-secret": KEY } })).json()
  const m = view.media ?? {}
  say(Boolean(view.media), `${c.name}: просмотру отдана строка медиатеки — mime ${m.mime_type}, .${m.extension}, ${m.size} байт`)
  const res = await fetch(`${BASE}/api/fractera/object-file?id=${m.id}`, { headers: { "x-data-secret": KEY } })
  const type = String(res.headers.get("content-type") ?? "")
  const got = Buffer.from(await res.arrayBuffer())
  say(res.status === 200 && type.startsWith(c.want), `${c.name}: дверь файла ${res.status} ${type} (ждём ${c.want})`)
  say(got.equals(c.bytes), `${c.name}: байты совпадают (${got.length} = ${c.bytes.length})`)
  say(String(res.headers.get("content-disposition") ?? "").startsWith("inline"), `${c.name}: отдаётся inline, а не на скачивание`)
}

// Уборка по метке.
const mine = (await sql("SELECT object_id, vector_id FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows ?? []
for (const r of mine) {
  if (r.object_id) await fetch(`${DATA}/media/${r.object_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
  if (r.vector_id) await fetch(`${DATA}/vectors/${r.vector_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
}
await sql("DELETE FROM messages_that_came_into_memory WHERE who = ?", [WHO])
say(((await sql("SELECT COUNT(*) AS n FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows?.[0]?.n ?? -1) === 0, `убрано своего: ${mine.length}`)

console.log(failed ? `\n✗ ПРОВАЛ: ${failed}` : "\n✓ OK")
console.log("===PROBE_PREVIEW_END===")

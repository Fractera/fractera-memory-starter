#!/usr/bin/env node
// ПРИБОР 194-10: КОД ПРОХОДИТ ВЕСЬ ПУТЬ — ОПИСАНИЕ, СОХРАНЕНИЕ, ФАЙЛ ДЛЯ ПРОСМОТРА.
//
// 🔒 ФАЙЛЫ НАСТОЯЩИЕ, ИЗ САМОЙ СЛУЖБЫ ПАМЯТИ: `.ts` отправляется с `video/mp2t` — так его шлёт браузер на
// Windows, — `.tsx` без `mime` вовсе. Это ровно те два пути, на которых код не проходил.
// 🔒 НЕГАТИВ БЕЗ МОДЕЛИ: настоящее видео по-прежнему видео, а PDF — PDF (проверка расширения кода не
// перехватывает чужие роды); таблица знает все девять родов.
// 🛑 ЦЕНА: 2 хода Claude по подписке. УБОРКА ПО МЕТКЕ `who = probe-194`.
//
// Запуск на сервере: node scripts/probe/object-code.mjs

import { readFileSync } from "node:fs"
import { kindOf, messageKindOf } from "../../lib/describe.mjs"

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

console.log("===PROBE_CODE===")

// ── негатив без модели: чужие роды не перехвачены ───────────────────────────
say(kindOf("clip.mp4", "video/mp4") === "video", `kindOf(clip.mp4) = ${kindOf("clip.mp4", "video/mp4")}`)
say(kindOf("brochure.pdf", "application/pdf") === "pdf", `kindOf(brochure.pdf) = ${kindOf("brochure.pdf", "application/pdf")}`)
say(kindOf("readme.md", "") === "text" && messageKindOf("text", "readme.md") === "markdown", "readme.md → text → строка markdown")
say(messageKindOf("text", "page.html") === "html", "page.html → строка html")
say(kindOf("route.ts", "video/mp2t") === "code", `kindOf(route.ts, video/mp2t) = ${kindOf("route.ts", "video/mp2t")}`)

const CASES = [
  { mime: "video/mp2t", path: "lib/fractera/data-service.ts" },
  { mime: "", path: "_tools/code-view/client/code-view.client.tsx" },
]

for (const c of CASES) {
  const bytes = readFileSync(c.path)
  const name = c.path.split("/").pop()
  const text = bytes.toString("utf8")

  const form = new FormData()
  form.append("file", new Blob([bytes], c.mime ? { type: c.mime } : {}), name)
  const t0 = Date.now()
  const dRes = await fetch(`${BASE}/api/fractera/object-test/describe`, { body: form, headers: { "x-data-secret": KEY }, method: "POST" })
  const d = await dRes.json().catch(() => ({}))
  console.log(`\n--- ${name} (${bytes.length} байт, mime «${c.mime}») → описание ${dRes.status} за ${Date.now() - t0} мс`)
  if (!d.ok) {
    say(false, `${name}: отказ описания ${JSON.stringify(d).slice(0, 200)}`)
    continue
  }
  console.log(`  название: ${d.title}`)
  console.log(`  саммари (${d.summary.split(/\s+/).length} слов): ${d.summary}`)
  const firstLine = text.split("\n").find((l) => l.trim().length > 20) ?? ""
  say(d.kind === "code", `${name}: род ${d.kind}`)
  say(d.full.includes(firstLine.trim()), `${name}: исходник дословно в полном описании (строка «${firstLine.trim().slice(0, 50)}»)`)

  const save = new FormData()
  save.append("file", new Blob([bytes], c.mime ? { type: c.mime } : {}), name)
  save.append("about", d.summary)
  save.append("full", d.full)
  save.append("title", d.title)
  save.append("tags", JSON.stringify(d.tags))
  save.append("who", WHO)
  const s = await (await fetch(`${BASE}/api/fractera/object-test`, { body: save, headers: { "x-data-secret": KEY }, method: "POST" })).json()
  say(s.ok === true, `${name}: сохранено, messageId ${s.messageId} ${s.ok ? "" : JSON.stringify(s)}`)
  if (!s.ok) continue

  const view = await (await fetch(`${BASE}/api/fractera/object-test?message=${s.messageId}`, { headers: { "x-data-secret": KEY } })).json()
  say(view.row?.kind === "code", `${name}: строка таблицы kind=${view.row?.kind}, mime=${view.row?.mime}`)
  const f = await fetch(`${BASE}/api/fractera/object-file?id=${view.media?.id}`, { headers: { "x-data-secret": KEY } })
  const got = Buffer.from(await f.arrayBuffer())
  say(String(f.headers.get("content-type")).startsWith("text/plain"), `${name}: дверь файла ${f.status} ${f.headers.get("content-type")}`)
  say(got.equals(bytes), `${name}: байты совпадают (${got.length} = ${bytes.length})`)
}

const shape = String((await sql("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'messages_that_came_into_memory'")).rows?.[0]?.sql ?? "")
say(["markdown", "html", "code"].every((k) => shape.includes(`'${k}'`)), "форма таблицы знает роды markdown, html, code")

// Уборка по метке.
const mine = (await sql("SELECT object_id, vector_id FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows ?? []
for (const r of mine) {
  if (r.object_id) await fetch(`${DATA}/media/${r.object_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
  if (r.vector_id) await fetch(`${DATA}/vectors/${r.vector_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
}
await sql("DELETE FROM messages_that_came_into_memory WHERE who = ?", [WHO])
say(((await sql("SELECT COUNT(*) AS n FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows?.[0]?.n ?? -1) === 0, `убрано своего: ${mine.length}`)

console.log(failed ? `\n✗ ПРОВАЛ: ${failed}` : "\n✓ OK")
console.log("===PROBE_CODE_END===")

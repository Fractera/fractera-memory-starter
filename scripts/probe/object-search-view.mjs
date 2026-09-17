#!/usr/bin/env node
// ПРИБОР 194-9: НАЙДЕННОЕ ПОИСКОМ ОТКРЫВАЕТСЯ ТЕМ ЖЕ, ЧТО ПОСЛЕ ЗАГРУЗКИ.
//
// 🔒 МОДЕЛЬ ОПИСАНИЯ НЕ ЗОВЁТСЯ: описание приносит прибор. Цена — встраивание карточки и вопроса.
// 🔒 ПУТЬ ВЛАДЕЛЬЦА: публичный `https://memory.aifa.dev`, двери `object-search` и `object-test?object=`.
// 🔒 ГЛАВНОЕ УТВЕРЖДЕНИЕ: `?object=<найденный id>` отдаёт ту же строку, что `?message=<номер сохранения>`.
// 🔒 НЕГАТИВ: объект демо-корпуса 192, у которого строки нет, получает `row: null` и файл — не отказ;
// чужой файл медиатеки — `404 not-ours`.
// 🛑 УБОРКА ПО МЕТКЕ `who = probe-194`.
//
// Запуск на сервере: node scripts/probe/object-search-view.mjs

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "https://memory.aifa.dev"
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
const G = { "x-data-secret": KEY }
const sql = async (text, params = []) =>
  (await fetch(`${DATA}/db/migrate`, { body: JSON.stringify({ params, sql: text }), headers: H, method: "POST" })).json()

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}

console.log("===PROBE_SEARCH_VIEW===")
const MARK = "Кормушка для синиц из пластиковой бутылки"
const bytes = Buffer.from(`# ${MARK}\n\nИнструкция: вырезать окно в бутылке, продеть деревянную ложку, повесить на ветку.\n`, "utf8")
const form = new FormData()
form.append("file", new Blob([bytes], { type: "text/markdown" }), "probe-194-9-feeder.md")
form.append("about", `${MARK}: как сделать её из бутылки и деревянной ложки и повесить на дерево.`)
form.append("full", `Документ Markdown «${MARK}». Заголовок и одна инструкция из трёх действий. Проба прибора 194-9.`)
form.append("title", MARK)
form.append("who", WHO)
const saved = await (await fetch(`${BASE}/api/fractera/object-test`, { body: form, headers: G, method: "POST" })).json()
say(saved.ok === true, `сохранено: messageId ${saved.messageId}, объект ${saved.object?.id}`)

const sRes = await fetch(`${BASE}/api/fractera/object-search`, {
  body: JSON.stringify({ question: "как сделать кормушку для птиц из бутылки" }),
  headers: { ...G, "Content-Type": "application/json" },
  method: "POST",
})
const found = await sRes.json().catch(() => ({}))
const hit = (found.near ?? []).find((h) => h.id === saved.object?.id)
say(Boolean(hit), `поиск нашёл сохранённый объект: ${hit ? `score ${hit.score.toFixed(3)}` : `нет; первые: ${(found.near ?? []).slice(0, 3).map((h) => h.name).join(", ")}`}`)

if (hit) {
  const byObject = await (await fetch(`${BASE}/api/fractera/object-test?object=${hit.id}`, { headers: G })).json()
  const byMessage = await (await fetch(`${BASE}/api/fractera/object-test?message=${saved.messageId}`, { headers: G })).json()
  say(byObject.ok === true && byObject.row?.id === saved.messageId, `?object= отдаёт строку ${byObject.row?.id} (ждём ${saved.messageId})`)
  say(JSON.stringify(byObject.row) === JSON.stringify(byMessage.row), "строка через объект = строка через номер, поле в поле")
  say(byObject.media?.mime_type === "text/markdown" && byObject.object?.about?.startsWith("Документ Markdown"), `просмотру отданы файл (${byObject.media?.mime_type}) и полное описание`)
}

// Негатив 1: объект без строки.
const own = ((await sql("SELECT ref_id FROM vectors WHERE collection = 'memory-objects' AND ref_table = 'media'")).rows ?? []).map((r) => String(r.ref_id))
const withRows = new Set(((await sql("SELECT object_id FROM messages_that_came_into_memory WHERE object_id IS NOT NULL")).rows ?? []).map((r) => String(r.object_id)))
const bare = own.find((id) => !withRows.has(id))
if (bare) {
  const v = await (await fetch(`${BASE}/api/fractera/object-test?object=${bare}`, { headers: G })).json()
  say(v.ok === true && v.row === null && Boolean(v.media?.id), `негатив: объект без строки ${v.media?.name} → ok, row=null, файл есть`)
} else {
  say(false, "негатив недостижим: у всех объектов памяти есть строка")
}

// Негатив 2: чужой файл медиатеки.
const foreign = ((await (await fetch(`${DATA}/media`, { headers: { "X-Data-Secret": KEY } })).json()).items ?? []).find((m) => !own.includes(String(m.id)))
if (foreign) {
  const r = await fetch(`${BASE}/api/fractera/object-test?object=${foreign.id}`, { headers: G })
  say(r.status === 404, `негатив: чужой файл ${foreign.name} → ${r.status}`)
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
console.log("===PROBE_SEARCH_VIEW_END===")

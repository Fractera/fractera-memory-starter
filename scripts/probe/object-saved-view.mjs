#!/usr/bin/env node
// ПРИБОР 194-5: ЭКРАН ПОКАЗЫВАЕТ ЛЕГШЕЕ — СТРОКУ ПО НОМЕРУ И САМ ФАЙЛ.
//
// 🔒 МОДЕЛЬ НЕ ЗОВЁТСЯ: описание приносит прибор. Без якорей — граф не трогается, уборка проще.
// 🔒 ПРОВЕРКА ТЕМИ ЖЕ ДВЕРЯМИ, ЧТО У ЭКРАНА: `GET object-test?message=` и `GET object-file?id=`.
// 🔒 НЕГАТИВ: файл медиатеки без карточки памяти (чужой) через дверь файла не отдаётся — `404 not-ours`.
// 🛑 УБОРКА ПО МЕТКЕ `who = probe-194`: свой медиа id, своя карточка, свои строки.
//
// Запуск на сервере: node scripts/probe/object-saved-view.mjs

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const WHO = "probe-194"
const FILE = "/tmp/obj-corpus/mac_mini.png"

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

console.log("===PROBE_VIEW===")
const bytes = readFileSync(FILE)
const form = new FormData()
form.append("file", new Blob([bytes], { type: "image/png" }), "mac_mini.png")
form.append("about", "Проба 194-5: Mac mini спереди на белом фоне, серебристый корпус, порты USB-C.")
form.append("full", "Проба 194-5. Полное описание: Mac mini M4 спереди, белый фон, серебристый алюминий, два USB-C, разъём 3,5 мм.")
form.append("title", "Проба экрана 194-5")
form.append("who", WHO)
const saved = await (await fetch(`${BASE}/api/fractera/object-test`, { body: form, headers: { "x-data-secret": KEY }, method: "POST" })).json()
say(saved.ok === true && Number(saved.messageId) > 0, `сохранено: messageId ${saved.messageId}`)

const vRes = await fetch(`${BASE}/api/fractera/object-test?message=${saved.messageId}`, { headers: { "x-data-secret": KEY } })
const view = await vRes.json().catch(() => ({}))
const cols = Object.keys(view.row ?? {})
const form194 = ((await sql("SELECT name FROM pragma_table_info('messages_that_came_into_memory')")).rows ?? []).map((r) => r.name)
say(vRes.status === 200 && view.ok === true, `чтение по номеру: ${vRes.status}`)
say(cols.length === form194.length && form194.every((c) => cols.includes(c)), `колонки строки совпадают с формой таблицы (${cols.length} из ${form194.length})`)
say(view.object?.about?.startsWith("Проба 194-5. Полное описание"), "полное описание прочитано из медиатеки, а не из формы")

const fRes = await fetch(`${BASE}/api/fractera/object-file?id=${view.row?.object_id}`, { headers: { "x-data-secret": KEY } })
const got = Buffer.from(await fRes.arrayBuffer())
say(fRes.status === 200 && fRes.headers.get("content-type") === "image/png", `файл: ${fRes.status} ${fRes.headers.get("content-type")}`)
say(got.length === bytes.length && got.equals(bytes), `байты совпадают с исходником (${got.length} = ${bytes.length})`)

// Негатив: файл медиатеки без карточки памяти.
const own = new Set(((await sql("SELECT ref_id FROM vectors WHERE collection = 'memory-objects' AND ref_table = 'media'")).rows ?? []).map((r) => String(r.ref_id)))
const foreign = ((await (await fetch(`${DATA}/media`, { headers: { "X-Data-Secret": KEY } })).json()).items ?? []).find((m) => !own.has(String(m.id)))
if (foreign) {
  const nRes = await fetch(`${BASE}/api/fractera/object-file?id=${foreign.id}`, { headers: { "x-data-secret": KEY } })
  const nBody = await nRes.json().catch(() => ({}))
  say(nRes.status === 404 && nBody.error === "not-ours", `негатив, чужой файл ${foreign.name}: ${nRes.status} ${JSON.stringify(nBody)}`)
} else {
  say(false, "негатив недостижим: чужих файлов в медиатеке нет")
}
const missing = await fetch(`${BASE}/api/fractera/object-test?message=999999999`, { headers: { "x-data-secret": KEY } })
say(missing.status === 404, `негатив, несуществующий номер: ${missing.status}`)

// Уборка по метке.
const mine = (await sql("SELECT object_id, vector_id FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows ?? []
for (const m of mine) {
  if (m.object_id) await fetch(`${DATA}/media/${m.object_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
  if (m.vector_id) await fetch(`${DATA}/vectors/${m.vector_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
}
await sql("DELETE FROM messages_that_came_into_memory WHERE who = ?", [WHO])
say(((await sql("SELECT COUNT(*) AS n FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows?.[0]?.n ?? -1) === 0, `убрано своего: ${mine.length}`)

console.log(failed ? `\n✗ ПРОВАЛ: ${failed}` : "\n✓ OK")
console.log("===PROBE_VIEW_END===")

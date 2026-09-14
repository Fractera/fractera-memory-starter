#!/usr/bin/env node
// ПРИБОР 195-9: СТРАНИЦА, КОТОРУЮ САЙТ НЕ ОТДАЛ (КОД ≥ 400), НЕ ОПИСЫВАЕТСЯ И НЕ СОХРАНЯЕТСЯ.
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-14: «да, делай защиту от 403». Найдено на его экране: neon.com → «Vercel Security Checkpoint», 403.
// 🔒 ЭТАЛОН НЕЙТРАЛЬНЫЙ И ПОСТОЯННЫЙ — `https://httpbin.org/status/403` всегда отдаёт 403 (закон 196: боевые сайты владельца не трогаем).
// 🔒 МОДЕЛЬ НЕ ЗОВЁТСЯ: отказ стоит до хода модели; негатив «ворота не режут хорошее» идёт в дверь сохранения со снимком кода 200 и
// пустыми якорями — доходит до хранилищ и откатывается на графе (`graph-refused`), строка `failed` убирается по метке прибора.
//
// Запуск на сервере: node scripts/probe/link-page-refused.mjs

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "https://memory.aifa.dev"
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const WHO = "probe-195-9"

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
const rowsCount = async () => Number((await sql("SELECT COUNT(*) AS n FROM messages_that_came_into_memory")).rows?.[0]?.n ?? -1)

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}
const snapshot = (code) =>
  `# Проба 195-9\n\n- Адрес: https://example.com/probe-195-9-${code}\n- Итоговый адрес: https://example.com/\n- Код ответа: ${code}\n\n## Весь видимый текст\n\nПроба ворот кода ответа: ${code}.\n`
const ingest = async (code) => {
  const form = new FormData()
  form.append("file", new Blob([snapshot(code)], { type: "text/markdown" }), `web-probe-195-9-${code}.md`)
  form.append("url", `https://example.com/probe-195-9-${code}`)
  form.append("about", "проба ворот кода ответа стенда ссылок, достаточно слов для карточки поиска памяти")
  form.append("full", "Полное описание пробы ворот кода ответа: снимок составлен прибором 195-9 и в память лечь не должен.")
  form.append("title", `проба 195-9 код ${code}`)
  form.append("anchors", JSON.stringify(["   "]))
  form.append("who", WHO)
  const r = await fetch(`${BASE}/api/fractera/link-ingest`, { body: form, headers: G, method: "POST" })
  return { j: await r.json().catch(() => ({})), status: r.status }
}

console.log("===PROBE_LINK_PAGE_REFUSED===")
const before = await rowsCount()

// ── A1: дверь описания на 403 ──────────────────────────────────────────────
const t = Date.now()
const d = await fetch(`${BASE}/api/fractera/link-test/describe`, { body: JSON.stringify({ url: "https://httpbin.org/status/403" }), headers: H, method: "POST" })
const dj = await d.json().catch(() => ({}))
say(d.status === 422 && dj.error === "page-refused" && String(dj.why ?? "").startsWith("403"), `A1: описание 403 → ${d.status} ${dj.error ?? ""} (${dj.why ?? "—"}) за ${Date.now() - t} мс`)
say(Date.now() - t < 60000, "A1: модель не звалась — ответ быстрее хода модели")

// ── A2: дверь сохранения со снимком кода 403 ──────────────────────────────
const i403 = await ingest(403)
say(i403.status === 422 && i403.j.error === "page-refused", `A2: сохранение снимка 403 → ${i403.status} ${i403.j.error ?? ""} (${i403.j.why ?? "—"})`)
const mid = await rowsCount()
say(mid === before, `A2: строк до ${before} = после отказов ${mid}`)

// ── B: снимок кода 200 проходит ворота ─────────────────────────────────────
const i200 = await ingest(200)
say(i200.j.error !== "page-refused" && String(i200.j.error ?? "").includes("graph-refused"), `B: снимок 200 прошёл ворота и дошёл до хранилищ → ${i200.status} ${i200.j.error ?? "ok"}`)

// ── уборка по метке ────────────────────────────────────────────────────────
const mine = (await sql("SELECT object_id, vector_id FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows ?? []
for (const m of mine) {
  if (m.object_id) await fetch(`${DATA}/media/${m.object_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
  if (m.vector_id) await fetch(`${DATA}/vectors/${m.vector_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
}
await sql("DELETE FROM messages_that_came_into_memory WHERE who = ?", [WHO])
const after = await rowsCount()
say(after === before, `уборка: своих строк ${mine.length}, строк до ${before} = после ${after}`)

console.log(failed ? `✗ ПРОВАЛ: ${failed}` : "✓ OK")
console.log("===PROBE_LINK_PAGE_REFUSED_DONE===")
process.exit(failed ? 1 : 0)

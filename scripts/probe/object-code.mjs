#!/usr/bin/env node
// ПРИБОР 194-10: КОД ПРОХОДИТ ВЕСЬ ПУТЬ ЧЕРЕЗ ПУБЛИЧНЫЙ АДРЕС — НА ТЕХ ФАЙЛАХ, КОТОРЫЕ НЕ ПРОШЛИ У ВЛАДЕЛЬЦА.
//
// 🔒 ФАЙЛЫ ВЛАДЕЛЬЦА: `app/[lang]/_components/landing-toc.tsx` и `landing.tsx` («провал и везде неудачи»).
// 🔒 ПУТЬ ВЛАДЕЛЬЦА: `https://memory.aifa.dev` через nginx, а не петля `127.0.0.1:3700`. ✗ Прошлый прибор ходил
// мимо nginx и не мог увидеть того, что видел владелец.
// 🔒 ОПИСАНИЕ КОДА — АНАЛИЗ, А НЕ ИСХОДНИК (слово владельца 2026-09-13): полное описание не длиннее 5000 знаков
// и не содержит блока кода длиннее 15 строк; это и есть негатив против «переписал содержимое».
// 🔒 НЕГАТИВ БЕЗ МОДЕЛИ: чужие роды не перехвачены, таблица знает роды code/markdown/html.
// 🛑 ЦЕНА: 2 хода Claude по подписке. УБОРКА ПО МЕТКЕ `who = probe-194`.
//
// Запуск на сервере: node scripts/probe/object-code.mjs

import { readFileSync } from "node:fs"
import { kindOf, messageKindOf } from "../../lib/describe.mjs"

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
const sql = async (text, params = []) =>
  (await fetch(`${DATA}/db/migrate`, { body: JSON.stringify({ params, sql: text }), headers: H, method: "POST" })).json()

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}

/** Самый длинный блок кода в тексте, в строках. */
const longestFence = (s) => {
  let max = 0
  for (const m of String(s).matchAll(/```[^\n]*\n([\s\S]*?)```/g)) max = Math.max(max, m[1].split("\n").length)
  return max
}

console.log("===PROBE_CODE===")
console.log(`адрес: ${BASE}`)

say(kindOf("clip.mp4", "video/mp4") === "video", `kindOf(clip.mp4) = ${kindOf("clip.mp4", "video/mp4")}`)
say(kindOf("brochure.pdf", "application/pdf") === "pdf", `kindOf(brochure.pdf) = ${kindOf("brochure.pdf", "application/pdf")}`)
say(messageKindOf(kindOf("readme.md", ""), "readme.md") === "markdown", "readme.md → строка markdown")
say(kindOf("landing.tsx", "") === "code" && kindOf("route.ts", "video/mp2t") === "code", "landing.tsx и route.ts (video/mp2t) → code")

const CASES = [
  { mime: "", path: "app/[lang]/_components/landing-toc.tsx" },
  { mime: "", path: "app/[lang]/_components/landing.tsx" },
]

for (const c of CASES) {
  const bytes = readFileSync(c.path)
  const name = c.path.split("/").pop()

  const form = new FormData()
  form.append("file", new Blob([bytes], c.mime ? { type: c.mime } : {}), name)
  const t0 = Date.now()
  const dRes = await fetch(`${BASE}/api/fractera/object-test/describe`, { body: form, headers: { "x-data-secret": KEY }, method: "POST" })
  const type = String(dRes.headers.get("content-type") ?? "")
  const d = type.includes("json") ? await dRes.json().catch(() => ({})) : { html: (await dRes.text()).slice(0, 120) }
  console.log(`\n--- ${name} (${bytes.length} байт) → описание ${dRes.status} за ${Date.now() - t0} мс`)
  if (!d.ok) {
    say(false, `${name}: отказ описания ${JSON.stringify(d).slice(0, 240)}`)
    continue
  }
  console.log(`  название: ${d.title}`)
  console.log(`  саммари (${d.summary.split(/\s+/).length} слов): ${d.summary}`)
  console.log(`  полное (${d.full.length} знаков), начало: ${d.full.slice(0, 500).replace(/\n/g, " ⏎ ")}`)
  say(d.kind === "code", `${name}: род ${d.kind}`)
  say(d.full.length <= 5000, `${name}: полное описание ${d.full.length} знаков (предел 5000) — анализ, а не исходник`)
  say(longestFence(d.full) <= 15, `${name}: самый длинный блок кода в описании ${longestFence(d.full)} строк (предел 15)`)

  const save = new FormData()
  save.append("file", new Blob([bytes], c.mime ? { type: c.mime } : {}), name)
  save.append("about", d.summary)
  save.append("full", d.full)
  save.append("title", d.title)
  save.append("tags", JSON.stringify(d.tags))
  save.append("who", WHO)
  const sRes = await fetch(`${BASE}/api/fractera/object-test`, { body: save, headers: { "x-data-secret": KEY }, method: "POST" })
  const s = await sRes.json().catch(() => ({}))
  say(sRes.status === 200 && s.ok === true, `${name}: сохранение ${sRes.status}, messageId ${s.messageId} ${s.ok ? "" : JSON.stringify(s).slice(0, 160)}`)
  if (!s.ok) continue

  const view = await (await fetch(`${BASE}/api/fractera/object-test?message=${s.messageId}`, { headers: { "x-data-secret": KEY } })).json()
  say(view.row?.kind === "code" && view.row?.status === "saved", `${name}: строка kind=${view.row?.kind}, status=${view.row?.status}`)
  const f = await fetch(`${BASE}/api/fractera/object-file?id=${view.media?.id}`, { headers: { "x-data-secret": KEY } })
  const got = Buffer.from(await f.arrayBuffer())
  say(String(f.headers.get("content-type")).startsWith("text/plain"), `${name}: дверь файла ${f.status} ${f.headers.get("content-type")}`)
  say(got.equals(bytes), `${name}: байты совпадают (${got.length} = ${bytes.length})`)
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
console.log("===PROBE_CODE_END===")

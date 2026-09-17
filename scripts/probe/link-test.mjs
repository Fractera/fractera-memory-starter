#!/usr/bin/env node
// ПРИБОР 195-1: СТЕНД ССЫЛОК ПАМЯТИ ОТКРЫВАЕТ СТРАНИЦЫ ИИ-БРАУЗЕРОМ И НИЧЕГО НЕ ПИШЕТ В ПАМЯТЬ.
//
// 🔒 ПУТЬ ВЛАДЕЛЬЦА: публичный `https://memory.aifa.dev`, дверь `link-test`, секрет машины (закон `bench-guard.ts`).
// 🔒 ЭТАЛОНЫ НЕЙТРАЛЬНЫЕ — MDN и TodoMVC: боевые сайты владельца с адреса сервера включают защиту Vercel (закон 196).
// 🔒 НЕГАТИВЫ: без секрета — 401 JSON, а не 307 · адрес слоя данных `127.0.0.1:3300` — `url-forbidden` у ссылки ·
// 11 адресов — `too-many-urls` · счёт строк таблицы сообщений и векторов до = после (запись не происходит).
// 🛑 ЧЕГО ПРИБОР НЕ ПРОВЕРЯЕТ: отказ `browser-unreachable` — для него пришлось бы остановить ИИ-браузер или перезапустить
// память с адресом-приманкой; остановка служб ради проверки запрещена. Сказано вслух в итоге 195-1.
// 🛑 УБОРКИ НЕТ, ПОТОМУ ЧТО ЗАПИСИ НЕТ — это и проверяется счётом.
//
// Запуск на сервере: node scripts/probe/link-test.mjs

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "https://memory.aifa.dev"
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"

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
const count = async (text) => (await sql(text)).rows?.[0]?.n ?? -1

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}
const door = (body, headers = H) =>
  fetch(`${BASE}/api/fractera/link-test`, { body: JSON.stringify(body), headers, method: "POST", redirect: "manual" })

console.log("===PROBE_LINK_TEST===")
const rowsBefore = await count("SELECT COUNT(*) AS n FROM messages_that_came_into_memory")
const vecBefore = await count("SELECT COUNT(*) AS n FROM vectors")
say(rowsBefore >= 0 && vecBefore >= 0, `счёт до: строк ${rowsBefore}, векторов ${vecBefore}`)

// A — положительный случай
const MDN = "https://developer.mozilla.org/en-US/docs/Web/HTML"
const TODO = "https://todomvc.com/examples/react/dist/"
const t0 = Date.now()
const a = await door({ urls: [MDN, TODO] })
const aj = await a.json().catch(() => ({}))
say(a.status === 200, `A: дверь ответила ${a.status} за ${Date.now() - t0} мс`)
const res = Array.isArray(aj.results) ? aj.results : []
say(res.length === 2, `A: результатов ${res.length} из 2`)
for (const r of res) {
  const fields = r.fields?.total ?? 0
  console.log(`   ${r.url} → код ${r.status} · «${String(r.title ?? "").slice(0, 60)}» · текст ${r.text_length} · HTML ${r.html_length} · load ${r.load_reached} · поля ${fields} · отвергнуто ${r.blocked?.total ?? "—"} · error ${r.error ?? "—"}`)
  say(!r.error && Boolean(r.title) && (r.text_length ?? 0) > 0, `A: ${r.url} — заголовок и текст есть`)
  say(typeof r.text !== "string" || r.text.length <= 20000, `A: ${r.url} — экрану отдано начало текста (${r.text?.length ?? 0} ≤ 20000)`)
}
const todo = res.find((r) => r.url === TODO)
say((todo?.fields?.total ?? 0) >= 1, `A: у TodoMVC поле ввода найдено (${todo?.fields?.total ?? 0})`)

// B — негативы
const noKey = await door({ urls: [MDN] }, { "Content-Type": "application/json" })
const noKeyBody = await noKey.text()
say(noKey.status === 401 && noKeyBody.includes("unauthorized"), `B: без секрета ${noKey.status} ${noKeyBody.slice(0, 60)}`)

const bad = await door({ urls: ["http://127.0.0.1:3300/"] })
const badJ = await bad.json().catch(() => ({}))
const badR = badJ.results?.[0]
say(badR?.error === "url-forbidden", `B: адрес слоя данных → ${badR?.error ?? "нет отказа"} ${badR?.why ? `(${String(badR.why).slice(0, 80)})` : ""}`)

const many = await door({ urls: Array.from({ length: 11 }, (_, i) => `https://example.com/${i}`) })
const manyJ = await many.json().catch(() => ({}))
say(many.status === 400 && manyJ.error === "too-many-urls", `B: 11 адресов → ${many.status} ${manyJ.error ?? ""} (предел ${manyJ.limit ?? "—"})`)

const rowsAfter = await count("SELECT COUNT(*) AS n FROM messages_that_came_into_memory")
const vecAfter = await count("SELECT COUNT(*) AS n FROM vectors")
say(rowsAfter === rowsBefore && vecAfter === vecBefore, `B: счёт после: строк ${rowsAfter}, векторов ${vecAfter} — запись не произошла`)

console.log(failed ? `✗ ПРОВАЛ: ${failed}` : "✓ OK")
console.log("===PROBE_LINK_TEST_DONE===")
process.exit(failed ? 1 : 0)

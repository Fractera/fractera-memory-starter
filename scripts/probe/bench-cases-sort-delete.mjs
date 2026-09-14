#!/usr/bin/env node
// ПРИБОР 195-11: КОРПУС СЛУЧАЕВ СОРТИРУЕТСЯ ПО ДАТЕ В ОБЕ СТОРОНЫ И УДАЛЯЕТ РОВНО ОДИН СЛУЧАЙ ПО НОМЕРУ.
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-14: «сделай сортировку по дате опционально и сделай во всех кнопку удалить».
// 🔒 ПУТЬ ВЛАДЕЛЬЦА: публичный `https://memory.aifa.dev`, двери `link-search` (без `probe` — случаи обязаны записаться) и `bench-cases`.
// 🔒 МОДЕЛЬ НЕ ЗОВЁТСЯ. Корпус владельца не трогается: удаляется только свой случай по номеру, остаток — по своей метке.
// 🔒 НЕГАТИВЫ: удаление без номера и метки → 400 и корпус цел · несуществующий номер → 404 · порядок-чушь → как «сначала новые» · без секрета → 401.
//
// Запуск на сервере: node scripts/probe/bench-cases-sort-delete.mjs

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "https://memory.aifa.dev"
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const MARK = "проба-195-11-порядок"

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
const total = async () => Number((await sql("SELECT COUNT(*) AS n FROM memory_bench_cases")).rows?.[0]?.n ?? -1)
const minId = async () => Number((await sql("SELECT MIN(id) AS n FROM memory_bench_cases")).rows?.[0]?.n ?? -1)
const byMark = async () => (await sql("SELECT id FROM memory_bench_cases WHERE question LIKE ? ORDER BY id", [`%${MARK}%`])).rows ?? []
const book = async (order) => (await (await fetch(`${BASE}/api/fractera/bench-cases${order ? `?order=${encodeURIComponent(order)}` : ""}`, { headers: H })).json().catch(() => ({})))
const del = async (query) => {
  const r = await fetch(`${BASE}/api/fractera/bench-cases${query}`, { headers: H, method: "DELETE" })
  return { j: await r.json().catch(() => ({})), status: r.status }
}

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}

console.log("===PROBE_CASES_SORT_DELETE===")
const before = await total()

// ── два своих случая ─────────────────────────────────────────────────────
const ids = []
for (const q of ["первый", "второй"]) {
  const r = await fetch(`${BASE}/api/fractera/link-search`, { body: JSON.stringify({ question: `${q} поиск ${MARK}` }), headers: H, method: "POST" })
  ids.push(Number((await r.json().catch(() => ({}))).caseId ?? 0))
}
const [a, b] = ids
say(a > 0 && b > a, `два случая записаны: ${a}, ${b}`)

// ── A: порядок ───────────────────────────────────────────────────────────
const desc = await book("desc")
const asc = await book("asc")
const bogus = await book("чушь")
const dIds = (desc.cases ?? []).map((c) => Number(c.id))
const aIds = (asc.cases ?? []).map((c) => Number(c.id))
const oldest = await minId()
say(dIds[0] >= b && dIds.every((x, i) => i === 0 || x < dIds[i - 1]), `A: «сначала новые» — первым ${dIds[0]} (≥ ${b}), номера убывают`)
say(aIds[0] === oldest && aIds.every((x, i) => i === 0 || x > aIds[i - 1]), `A: «сначала старые» — первым самый старый случай корпуса ${aIds[0]} (= ${oldest}), номера растут`)
say(Number(bogus.cases?.[0]?.id) === dIds[0], `B: порядок «чушь» → как «сначала новые» (${bogus.cases?.[0]?.id})`)

// ── B: удаление без условия ─────────────────────────────────────────────
const t0 = await total()
const none = await del("")
say(none.status === 400 && (await total()) === t0, `B: удаление без номера и метки → ${none.status} ${none.j.error ?? ""}, корпус цел (${t0})`)
const ghost = await del("?id=999999999")
say(ghost.status === 404 && ghost.j.error === "not-found", `B: несуществующий номер → ${ghost.status} ${ghost.j.error ?? ""}`)

// ── A: удаление одного ───────────────────────────────────────────────────
const one = await del(`?id=${a}`)
const left = (await byMark()).map((r) => Number(r.id))
say(one.status === 200 && !left.includes(a) && left.includes(b), `A: удалён ровно ${a} → ${one.status}; своих осталось [${left.join(", ")}]`)

const noKey = await fetch(`${BASE}/api/fractera/bench-cases`, { redirect: "manual" })
say(noKey.status === 401, `B: без секрета → ${noKey.status}`)

// ── уборка по метке ─────────────────────────────────────────────────────
await del(`?mark=${encodeURIComponent(MARK)}`)
const after = await total()
say((await byMark()).length === 0 && after === before, `уборка: своих 0, корпус до ${before} = после ${after}`)

console.log(failed ? `✗ ПРОВАЛ: ${failed}` : "✓ OK")
console.log("===PROBE_CASES_SORT_DELETE_DONE===")
process.exit(failed ? 1 : 0)

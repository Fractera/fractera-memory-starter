#!/usr/bin/env node
// ПРИБОР 195-10: ПОИСК ССЫЛКИ ПОПАДАЕТ В ОБЩИЙ КОРПУС С ХРАНИЛИЩЕМ `link`, И ЕМУ СТАВИТСЯ ВЕРДИКТ ЧЕЛОВЕКА.
//
// 🎯 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-14: «Общий + подпись (Recommended)» — один корпус (закон 189-6), подпись хранилища у каждого случая.
// 🔒 ПУТЬ ВЛАДЕЛЬЦА: публичный `https://memory.aifa.dev`, двери `link-search` (БЕЗ `probe` — случай обязан записаться) и `bench-cases`.
// 🔒 МОДЕЛЬ НЕ ЗОВЁТСЯ: поиск — встраивание вопроса; вердикт — строка таблицы.
// 🔒 НЕГАТИВЫ: вердикт `maybe` → 400 и случай без вердикта · без секрета → 401.
// 🛑 УБОРКА ПО МЕТКЕ В ТЕКСТЕ ВОПРОСА (`DELETE bench-cases` с меткой), а не по таблице: корпус владельца не трогается.
//
// Запуск на сервере: node scripts/probe/link-verdict.mjs

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "https://memory.aifa.dev"
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const MARK = "проба-195-10-вердикт"

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
const byMark = async () => (await sql("SELECT id, store, verdict, why FROM memory_bench_cases WHERE question LIKE ?", [`%${MARK}%`])).rows ?? []

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}

console.log("===PROBE_LINK_VERDICT===")
const before = await total()

// ── A: поиск ссылки пишет случай `link` ───────────────────────────────────
const s = await fetch(`${BASE}/api/fractera/link-search`, { body: JSON.stringify({ question: `платформа ИИ-агентов на своём сервере ${MARK}` }), headers: H, method: "POST" })
const sj = await s.json().catch(() => ({}))
say(s.status === 200 && Number(sj.caseId) > 0, `A: поиск ссылки ${s.status}, случай ${sj.caseId}`)

const book = await (await fetch(`${BASE}/api/fractera/bench-cases`, { headers: H })).json().catch(() => ({}))
const c = (book.cases ?? []).find((x) => Number(x.id) === Number(sj.caseId))
say(c?.store === "link" && c?.verdict == null, `A: корпус отдаёт случай ${c?.id} — хранилище ${c?.store}, вердикт ${c?.verdict ?? "нет"}; всего в корпусе ${book.summary?.total}`)

// ── B: негатив — вердикт вне двух значений ────────────────────────────────
const bad = await fetch(`${BASE}/api/fractera/bench-cases`, { body: JSON.stringify({ id: sj.caseId, verdict: "maybe", why: MARK }), headers: H, method: "POST" })
const badJ = await bad.json().catch(() => ({}))
const afterBad = (await byMark())[0]
say(bad.status === 400 && badJ.error === "bad-verdict" && afterBad?.verdict == null, `B: вердикт maybe → ${bad.status} ${badJ.error ?? ""}, случай без вердикта`)

const noKey = await fetch(`${BASE}/api/fractera/bench-cases`, { redirect: "manual" })
say(noKey.status === 401, `B: без секрета → ${noKey.status}`)

// ── A: вердикт человека ───────────────────────────────────────────────────
const good = await fetch(`${BASE}/api/fractera/bench-cases`, { body: JSON.stringify({ id: sj.caseId, verdict: "good", why: `нашла fractera ${MARK}` }), headers: H, method: "POST" })
const judged = (await byMark())[0]
say(good.status === 200 && judged?.verdict === "good" && String(judged?.why ?? "").includes(MARK), `A: вердикт good записан и читается — ${judged?.verdict}, «${judged?.why}»`)

// ── уборка по метке ───────────────────────────────────────────────────────
// 🔒 МЕТКА — В АДРЕСЕ (`?mark=`), А НЕ В ТЕЛЕ: так её читает дверь `bench-cases` (проверено чтением обработчика до прогона).
const del = await fetch(`${BASE}/api/fractera/bench-cases?mark=${encodeURIComponent(MARK)}`, { headers: H, method: "DELETE" })
const left = (await byMark()).length
const after = await total()
say(left === 0 && after === before, `уборка: DELETE ${del.status}, случаев с меткой ${left}, корпус до ${before} = после ${after}`)

console.log(failed ? `✗ ПРОВАЛ: ${failed}` : "✓ OK")
console.log("===PROBE_LINK_VERDICT_DONE===")
process.exit(failed ? 1 : 0)

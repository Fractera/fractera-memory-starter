#!/usr/bin/env node
//
// ПРИБОР 200-6 — ОТВЕТЫ ДВУХ ГЛАГОЛОВ СООТВЕТСТВУЮТ СХЕМЕ ДОГОВОРА.
//
// 🔒 ЗОВЁТ КАК ВНЕШНЯЯ ПРОГРАММА: публичный адрес памяти, ключ памяти. Запускается на сервере из `/opt/fractera/memory`.
// 🔒 СХЕМА ОДНА: договор по HTTP отдаёт JSON Schema, порождённую из `lib/output-schema.mjs`; прибор сверяет, что отданное совпадает с
// порождённым здесь, и проверяет живые ответы теми же объявлениями. Разойдись они — прибор скажет об этом первой строкой.
//
// 🛑 ЦЕНА НАЗВАНА ДО ПРОГОНА: ОДИН ход модели («Сказать» фразой без фактов), три встраивания поиска объектов у «Спросить» с вопросом.
// 🛑 ЧТО ПРИБОР ПИШЕТ И ЧЬЁ ЭТО: одна фраза без фактов у служебного имени `bench-1` — в журнал памяти; фактов не рождает, объектов не кладёт.

import { readFileSync } from "node:fs"
import { problemsOf } from "../check-contract.mjs"
import { METHODS, CONTRACT_VERSION } from "../../contract.mjs"
import { outputSchemaOf, OUTPUTS } from "../../lib/output-schema.mjs"

const BASE = process.env.MEMORY_PUBLIC_URL ?? "https://memory.aifa.dev"
const KEY = readFileSync(process.env.MEMORY_API_KEY_FILE ?? "/etc/fractera/memory-api-key", "utf8").trim()

let bad = 0
const check = (ok, what, extra = "") => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}${extra ? "  — " + extra : ""}`)
}

async function call(verb, body) {
  const started = Date.now()
  const r = await fetch(`${BASE}/v1/${verb}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-memory-key": KEY },
    method: "POST",
  })
  const json = await r.json().catch(() => ({ raw: "not json" }))
  return { json, ms: Date.now() - started, status: r.status }
}

const fits = (verb, json) => {
  const r = OUTPUTS[verb].safeParse(json)
  return { ok: r.success, why: r.success ? "" : r.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }
}

console.log("=".repeat(72))
console.log(`ПРИБОР 200-6 — схема ответа двух глаголов через ${BASE}`)
console.log("=".repeat(72))

// ── 1. ДОГОВОР ПО HTTP ОТДАЁТ ТУ ЖЕ СХЕМУ ─────────────────────────────────────────
// ✗ ПЕРВЫЙ ПРОГОН ЗВАЛ ДОГОВОР БЕЗ КЛЮЧА: открыт без ключа только `/v1/health`, пришёл `401`, и пять строк прибора покраснели по его вине.
const live = await (await fetch(`${BASE}/v1/contract`, { headers: { "x-memory-key": KEY } })).json()
check(live.version === CONTRACT_VERSION, "договор на сервере той же версии, что код", `${live.version} / ${CONTRACT_VERSION}`)
for (const verb of ["remember", "recall"]) {
  const m = (live.methods ?? []).find((x) => x.name === verb)
  check(JSON.stringify(m?.output) === JSON.stringify(outputSchemaOf(verb)), `GET /v1/contract: схема ответа «${verb}» совпадает с порождённой`)
  check(Array.isArray(m?.output?.required) && ["text", "objects"].every((f) => m.output.required.includes(f)), `схема «${verb}» требует text и objects`)
}

// ── 2. ЖИВЫЕ ОТВЕТЫ ПРОХОДЯТ СХЕМУ ─────────────────────────────────────────────────
const cases = [
  ["recall", { lang: "ru", who: "bench-1" }, 200, "«Спросить» без вопроса — всё известное"],
  ["recall", { lang: "ru", text: "документ о вложениях", who: "bench-1" }, 200, "«Спросить» с вопросом — факты и объекты"],
  ["remember", { lang: "ru", text: "Проверка схемы 200-6: фактов о человеке здесь нет.", who: "bench-1" }, 200, "«Сказать» без фактов"],
  ["remember", { lang: "ru", who: "bench-1" }, 400, "отказ: «Сказать» без text"],
  ["recall", { lang: "ru" }, 400, "отказ: «Спросить» без who"],
]
for (const [verb, body, code, what] of cases) {
  const r = await call(verb, body)
  const f = fits(verb, r.json)
  check(r.status === code && f.ok, `${what}: код ${code}, ответ по схеме`, `код ${r.status} за ${r.ms} мс${f.why ? " · " + f.why : ""}`)
  console.log(`     text: ${JSON.stringify(String(r.json?.text ?? "")).slice(0, 150)} · objects: ${Array.isArray(r.json?.objects) ? r.json.objects.length : "—"}`)
  if (verb === "recall" && body.text) {
    const ids = (r.json?.objects ?? []).filter((o) => o.id)
    check(Array.isArray(r.json?.objects) && (ids.length === r.json.objects.length), "у каждого найденного объекта есть id", `${ids.length} из ${r.json?.objects?.length ?? 0}${r.json?.objects_error ? " · objects_error " + r.json.objects_error : ""}`)
  }
}

// ── 3. НЕГАТИВЫ: СХЕМА И СТОРОЖ ОТВЕРГАЮТ ЗАВЕДОМО НЕВЕРНОЕ ─────────────────────────
const sample = { objects: [], ok: true, text: "- x: y", what_happened: "ok" }
check(fits("recall", sample).ok, "контроль контроля: заведомо верный ответ проходит схему")
const { text: _drop, ...noText } = sample
check(!fits("recall", noText).ok, "НЕГАТИВ: ответ без text схему не проходит", fits("recall", noText).why)
check(!fits("remember", { ...sample, objects: [{ id: "a" }] }).ok, "НЕГАТИВ: объект без ok схему не проходит")
const stripped = METHODS.map((m) => (m.name === "remember" ? { ...m, output: undefined } : m))
const problems = problemsOf(stripped, CONTRACT_VERSION)
check(problems.some((p) => p.includes("remember") && p.includes("output")), "НЕГАТИВ: сторож договора ловит глагол без схемы ответа", problems.join(" | "))
check(problemsOf(METHODS, CONTRACT_VERSION).length === 0, "контроль контроля: настоящий договор сторож пропускает")

console.log("-".repeat(72))
if (bad === 0) {
  console.log("✓ ВСЁ ЗЕЛЁНОЕ: ответы обоих глаголов — по схеме договора, с text и objects, отказы тоже")
  process.exit(0)
}
console.log(`🛑 ПРОВАЛОВ: ${bad}`)
process.exit(1)

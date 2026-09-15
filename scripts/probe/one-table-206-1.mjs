#!/usr/bin/env node
// ПРИБОР 206-1: ЗАПИСЬ БОЛЬШЕ НЕ ЗАВОДИТ НИ ТАБЛИЦ, НИ КОЛОНОК.
//
// 🔒 ЧТО ИМЕННО ДОКАЗЫВАЕТСЯ: после решения владельца 2026-09-15 память работает с одной таблицей —
// `messages_that_came_into_memory`. Значит состав базы ДО фразы и ПОСЛЕ фразы обязан совпасть
// целиком, а разобранный факт обязан уехать в граф.
//
// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ ЗДЕСЬ НЕ УКРАШЕНИЕ, А ЕДИНСТВЕННЫЙ СПОСОБ ОТЛИЧИТЬ «ничего не создалось» от
// «прибор слеп»: тем же снимком ловится ЗАВЕДОМОЕ создание — прибор сам создаёт свою таблицу с меткой
// в имени, видит её в снимке и тут же удаляет. Ноль, полученный слепым счётчиком, ничего не значит.
//
// 🛑 ЧТО ПРИБОР УДАЛЯЕТ И ЧЬЁ ЭТО: только свою таблицу `probe_206_1_negative_control` и свои документы
// графа по префиксу `memory/probe-206-1/`. Ни одной живой строки памяти он не трогает.
//
// 🛑 СТОИТ ОДИН ВЫЗОВ МОДЕЛИ (разбор фразы). Квота общая с Telegram-ботом — назвать её остаток ДО
// запуска. Запуск на сервере: node scripts/probe/one-table-206-1.mjs

import { sql } from "../../lib/store.mjs"
import { forgetBySource } from "../../lib/graph.mjs"
import { remember } from "../../lib/verbs.mjs"

const WHO = "probe-206-1"
const NEG = "probe_206_1_negative_control"

let failed = 0
const say = (ok, text, extra = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}${extra ? `  — ${extra}` : ""}`)
}

const tables = async () => {
  const r = await sql("SELECT name FROM sqlite_master WHERE type = 'table'")
  return (r.rows ?? []).map((x) => x.name).sort()
}

console.log("===PROBE_206_1===")

// ── ПЛОСКОСТЬ ОДНА: СОСТАВ БАЗЫ ДО И ПОСЛЕ ЖИВОЙ ЗАПИСИ ──────────────────────
const before = await tables()
console.log(`таблиц до: ${before.length}`)

const out = await remember({
  lang: "ru",
  text: "Мою собаку зовут Марта, она лабрадор. Завёл её в Севилье три года назад.",
  who: WHO,
})

say(out?.ok === true, `запись принята: ${out?.what_happened ?? out?.error ?? "?"}`)
say(
  Array.isArray(out?.noted) && out.noted.length > 0,
  `факты разобраны: ${(out?.noted ?? []).map((n) => `${n.what}=${n.became}`).join("; ") || "ни одного"}`,
)
say(
  (out?.noted ?? []).every((n) => n.where === "graph"),
  "каждый факт уехал событием в граф, а не в место хранения",
)
say(out?.kept_whole?.ok === true, `фраза целиком в графе: ${out?.kept_whole?.where ?? out?.kept_whole?.why}`)

const after = await tables()
console.log(`таблиц после: ${after.length}`)
const born = after.filter((t) => !before.includes(t))
say(born.length === 0, `новых таблиц не появилось${born.length ? `: ${born.join(", ")}` : ""}`)

// ── НЕГАТИВНЫЙ КОНТРОЛЬ: ТОТ ЖЕ СНИМОК ОБЯЗАН УВИДЕТЬ ЗАВЕДОМОЕ СОЗДАНИЕ ─────
await sql(`CREATE TABLE IF NOT EXISTS ${NEG} (id INTEGER PRIMARY KEY AUTOINCREMENT)`)
const withNeg = await tables()
say(
  withNeg.includes(NEG),
  "негатив: прибор видит созданную таблицу — значит его ноль выше означает отсутствие, а не слепоту",
)
await sql(`DROP TABLE IF EXISTS ${NEG}`)
const cleaned = await tables()
say(!cleaned.includes(NEG), "негативная таблица убрана прибором за собой")

// ── ТРЕБОВАНИЕ СОЗДАТЬ ТАБЛИЦУ ОТВЕЧАЕТ СЛОВАМИ, А НЕ МОЛЧАНИЕМ ─────────────
const asked = await remember({
  lang: "ru",
  need_table: true,
  text: "Ещё у меня есть кот Бублик.",
  who: WHO,
})
const fate = (asked?.params ?? []).find((p) => p.name === "need_table")
say(
  fate?.state === "not_supported",
  `судьба need_table названа: ${fate ? `${fate.state} — ${fate.note}` : "строки нет вовсе"}`,
)
const afterAsk = await tables()
say(
  afterAsk.filter((t) => !before.includes(t)).length === 0,
  "требование таблицы её не создало",
)

// ── УБОРКА ПО СВОЕЙ МЕТКЕ ───────────────────────────────────────────────────
const forgotten = await forgetBySource(`memory/${WHO}/`)
console.log(`документов графа прибора убрано: ${forgotten.deleted ?? 0}`)

console.log("")
if (failed === 0) {
  console.log("✓ ВСЁ СОШЛОСЬ: запись работает одной таблицей, новых мест не появляется")
  process.exit(0)
}
console.log(`🛑 ПРОВАЛОВ: ${failed}`)
process.exit(1)

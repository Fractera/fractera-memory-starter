#!/usr/bin/env node
// ИНСТРУМЕНТ 206-4: СНЯТЬ КОРНЕВУЮ ТАБЛИЦУ ЧЕЛОВЕКА И ЕЁ ДОЧЕРНИЕ.
//
// 🛑 ЭТО УДАЛЕНИЕ ЖИВЫХ ДАННЫХ, И ОНО НЕОБРАТИМО. Список таблиц и счёт строк были показаны владельцу
// ДО запуска; его ответ 2026-09-16, дословно: **«Удалить сразу, без снимка»**.
//
// 🔒 ЧТО ИМЕННО УДАЛЯЕТСЯ — ТОЛЬКО ИМЕНА, НАЧИНАЮЩИЕСЯ С КОРНЯ. Ни таблица сообщений, ни объекты, ни
// кейсы стенда (их судьба — 206-5) здесь не трогаются. Образец имени проверяется ДО удаления, и
// каждое имя печатается: «удалил двенадцать» без перечисления проверить нельзя.
//
// 🔒 ЭТО НЕ ПРИБОР: приборы убирают за собой только свою метку. Инструмент запускается один раз
// рукой, печатает состояние до и после и больше не нужен.
//
// Запуск на сервере: node development-docs/instruments/206-4-drop-old-tables.mjs

import { sql } from "../../lib/store.mjs"

const ROOT = "person_who_owns_this_project"
const KEEP = "messages_that_came_into_memory"

const list = async () => {
  const r = await sql("SELECT name FROM sqlite_master WHERE type = ? ORDER BY name", ["table"])
  return (r.rows ?? []).map((x) => x.name)
}
const count = async (t) => {
  const c = await sql(`SELECT COUNT(*) AS n FROM ${t}`)
  return c.ok && c.rows.length ? c.rows[0].n : "?"
}

console.log("===DROP_206_4===")

const before = await list()
const doomed = before.filter((n) => n === ROOT || n.startsWith(`${ROOT}__`))
console.log(`таблиц всего: ${before.length}; к удалению: ${doomed.length}`)
for (const t of doomed) console.log(`  − ${t} (${await count(t)} строк)`)

const keptBefore = await count(KEEP)
console.log(`сохраняем нетронутой: ${KEEP} — ${keptBefore} строк`)

for (const t of doomed) {
  const r = await sql(`DROP TABLE IF EXISTS ${t}`)
  console.log(`${r.ok ? "удалена" : "ОТКАЗ"}: ${t}${r.ok ? "" : ` — ${r.error}`}`)
}

const after = await list()
const left = after.filter((n) => n === ROOT || n.startsWith(`${ROOT}__`))
console.log(`таблиц всего: ${after.length}; из удалённых осталось: ${left.length}`)

// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ ТОЙ ЖЕ ФОРМЫ: тот же счётчик обязан ВИДЕТЬ уцелевшее. Ноль, полученный
// слепым счётчиком, ничего не значит — поэтому рядом печатается то, что обязано остаться.
const keptAfter = await count(KEEP)
console.log(`${KEEP}: было ${keptBefore}, стало ${keptAfter}`)
console.log(`кейсы стенда на месте (их судьба — 206-5): ${after.includes("memory_bench_cases") ? "да" : "НЕТ"}`)

console.log(left.length === 0 && keptAfter === keptBefore ? "✓ СНЯТО ЧИСТО" : "🛑 ЧТО-ТО НЕ ТАК")
console.log("===DROP_206_4_END===")
process.exit(left.length === 0 && keptAfter === keptBefore ? 0 : 1)

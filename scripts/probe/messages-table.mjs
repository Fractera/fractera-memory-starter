#!/usr/bin/env node
// ПРИБОР 194-1: ТАБЛИЦУ СООБЩЕНИЙ И ДВА УКАЗАТЕЛЯ СОЗДАЁТ КОД, А НЕ ПРИБОР.
//
// 🔒 ПРИБОР НЕ ПИШЕТ `CREATE` САМ (закон 144). Он снимает состав базы, зовёт
// `ensureMessages()` и снимает снова — прямым запросом к слою данных.
// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ: строка с запрещённым направлением обязана быть отвергнута.
// Если её вдруг приняли — прибор убирает её по своей метке `who = probe-194`.
// 🛑 ТАБЛИЦЫ ПОСЛЕ ПРОГОНА ОСТАЮТСЯ: это рабочая форма памяти, а не мусор прибора.
//
// Запуск на сервере: node scripts/probe/messages-table.mjs

import { sql } from "../../lib/store.mjs"
import { columnsOf, ensureMessages, LINKS, MESSAGES, nowIso, REGISTRY } from "../../lib/messages.mjs"

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}
const tables = async () => {
  const r = await sql(`SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '${MESSAGES}%'`)
  return (r.rows ?? []).map((x) => x.name).sort()
}

console.log("===PROBE_MESSAGES===")
const before = await tables()
console.log(`до: ${before.length ? before.join(", ") : "таблиц нет"}`)

const first = await ensureMessages()
say(first.ok, `ensureMessages() первый вызов: ${JSON.stringify(first)}`)
const after = await tables()
console.log(`после: ${after.join(", ")}`)
say([MESSAGES, LINKS, REGISTRY].every((t) => after.includes(t)), "все три таблицы существуют")

for (const t of [MESSAGES, LINKS, REGISTRY]) console.log(`  ${t}: ${(await columnsOf(t)).join(" · ")}`)

const second = await ensureMessages()
const again = await tables()
say(second.ok && again.join() === after.join(), "повторный вызов ничего не меняет")

const good = await sql(
  `INSERT INTO ${MESSAGES} (created_at, direction, kind, status, who) VALUES (?, 'remember', 'image', 'described', 'probe-194')`,
  [nowIso()],
)
say(good.ok === true, `законная строка принята: ${JSON.stringify(good).slice(0, 90)}`)

const bad = await sql(
  `INSERT INTO ${MESSAGES} (created_at, direction, kind, status, who) VALUES (?, 'delete', 'image', 'described', 'probe-194')`,
  [nowIso()],
)
say(bad.ok === false, `негатив: direction='delete' отвергнут: ${JSON.stringify(bad).slice(0, 120)}`)

const badKind = await sql(
  `INSERT INTO ${MESSAGES} (created_at, kind, status, who) VALUES (?, 'spreadsheet', 'saved', 'probe-194')`,
  [nowIso()],
)
say(badKind.ok === false, `негатив: kind='spreadsheet' отвергнут: ${JSON.stringify(badKind).slice(0, 120)}`)

await sql(`DELETE FROM ${MESSAGES} WHERE who = 'probe-194'`)
const left = await sql(`SELECT COUNT(*) AS n FROM ${MESSAGES} WHERE who = 'probe-194'`)
say(left.rows?.[0]?.n === 0, `уборка по метке: строк probe-194 осталось ${left.rows?.[0]?.n}`)

console.log(failed ? `✗ ПРОВАЛ: ${failed}` : "✓ OK")
console.log("===PROBE_MESSAGES_END===")

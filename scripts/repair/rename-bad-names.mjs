#!/usr/bin/env node
//
// РЕМОНТ ИМЁН, РОЖДЁННЫХ ДО ПОЧИНОК (по прямой просьбе владельца 2026-09-09).
//
// 🛑 ЭТО ИЗМЕНЕНИЕ ФОРМЫ, А НЕ ПРАВКА ЗНАЧЕНИЯ. По решению владельца такое
// делается ТОЛЬКО по явной просьбе и с называнием того, что пропадёт.
// Здесь просьба прямая: «переименуй friend_name в people_he_calls_his_friends
// и убери дубль пояса».
//
// ✗ ЧЕМ ОПЛАЧЕН РЕМОНТ — ИЗМЕРЕНО, А НЕ ПРЕДПОЛОЖЕНО. `friend_name` — два слова,
// ярлык. Модель, увидев его в каталоге, положила туда **кота Барсика**: имя
// расплывчатое, и кот в «имя друга» подошёл. `people_he_calls_his_friends` кота
// бы не приняло.
// 🔒 ЗАКОН ШИРЕ СЛУЧАЯ: ПЛОХОЕ ИМЯ НЕ ПРОСТО НЕКРАСИВО — ОНО ПРИТЯГИВАЕТ НЕ
// СВОЁ. Ярлык портит данные, а не только вид. И воспроизводит себя: пока
// колонка есть, модель обязана брать её по правилу «бери существующее имя».
//
// 🛑 ЧТО ЭТОТ РЕМОНТ НЕ ЧИНИТ И НЕ МОЖЕТ: кот, уже лежащий среди друзей,
// машинно не отделяется. Разделить их может только человек словом.
//
// Запуск: node scripts/repair/rename-bad-names.mjs          — только показать
//         node scripts/repair/rename-bad-names.mjs --do     — выполнить

import { columnsOf, sql } from "../../lib/store.mjs"
import { ROOT } from "../../lib/naming.mjs"

const DO = process.argv.includes("--do")

// Что чиним. Слева — как есть, справа — как должно быть.
const RENAME = [["friend_name", "people_he_calls_his_friends"]]
const DROP = ["timezone_where_he_lives"]

const PAIRS = ["", "__claim", "__basis"]

console.log("=".repeat(72))
console.log(DO ? "РЕМОНТ ИМЁН — ВЫПОЛНЯЮ" : "РЕМОНТ ИМЁН — ТОЛЬКО ПОКАЗЫВАЮ (--do чтобы выполнить)")
console.log("=".repeat(72))

const before = await columnsOf(ROOT)
console.log("")
console.log("── ДО ──")
console.log("  колонок в корне:", before.length)

// 🔒 ЧТО ПРОПАДЁТ — НАЗЫВАЕТСЯ ЧИСЛОМ ДО ТОГО, КАК ПРОПАДЁТ.
for (const col of DROP) {
  if (!before.includes(col)) { console.log(`  «${col}» уже нет`); continue }
  const c = await sql(`SELECT COUNT(*) AS n FROM ${ROOT} WHERE ${col} IS NOT NULL`)
  const n = c.ok && c.rows.length ? c.rows[0].n : "?"
  console.log(`  🛑 «${col}» будет УДАЛЕНА; непустых значений в ней: ${n}`)
}
for (const [from, to] of RENAME) {
  if (!before.includes(from)) { console.log(`  «${from}» уже нет`); continue }
  const c = await sql(`SELECT COUNT(*) AS n FROM ${ROOT} WHERE ${from} IS NOT NULL`)
  const n = c.ok && c.rows.length ? c.rows[0].n : "?"
  console.log(`  «${from}» → «${to}»; непустых значений: ${n} (они переживут переименование)`)
}

// Дочерние таблицы, рождённые из переименовываемых родов.
const kids = await sql(
  "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ?",
  [`${ROOT}__%`],
)
const kidNames = (kids.rows ?? []).map((r) => r.name)
for (const [from, to] of RENAME) {
  const oldT = `${ROOT}__${from}`
  if (kidNames.includes(oldT)) {
    const c = await sql(`SELECT COUNT(*) AS n FROM ${oldT}`)
    console.log(`  таблица «${oldT}» → «${ROOT}__${to}»; строк: ${c.ok ? c.rows[0]?.n : "?"}`)
  }
}

if (!DO) {
  console.log("")
  console.log("(ничего не тронуто. Повторить с --do)")
  process.exit(0)
}

console.log("")
console.log("── РЕМОНТ ──")

for (const [from, to] of RENAME) {
  for (const suffix of PAIRS) {
    const a = from + suffix
    const b = to + suffix
    if (!before.includes(a)) continue
    if (before.includes(b)) { console.log(`  🛑 «${b}» уже есть — пропускаю, чтобы не потерять данные`) ; continue }
    const r = await sql(`ALTER TABLE ${ROOT} RENAME COLUMN ${a} TO ${b}`)
    console.log(`  ${r.ok ? "✓" : "🛑"} колонка ${a} → ${b}${r.ok ? "" : " — " + r.error}`)
  }
  const oldT = `${ROOT}__${from}`
  const newT = `${ROOT}__${to}`
  if (kidNames.includes(oldT) && !kidNames.includes(newT)) {
    const r = await sql(`ALTER TABLE ${oldT} RENAME TO ${newT}`)
    console.log(`  ${r.ok ? "✓" : "🛑"} таблица ${oldT} → ${newT}`)
    // Происхождение строк ссылалось на СТАРОЕ имя колонки — иначе «переехало
    // из friend_name» станет ложью о месте, которого больше нет.
    const u = await sql(`UPDATE ${newT} SET came_from_column = ? WHERE came_from_column = ?`, [to, from])
    console.log(`  ${u.ok ? "✓" : "🛑"} происхождение строк указывает на новое имя`)
  }
}

for (const col of DROP) {
  for (const suffix of PAIRS) {
    const c = col + suffix
    if (!before.includes(c)) continue
    const r = await sql(`ALTER TABLE ${ROOT} DROP COLUMN ${c}`)
    console.log(`  ${r.ok ? "✓" : "🛑"} колонка ${c} удалена${r.ok ? "" : " — " + r.error}`)
  }
}

const after = await columnsOf(ROOT)
console.log("")
console.log("── ПОСЛЕ ──")
for (const c of after) {
  if (/__claim$|__basis$|^id$|^who$|^created_at$/.test(c)) continue
  const words = c.split("_").length
  console.log(`  ${words >= 4 ? "✓" : "🛑"} ${c}  (${words} слов)`)
}
console.log("")
console.log(`колонок было ${before.length}, стало ${after.length}`)
// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ РЕМОНТА: плохих имён не осталось НИ ОДНОГО.
const stillBad = after.filter((c) => !/__claim$|__basis$|^id$|^who$|^created_at$/.test(c) && c.split("_").length < 4)
if (stillBad.length) {
  console.log("🛑 ОСТАЛИСЬ ЯРЛЫКИ:", stillBad.join(", "))
  process.exit(1)
}
console.log("✓ ярлыков не осталось: каждое имя — фраза из четырёх слов и больше")

// ЧЕТЫРЕ ПУТИ ЗАПИСИ В РЕЛЯЦИОННОЕ ХРАНИЛИЩЕ — СЛЕДЫ В БАЗЕ ЧИСЛАМИ (193-1).
//
// 🎯 ВОПРОС ВЛАДЕЛЬЦА 2026-09-13: «эти три инструмента физически три разных
// метода?» Ответ добывается замером, а не чтением: у каждого пути свой след в
// составе базы, и прибор его печатает.
//
// Пути:
//   1 новый род        make_new_kind    → +3 колонки корня (значение, род, основание)
//   2 запись           write_value      → колонок столько же, значение на месте
//   3 исправление      write_value      → +1 строка истории, значение новое
//   4 рождение таблицы promote_to_list  → +1 таблица, прежнее переехало СО СВОИМ временем, поле очищено
//   5 дописать         promote_to_list  → таблиц столько же, +1 строка
//
// 🛑 КОРЕНЬ — ЖИВАЯ ПАМЯТЬ ВЛАДЕЛЬЦА, И ЭТО ГЛАВНОЕ ОГРАНИЧЕНИЕ ПРИБОРА.
// ✗ Оплачено в соседней службе (шаг 160): прибор стирал таблицы личной памяти
// целиком, и снаружи это было неотличимо от «памяти никогда не было».
// Поэтому здесь: свой ключ человека `probe-193`, рода с приставкой `probe_193_`,
// уборка ТОЛЬКО своего — `DELETE` своих строк, `DROP TABLE` своих таблиц,
// `DROP COLUMN` своих колонок. Спрашивать у прибора надо не «что он проверяет»,
// а «что он удаляет и чьё это».
//
// 🔒 СОСТАВ БАЗЫ ДО И ПОСЛЕ — ЧАСТЬ ВЕРДИКТА. Совпали числа — чужое не тронуто.
//
// Запуск на сервере: node scripts/probe/tables-three-methods.mjs [keep]

import { readFileSync } from "node:fs"

const MARK = "===TESTS_TABLES==="
const KEEP = process.argv.includes("keep")
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const ROOT = "person_who_owns_this_project"
const WHO = "probe-193"
const PREFIX = "probe_193_"

const secret = (() => {
  try {
    for (const line of readFileSync(process.env.FRACTERA_MACHINE_ENV || "/etc/fractera/secrets.env", "utf8").split(/\r?\n/)) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === "DATA_SECRET") return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    }
  } catch { /* скажем ниже */ }
  return process.env.DATA_SECRET || ""
})()
if (!secret) {
  console.log(`${MARK} СЕКРЕТА МАШИНЫ НЕТ — прогон невозможен`)
  process.exit(2)
}

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}

/** Прямой запрос к слою данных — мимо кода памяти. Так состав базы меряется независимо. */
async function sql(text, params = []) {
  const r = await fetch(`${DATA}/db/migrate`, {
    body: JSON.stringify({ params, sql: text }),
    headers: { "Content-Type": "application/json", "X-Data-Secret": secret },
    method: "POST",
  })
  // 🔒 ОТВЕТ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ HTTP: слой данных отвечает 200 с
  // `{ok:false}` на отвергнутый SQL — правка «прошла бы» молча (закон 161).
  const j = await r.json().catch(() => ({}))
  return { ok: r.ok && j.ok !== false, rows: j.rows ?? [], error: j.error }
}

/**
 * Колонки корня.
 * 🛑 `PRAGMA table_info` ЧЕРЕЗ ЭТУ ДВЕРЬ ОТДАЁТ ПУСТО — измерено 193-1: дверь
 * ведёт всё, что не начинается с SELECT, по пути `run()`, и строк не возвращает.
 * Читаем объявление таблицы.
 */
async function columns() {
  const r = await sql("SELECT sql FROM sqlite_master WHERE name = ?", [ROOT])
  const body = String(r.rows[0]?.sql ?? "")
  const inner = body.slice(body.indexOf("(") + 1, body.lastIndexOf(")"))
  // Скобки DEFAULT-выражений не дают резать по запятой наивно — считаем глубину.
  const out = []
  let depth = 0
  let cur = ""
  for (const ch of inner) {
    if (ch === "(") depth += 1
    if (ch === ")") depth -= 1
    if (ch === "," && depth === 0) {
      out.push(cur.trim())
      cur = ""
    } else cur += ch
  }
  out.push(cur.trim())
  return out.map((d) => d.split(/\s+/)[0]).filter(Boolean)
}

const tables = async () => (await sql(
  "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ? ORDER BY name", [`${ROOT}%`],
)).rows.map((r) => r.name)

const countOf = async (t, where = "", p = []) => Number((await sql(`SELECT COUNT(*) AS n FROM ${t} ${where}`, p)).rows[0]?.n ?? 0)

/** Позвать руку агента ровно так, как её зовёт агент, — через MCP по stdio. */
import { spawnSync } from "node:child_process"
function hand(name, args) {
  const msg = JSON.stringify({ id: 1, jsonrpc: "2.0", method: "tools/call", params: { arguments: args, name } })
  const r = spawnSync("node", ["scripts/agent/memory-tools.mjs"], { encoding: "utf8", input: `${msg}\n` })
  const line = String(r.stdout ?? "").trim().split("\n").pop() ?? ""
  try {
    return JSON.parse(line).result?.content?.[0]?.text ?? `НЕТ ОТВЕТА: ${line.slice(0, 120)}`
  } catch {
    return `НЕ РАЗОБРАН ОТВЕТ: ${String(r.stdout ?? r.stderr).slice(0, 160)}`
  }
}

console.log(MARK)

// ── СНИМОК ДО ───────────────────────────────────────────────────────────────
const cols0 = await columns()
const tabs0 = await tables()
const hist0 = await countOf(`${ROOT}__what_he_told_us_before`)
console.log(`До работы: колонок корня ${cols0.length} · таблиц ${tabs0.length} · строк истории ${hist0}`)
say(!cols0.some((c) => c.startsWith(PREFIX)), `следов прошлых прогонов в корне нет: ${cols0.filter((c) => c.startsWith(PREFIX)).join(", ") || "чисто"}`)

const KIND_A = `${PREFIX}city_where_he_tried_living`
const KIND_B = `${PREFIX}people_he_met_at_the_fair`

// ── 1. НОВЫЙ РОД ────────────────────────────────────────────────────────────
console.log("\n### 1 · новый род — make_new_kind")
console.log(`  ответ: ${hand("make_new_kind", { claim: "said", kind: KIND_A, value: "Мадрид", who: WHO })}`)
const cols1 = await columns()
say(cols1.length - cols0.length === 3, `колонок ${cols0.length} → ${cols1.length} (ожидалось +3: значение, род, основание)`)
say(["", "__claim", "__basis"].every((s) => cols1.includes(KIND_A + s)), `появились ${KIND_A}{,__claim,__basis}`)
const v1 = (await sql(`SELECT ${KIND_A} AS v, ${KIND_A}__claim AS c FROM ${ROOT} WHERE who = ?`, [WHO])).rows[0]
say(v1?.v === "Мадрид" && v1?.c === "said", `в базе: ${JSON.stringify(v1)}`)

// ── 2. ЗАПИСЬ В СУЩЕСТВУЮЩИЙ РОД ────────────────────────────────────────────
console.log("\n### 2 · запись в существующий род — write_value")
console.log(`  ответ: ${hand("write_value", { claim: "said", kind: KIND_B, value: "Дима", who: WHO })}`)
say((await columns()).length === cols1.length, "рода нет — колонок не прибавилось, рука отказала и назвала, чем завести")
console.log(`  ответ: ${hand("make_new_kind", { claim: "said", kind: KIND_B, value: "Дима", who: WHO })}`)
const cols2 = await columns()
say(cols2.length - cols1.length === 3, `второй род: колонок ${cols1.length} → ${cols2.length}`)

// ── 3. ИСПРАВЛЕНИЕ ──────────────────────────────────────────────────────────
console.log("\n### 3 · исправление значения — write_value поверх")
console.log(`  ответ: ${hand("write_value", { claim: "said", kind: KIND_A, value: "Барселона", who: WHO })}`)
const cols3 = await columns()
const hist1 = await countOf(`${ROOT}__what_he_told_us_before`, "WHERE who = ?", [WHO])
const v3 = (await sql(`SELECT ${KIND_A} AS v FROM ${ROOT} WHERE who = ?`, [WHO])).rows[0]
say(cols3.length === cols2.length, `колонок столько же: ${cols3.length} — исправление формы не растит`)
say(v3?.v === "Барселона" && hist1 === 1, `значение «${v3?.v}» · строк истории у ${WHO}: ${hist1} (прежнее не потеряно)`)
const h = (await sql(`SELECT was, became FROM ${ROOT}__what_he_told_us_before WHERE who = ?`, [WHO])).rows[0]
say(h?.was === "Мадрид" && h?.became === "Барселона", `история: «${h?.was}» → «${h?.became}»`)

// ── 4. РОЖДЕНИЕ ТАБЛИЦЫ ─────────────────────────────────────────────────────
console.log("\n### 4 · рождение таблицы — promote_to_list")
const tabsBefore = await tables()
console.log(`  ответ: ${hand("promote_to_list", { claim: "said", kind: KIND_B, value: "Аня", who: WHO, words: "ещё Аня" })}`)
const tabsAfter = await tables()
const child = `${ROOT}__${KIND_B}`
say(tabsAfter.length - tabsBefore.length === 1 && tabsAfter.includes(child), `таблиц ${tabsBefore.length} → ${tabsAfter.length}, родилась ${child}`)
const rows4 = (await sql(`SELECT value, came_from_column, created_at FROM ${child} WHERE who = ? ORDER BY id`, [WHO])).rows
say(rows4.length === 2 && rows4[0].value === "Дима" && rows4[1].value === "Аня", `в таблице: ${rows4.map((r) => r.value).join(", ")}`)
say(rows4[0]?.came_from_column === KIND_B, `у первого видно происхождение: came_from_column = ${rows4[0]?.came_from_column}`)
const left = (await sql(`SELECT ${KIND_B} AS v FROM ${ROOT} WHERE who = ?`, [WHO])).rows[0]
say(left?.v === null || left?.v === undefined, `поле корня очищено: ${JSON.stringify(left?.v ?? null)} — второй правды о роде не осталось`)

// ── 5. ДОПИСАТЬ В СУЩЕСТВУЮЩУЮ ──────────────────────────────────────────────
console.log("\n### 5 · дописать в существующую — та же рука, другой исход")
console.log(`  ответ: ${hand("promote_to_list", { claim: "said", kind: KIND_B, value: "Юля", who: WHO })}`)
const tabs5 = await tables()
const n5 = await countOf(child, "WHERE who = ?", [WHO])
say(tabs5.length === tabsAfter.length, `таблиц столько же: ${tabs5.length} — второй раз таблица не рождается`)
say(n5 === 3, `строк в таблице: ${n5}`)

// ── ОТКАЗЫ ──────────────────────────────────────────────────────────────────
// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ: прибор обязан уметь провалиться. Три заведомо
// неверных вызова должны быть отвергнуты, и состав базы от них не меняется.
console.log("\n### отказы — негативный контроль")
const colsN = await columns()
const r1 = hand("make_new_kind", { kind: "friend_name", value: "кто-то", who: WHO })
say(/ярлык|не меньше четырёх/i.test(r1), `имя из двух слов отвергнуто: «${r1.slice(0, 80)}»`)
const r2 = hand("make_new_kind", { claim: "guess", kind: `${PREFIX}thing_he_probably_likes_now`, value: "чай", who: WHO })
say(/догадка без основания/i.test(r2), `догадка без основания отвергнута: «${r2.slice(0, 60)}»`)
const r3 = hand("make_new_kind", { claim: "said", kind: "probe_193_x; DROP TABLE person_who_owns_this_project", value: "x", who: WHO })
say(/не годится|ярлык/i.test(r3), `имя с SQL внутри отвергнуто: «${r3.slice(0, 70)}»`)
say((await columns()).length === colsN.length, `после трёх отказов колонок столько же: ${colsN.length} — отказ ничего не создал`)
say((await tables()).includes(ROOT), "корень на месте — попытка с DROP TABLE ничего не уронила")

// ── УБОРКА ПО СВОЕЙ МЕТКЕ ───────────────────────────────────────────────────
if (!KEEP) {
  console.log("\n### уборка — только своё")
  await sql(`DELETE FROM ${ROOT} WHERE who = ?`, [WHO])
  await sql(`DELETE FROM ${ROOT}__what_he_told_us_before WHERE who = ?`, [WHO])
  await sql(`DROP TABLE IF EXISTS ${child}`)
  for (const c of (await columns()).filter((x) => x.startsWith(PREFIX))) await sql(`ALTER TABLE ${ROOT} DROP COLUMN ${c}`)
  const cols9 = await columns()
  const tabs9 = await tables()
  const hist9 = await countOf(`${ROOT}__what_he_told_us_before`)
  say(cols9.length === cols0.length, `колонок вернулось к ${cols9.length} (было до работы ${cols0.length})`)
  say(tabs9.length === tabs0.length, `таблиц вернулось к ${tabs9.length} (было ${tabs0.length})`)
  say(hist9 === hist0, `строк истории ${hist9} (было ${hist0}) — чужая история не тронута`)
  say(await countOf(ROOT) >= 6, `людей в корне: ${await countOf(ROOT)} — живые ключи владельца на месте`)
} else console.log("\n  keep: следы прогона оставлены в базе")

console.log(`\n${bad === 0 ? "✓ OK" : `✗ ПРОВАЛ: ${bad}`}`)
console.log(`${MARK}END`)

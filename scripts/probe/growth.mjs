#!/usr/bin/env node
//
// ПРИБОР 175-4 и 175-5 — РОЖДЕНИЕ КОЛОНКИ И РОЖДЕНИЕ СУЩНОСТИ.
//
// Проходит ровно те фразы, которыми владелец описал задачу 2026-09-09:
//   «пользователь предпочитает общаться на русском» → поле
//   «нет, всё-таки на украинском»                   → исправление того же поля
//   «есть друг Миша»                                → нового рода не было, завести
//   «ещё есть друг Дима»                            → ВТОРОЕ значение → таблица
//   «Дима — это на самом деле Денис»                → правка СТРОКИ, не схемы
//
// 🛑 ГЛАВНОЕ, ЧТО ЗДЕСЬ ПРОВЕРЯЕТСЯ, — НЕ «ПОЯВИЛАСЬ ЛИ ТАБЛИЦА», А ЦЕЛО ЛИ
// ПРОИСХОЖДЕНИЕ ПЕРЕЕХАВШЕГО. Повышение, потерявшее род и время первого
// значения, есть переписывание прошлого: «переехало» и «записано заново»
// становятся неразличимы.

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
const MACHINE_ENV = process.env.FRACTERA_MACHINE_ENV ?? "/etc/fractera/secrets.env"
const WHO = "probe-175-5"

function machineEnv(name) {
  try {
    for (const line of readFileSync(MACHINE_ENV, "utf8").split("\n")) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) {
        return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
      }
    }
  } catch { /* вне сервера файла нет — законно */ }
  return ""
}

const SECRET = process.env.DATA_SECRET || machineEnv("DATA_SECRET")
const H = { "Content-Type": "application/json", "x-data-secret": SECRET }
const DATA_URL = process.env.REMOTE_DATA_URL || machineEnv("REMOTE_DATA_URL") || "http://localhost:3300"

let bad = 0
const say = (ok, what, extra = "") => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}${extra ? "  — " + extra : ""}`)
}

async function tell(text) {
  const r = await fetch(`${BASE}/v1/remember`, { body: JSON.stringify({ text, who: WHO }), headers: H, method: "POST" })
  return await r.json().catch(() => null)
}
async function whatIsKnown() {
  const r = await fetch(`${BASE}/v1/recall`, { body: JSON.stringify({ who: WHO }), headers: H, method: "POST" })
  return await r.json().catch(() => null)
}
async function sql(text, params = []) {
  const r = await fetch(`${DATA_URL}/db/migrate`, {
    body: JSON.stringify({ params, sql: text }),
    headers: { "Content-Type": "application/json", "X-Data-Secret": SECRET },
    method: "POST",
  })
  return await r.json().catch(() => null)
}

console.log("=".repeat(72))
console.log("ПРИБОР 175-4 и 175-5 — колонка рождается, сущность рождается")
console.log("=".repeat(72))
console.log("")

// ── 175-4: РОЖДЕНИЕ КОЛОНКИ ──────────────────────────────────────────────────
console.log("── 175-4: нового рода не было ──")
const misha = await tell("у меня есть друг Миша")
const friendKind = (misha?.noted ?? [])[0]?.what
say(Boolean(friendKind), "новый род значения заведён сам", friendKind ?? String(misha?.what_happened).slice(0, 60))
say(
  typeof friendKind === "string" && friendKind.split("_").length >= 3,
  "имя рода — фраза, а не слово",
  friendKind,
)
const k1 = await whatIsKnown()
const mishaRow = (k1?.known ?? []).find((x) => String(x.value).includes("Миша"))
say(Boolean(mishaRow), "Миша читается", mishaRow ? `${mishaRow.what} = ${mishaRow.value}` : "НЕТ")
say(mishaRow?.from_table === "person_who_owns_this_project", "и лежит пока в корне", mishaRow?.from_table)

// ── 175-5: РОЖДЕНИЕ СУЩНОСТИ НА ВТОРОМ ФАКТЕ ─────────────────────────────────
console.log("")
console.log("── 175-5: пришло ВТОРОЕ значение того же рода ──")
const dima = await tell("ещё у меня есть друг Дима")
const grew = (dima?.noted ?? []).find((n) => n.became_table)
say(Boolean(grew), "поле ПОВЫСИЛОСЬ в таблицу", grew?.became_table ?? String(dima?.what_happened).slice(0, 70))
say(
  Boolean(grew) && grew.became_table.startsWith("person_who_owns_this_project__"),
  "имя таблицы — путь от человека вниз",
  grew?.became_table,
)

const k2 = await whatIsKnown()
const friends = (k2?.known ?? []).filter((x) => x.from_table && x.from_table !== "person_who_owns_this_project")
say(friends.length === 2, "в таблице ДВОЕ: и Миша, и Дима", friends.map((f) => f.value).join(" + "))

// 🔒 ГЛАВНАЯ ПРОВЕРКА ВСЕГО ПОДШАГА: ПРОИСХОЖДЕНИЕ ПЕРЕЕХАВШЕГО ЦЕЛО.
const moved = friends.find((f) => f.moved_here)
say(Boolean(moved), "у переехавшего видно, что он ПЕРЕЕХАЛ, а не записан заново", moved?.value)

const rowsRaw = await sql(
  `SELECT value, created_at, came_from_column FROM ${grew?.became_table ?? "x"} WHERE who = ? ORDER BY id`,
  [WHO],
)
const first = (rowsRaw?.rows ?? [])[0]
const second = (rowsRaw?.rows ?? [])[1]
say(
  Boolean(first && second && first.created_at <= second.created_at),
  "время первого значения СОХРАНЕНО, а не подменено временем переезда",
  first ? `${first.value}: ${first.created_at}` : "нет строк",
)

// 🛑 ПОЛЕ ОБЯЗАНО ОПУСТЕТЬ: оставленное, оно стало бы ВТОРОЙ правдой о том же роде.
const rootVal = await sql(`SELECT ${friendKind} AS v FROM person_who_owns_this_project WHERE who = ?`, [WHO])
say(
  (rootVal?.rows ?? [])[0]?.v == null,
  "поле в корне ОПУСТЕЛО — второй правды о том же роде нет",
  String((rootVal?.rows ?? [])[0]?.v ?? "пусто"),
)

// ── ТРЕТИЙ: ПОВЫШАТЬ НЕЧЕГО, ПРОСТО СТРОКА ───────────────────────────────────
console.log("")
console.log("── третий: род уже таблица ──")
await tell("и ещё друг Аня")
const k3 = await whatIsKnown()
const three = (k3?.known ?? []).filter((x) => x.from_table && x.from_table !== "person_who_owns_this_project")
say(three.length === 3, "третье значение легло строкой, новой таблицы не родилось", three.map((f) => f.value).join(" + "))

// ── НЕГАТИВНЫЙ КОНТРОЛЬ: ИСПРАВЛЕНИЕ НЕ ПЛОДИТ СТРОК ─────────────────────────
console.log("")
console.log("── негативные контроли ──")
await tell("я общаюсь на русском")
const beforeLang = await whatIsKnown()
await tell("нет, всё-таки давай на украинском")
const afterLang = await whatIsKnown()
const langRows = (afterLang?.known ?? []).filter((x) => x.what.includes("lang"))
// 🔒 ИСПРАВЛЕНИЕ ОБЯЗАНО ОСТАТЬСЯ ОДНИМ ЗНАЧЕНИЕМ. Прими память его за
// добавление — язык стал бы списком «русский, украинский», и ответить на вопрос
// «на каком языке» стало бы нечем.
say(langRows.length === 1, "НЕГАТИВНЫЙ: исправление НЕ породило таблицу-список", `значений языка: ${langRows.length}`)
say(
  langRows.length === 1 && String(langRows[0].value).toLowerCase().includes("укра"),
  "и победило последнее",
  langRows[0]?.value,
)

const tablesNow = await sql(
  "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'person_who_owns_this_project%'",
)
const langTable = (tablesNow?.rows ?? []).some((t) => String(t.name).includes("lang"))
say(!langTable, "НЕГАТИВНЫЙ: таблицы под язык не появилось", langTable ? "появилась!" : "нет")

// ── УБОРКА ПО СВОЕЙ МЕТКЕ ────────────────────────────────────────────────────
for (const t of (tablesNow?.rows ?? []).map((x) => x.name)) {
  await sql(`DELETE FROM ${t} WHERE who = ?`, [WHO])
}
// 🛑 ТАБЛИЦУ, РОЖДЁННУЮ ПРИБОРОМ, ПРИБОР И УБИРАЕТ — но только если в ней не
// осталось чужих строк. Своя метка убрана выше; таблица без единой строки
// принадлежала только нам.
if (grew?.became_table) {
  const left = await sql(`SELECT COUNT(*) AS n FROM ${grew.became_table}`)
  if ((left?.rows ?? [])[0]?.n === 0) await sql(`DROP TABLE ${grew.became_table}`)
}
console.log("")
console.log(`(убрано по метке who = ${WHO}; чужих строк прибор не трогает)`)

console.log("")
console.log("-".repeat(72))
if (bad === 0) {
  console.log("✓ ВСЁ ЗЕЛЁНОЕ: колонка рождается, сущность рождается на втором факте,")
  console.log("  происхождение переехавшего цело, исправление списка не плодит")
  process.exit(0)
}
console.log(`🛑 ПРОВАЛОВ: ${bad}`)
process.exit(1)

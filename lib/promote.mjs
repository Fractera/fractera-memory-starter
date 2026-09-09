// ПОВЫШЕНИЕ ФОРМЫ: ПОЛЕ СТАНОВИТСЯ ТАБЛИЦЕЙ НА ВТОРОМ ЗНАЧЕНИИ.
//
// 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-09: сущность рождается **на втором факте**,
// реактивно, а не заранее. Заводить таблицу впрок — та самая рекурсия, о которой
// он спросил: «как это правило не превратить в то, чтобы у нас рекурсивно все
// данные бесконечно умножались». Ответ: ничего не создаётся, пока не сказан
// РЕАЛЬНЫЙ второй факт. Бесконечность потребовала бы бесконечной речи.
//
// 🛑 ЛОВУШКА, НАЗВАННАЯ ИМ ЖЕ: ДРУГ — НЕ КОЛОНКА, А СТРОКА. Будь каждый друг
// колонкой, «Дима → Денис» стало бы хирургией схемы: удалить колонку, завести
// колонку. Колонка называется «друзья», Миша и Дима — её значения.
// ✗ Старая память попалась ровно сюда: `person.important-people` было ОДНИМ
// полем, куда текстом клали «Миша — разработчик в команде». Второй друг
// превращал его в кашу, из которой не вынуть ни одного по отдельности.
//
// 🔒 ПЕРЕЛОМ — ЭТО ПОВЫШЕНИЕ, А НЕ ПЕРЕПИСЫВАНИЕ. Первое значение переезжает
// строкой №1 с ТЕМ ЖЕ происхождением: род (`said`/`guess`), основание, время.
// Потеряв их, память перепишет прошлое — а «переехало» и «записано заново»
// станут неразличимы.

import { childOf, ROOT, ROOT_HISTORY } from "./naming.mjs"
import { BASIS_SUFFIX, CLAIM_SUFFIX, columnsOf, sql } from "./store.mjs"

/** Как зовётся таблица, рождённая из поля. Путь от человека вниз. */
export function tableForKind(kind) {
  return childOf(ROOT, kind)
}

/** Есть ли уже таблица под этот род. */
export async function tableExists(name) {
  if (!name) return false
  const r = await sql("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [name])
  return r.ok && r.rows.length > 0
}

/**
 * Форма дочерней таблицы.
 *
 * 🔒 `came_from_column` — НЕ УКРАШЕНИЕ, А ПРОИСХОЖДЕНИЕ. По нему видно, что
 * строка не родилась здесь, а переехала из поля, и когда именно. Без него
 * «переехало» и «записано заново» неразличимы уже через день.
 */
async function ensureChild(name) {
  const made = await sql(
    `CREATE TABLE IF NOT EXISTS ${name} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      who TEXT NOT NULL,
      value TEXT NOT NULL,
      claim TEXT,
      basis TEXT,
      came_from_column TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )`,
  )
  if (!made.ok) return made
  // 🔒 КОЛОНКА — НЕ ТАБЛИЦА. Таблица, созданная раньше, от `CREATE ... IF NOT
  // EXISTS` новых колонок не получит: их привозит только `ALTER`.
  const have = await columnsOf(name)
  for (const [col, type] of [["claim", "TEXT"], ["basis", "TEXT"], ["came_from_column", "TEXT"]]) {
    if (!have.includes(col)) await sql(`ALTER TABLE ${name} ADD COLUMN ${col} ${type}`)
  }
  return { ok: true }
}

/**
 * Повысить род значения из поля в таблицу и положить туда оба значения.
 *
 * Возвращает `{ok, table, moved, added}` либо отказ с причиной.
 */
export async function promote({ basis, claim, kind, newValue, who, words }) {
  const table = tableForKind(kind)
  if (!table) return { error: "unsafe-name", ok: false }

  const ready = await ensureChild(table)
  if (!ready.ok) return ready

  // Забираем прежнее значение ВМЕСТЕ с его происхождением — до того, как
  // очистим поле. Иначе переезд превратится в потерю.
  const cur = await sql(
    `SELECT ${kind} AS v, ${kind}${CLAIM_SUFFIX} AS c, ${kind}${BASIS_SUFFIX} AS b, created_at AS t
     FROM ${ROOT} WHERE who = ?`,
    [who],
  )
  const old = cur.ok && cur.rows.length ? cur.rows[0] : null
  if (!old || !old.v) return { error: "nothing-to-promote", ok: false }

  // 🔒 ПЕРВОЕ ЗНАЧЕНИЕ СТАНОВИТСЯ СТРОКОЙ №1 С ЕГО СОБСТВЕННЫМ ВРЕМЕНЕМ, а не
  // временем переезда: иначе память сообщит, что узнала о Мише сегодня.
  const movedIn = await sql(
    `INSERT INTO ${table} (who, value, claim, basis, came_from_column, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [who, old.v, old.c ?? null, old.b ?? null, kind, old.t ?? new Date().toISOString()],
  )
  if (!movedIn.ok) return movedIn

  const added = await sql(
    `INSERT INTO ${table} (who, value, claim, basis, came_from_column) VALUES (?, ?, ?, ?, ?)`,
    [who, newValue, claim || null, basis || null, null],
  )
  if (!added.ok) return added

  // 🛑 ПОЛЕ ОЧИЩАЕТСЯ, И ЭТО ОБЯЗАТЕЛЬНО. Оставленное, оно стало бы ВТОРОЙ
  // правдой о том же роде — и разошлось бы с таблицей на первой же правке.
  await sql(
    `UPDATE ${ROOT} SET ${kind} = NULL, ${kind}${CLAIM_SUFFIX} = NULL, ${kind}${BASIS_SUFFIX} = NULL WHERE who = ?`,
    [who],
  )

  // Переезд — событие, и оно записывается там же, где правки значений.
  await sql(
    `INSERT INTO ${ROOT_HISTORY} (who, what_changed, was, became, his_words) VALUES (?, ?, ?, ?, ?)`,
    [who, kind, String(old.v), `переехало в отдельную таблицу ${table}`, String(words ?? "").slice(0, 500)],
  )

  return { added: newValue, moved: old.v, ok: true, table }
}

/** Дописать ещё одно значение в уже существующую таблицу рода. */
export async function appendToTable({ basis, claim, kind, value, who }) {
  const table = tableForKind(kind)
  if (!table) return { error: "unsafe-name", ok: false }
  const ready = await ensureChild(table)
  if (!ready.ok) return ready

  // 🔒 ПОВТОР НЕ ЗАДВАИВАЕТСЯ. «Ещё раз про Мишу» — не второй Миша.
  const same = await sql(`SELECT id FROM ${table} WHERE who = ? AND value = ?`, [who, value])
  if (same.ok && same.rows.length) return { already: true, ok: true, table }

  const r = await sql(
    `INSERT INTO ${table} (who, value, claim, basis) VALUES (?, ?, ?, ?)`,
    [who, value, claim || null, basis || null],
  )
  return r.ok ? { added: value, ok: true, table } : r
}

/** Значения рода из его таблицы — для чтения. */
export async function valuesFromTable({ table, who }) {
  const r = await sql(
    `SELECT value, claim, basis, came_from_column, created_at FROM ${table} WHERE who = ? ORDER BY id`,
    [who],
  )
  return r.ok ? r.rows : []
}

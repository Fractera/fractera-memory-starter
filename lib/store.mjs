// ХРАНИЛИЩЕ: единственное место, которое знает про SQL.
//
// 🔒 ЗА ДАННЫМИ ХОДИМ В СЛОЙ ДАННЫХ `:3300`, А НЕ ЗАВОДИМ СВОЮ БАЗУ.
// Федеральный закон: `:3300` — единственная дверь к данным. Отдельность памяти
// нужна **от агента и от приложения бота**, а не от слоя данных; своя база
// завела бы вторую правду о данных владельца.
//
// 🔒 ОТВЕТ ЧУЖОЙ СЛУЖБЫ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ HTTP. Слой данных
// отвечает `200` с `{ok:false}` на отвергнутый SQL — правка «прошла бы» молча.
// Оплачено в проекте дважды.

import { readFileSync } from "node:fs"
import { isSafeName, ROOT, ROOT_HISTORY } from "./naming.mjs"

const MACHINE_ENV = process.env.FRACTERA_MACHINE_ENV ?? "/etc/fractera/secrets.env"

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

const DATA_URL = process.env.REMOTE_DATA_URL || machineEnv("REMOTE_DATA_URL") || "http://localhost:3300"
const DATA_SECRET = process.env.DATA_SECRET || machineEnv("DATA_SECRET") || ""

/** Один запрос к слою данных. Возвращает `{ok, rows}` либо `{ok:false, error}`. */
export async function sql(text, params = []) {
  if (!DATA_SECRET) return { error: "no-data-secret", ok: false }
  let res
  try {
    res = await fetch(`${DATA_URL}/db/migrate`, {
      body: JSON.stringify({ params, sql: text }),
      headers: { "Content-Type": "application/json", "X-Data-Secret": DATA_SECRET },
      method: "POST",
    })
  } catch (e) {
    return { error: "data-unreachable", ok: false, why: String(e.message) }
  }
  if (!res.ok) return { error: `data-http-${res.status}`, ok: false }
  const body = await res.json().catch(() => null)
  if (!body || body.ok === false) {
    return { error: "sql-rejected", ok: false, why: String(body?.error ?? "").slice(0, 200) }
  }
  return { ok: true, rows: body.rows ?? [] }
}

// ── ФОРМА КОРНЯ ──────────────────────────────────────────────────────────────
//
// 🔒 ДВА ОБЯЗАТЕЛЬНЫХ ПОЛЯ И БОЛЬШЕ НИЧЕГО — решение владельца 2026-09-09:
// «наш проект на старте должен иметь единственную таблицу об архитекторе, в
// которой будет всего два обязательных поля: часовой пояс, язык. Всё остальное
// пусть появляется по мере развития проекта».
//
// 🛑 ИМЕНА КОЛОНОК ТОЖЕ ФРАЗЫ, А НЕ СЛОВА. Колонку читает модель ровно так же,
// как имя таблицы: `language` заставило бы гадать (язык интерфейса? язык
// документа?), `language_he_speaks_with_us` — нет.
// 🔒 РОД ЗНАЧЕНИЯ ХРАНИТСЯ РЯДОМ С НИМ, В ПАРНЫХ КОЛОНКАХ `<род>__claim` и
// `<род>__basis`. Замысел владельца 2026-09-09: у ответа есть признак —
// утвердительный или вероятностный.
// 🛑 ВОШЛО В ПЕРВЫЙ ЭТАП, И ДОВОД МЕХАНИЧЕСКИЙ: значения, записанные до
// появления признака, остались бы без рода НАВСЕГДА — задним числом не
// восстановить.
// 🔒 ПУСТОЕ ЗНАЧИТ «РОД НЕ НАЗВАН», А НЕ «СКАЗАНО ЧЕЛОВЕКОМ»: уверенное
// умолчание дороже отсутствующего значения.
export const CLAIM_SUFFIX = "__claim"
export const BASIS_SUFFIX = "__basis"

/** Роды, которые память различает. Третьего у ЗНАЧЕНИЯ нет. */
export const CLAIM = { GUESS: "guess", SAID: "said" }

export const REQUIRED_COLUMNS = {
  language_he_speaks_with_us: "язык, на котором человек разговаривает с нами",
  time_zone_he_lives_in: "часовой пояс, в котором человек живёт",
}

/**
 * 🔒 ФОРМА СОЗДАЁТСЯ ОДНИМ ВЫРАЖЕНИЕМ, И ОНО ЖИВЁТ РЯДОМ С ЛЕСТНИЦЕЙ ПРАВОК.
 * ✗ Оплачено шагами 144–146: три формы таблиц несли невалидный SQL, `CREATE`
 * отвергался целиком, а снаружи было зелено — таблицы существовали лишь потому,
 * что их создавали приборы своим SQL. Код создания не отработал НИ РАЗУ.
 * Отсюда: создание и проверка формы — один путь, и он же исполняется в проверке.
 */
export async function ensureRoot() {
  const cols = Object.keys(REQUIRED_COLUMNS)
    .map((c) => `      ${c} TEXT`)
    .join(",\n")
  const create = await sql(
    `CREATE TABLE IF NOT EXISTS ${ROOT} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      who TEXT NOT NULL UNIQUE,
${cols},
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )`,
  )
  if (!create.ok) return create

  // 🔒 КОЛОНКА — НЕ ТАБЛИЦА. `CREATE TABLE IF NOT EXISTS` там, где таблица уже
  // есть, не делает НИЧЕГО: колонка, добавленная после рождения таблицы, придёт
  // только `ALTER`-ом. Оплачено в проекте трижды.
  const have = await columnsOf(ROOT)
  for (const c of Object.keys(REQUIRED_COLUMNS)) {
    if (!have.includes(c)) await sql(`ALTER TABLE ${ROOT} ADD COLUMN ${c} TEXT`)
    if (!have.includes(c + CLAIM_SUFFIX)) await sql(`ALTER TABLE ${ROOT} ADD COLUMN ${c}${CLAIM_SUFFIX} TEXT`)
    if (!have.includes(c + BASIS_SUFFIX)) await sql(`ALTER TABLE ${ROOT} ADD COLUMN ${c}${BASIS_SUFFIX} TEXT`)
  }

  const hist = await sql(
    `CREATE TABLE IF NOT EXISTS ${ROOT_HISTORY} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      who TEXT NOT NULL,
      what_changed TEXT NOT NULL,
      was TEXT,
      became TEXT,
      his_words TEXT,
      changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )`,
  )
  return hist.ok ? { ok: true } : hist
}

/**
 * Какие колонки есть у таблицы сейчас. Пустой список — таблицы нет.
 *
 * 🛑 `PRAGMA table_info(...)` ЧЕРЕЗ ДВЕРЬ СЛОЯ ДАННЫХ ВОЗВРАЩАЕТ `{"ok":true}`
 * БЕЗ СТРОК — ПРИТВОРЯЕТСЯ УСПЕХОМ. Работает табличная функция
 * `SELECT name FROM pragma_table_info('…')`, и разница измерена, а не угадана.
 *
 * ✗ ЧЕМ ОПЛАЧЕНО, ЖИВЫМ ПРОГОНОМ 175-2: список колонок приходил ПУСТЫМ, поэтому
 * каждый род значения выглядел новым, `ALTER` бился о существующую колонку и
 * падал — а наружу уходило бодрое «записывать было нечего». Три захода отладки.
 * 🔒 И ЗАКОН «ОТВЕТ ЧУЖОЙ СЛУЖБЫ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ HTTP» ЗДЕСЬ
 * НЕДОСТАТОЧЕН: тело тоже говорило `ok:true`. **Проверять надо, что строки
 * ПРИШЛИ** — «успех» и «результат» разные утверждения.
 */
export async function columnsOf(table) {
  if (!isSafeName(table)) return []
  const r = await sql("SELECT name FROM pragma_table_info(?)", [table])
  return r.ok ? r.rows.map((x) => x.name).filter(Boolean) : []
}

/**
 * 🔒 СТОРОЖ ТОЙ ЖЕ ЛОВУШКИ: таблица есть, а колонок не видно — это ДЕФЕКТ ЧТЕНИЯ,
 * а не пустая таблица. Без него следующая смена двери снова даст молчаливый
 * пустой список, и мы снова будем искать три захода.
 */
export async function columnsOfChecked(table) {
  const cols = await columnsOf(table)
  if (cols.length > 0) return { columns: cols, ok: true }
  const exists = await sql("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [table])
  const there = exists.ok && exists.rows.length > 0
  if (!there) return { columns: [], ok: true }
  return { columns: [], error: "columns-unreadable", ok: false }
}

/** Список наших таблиц — тех, что начинаются с корня. */
export async function ourTables() {
  const r = await sql(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE ? ORDER BY name",
    [`${ROOT}%`],
  )
  return r.ok ? r.rows.map((x) => x.name).filter(Boolean) : []
}

/**
 * Завести новую колонку — новый род значения.
 * 🔒 ИМЯ ПРОВЕРЯЕТСЯ ПЕРЕД `ALTER`, А НЕ ПОСЛЕ. Оно пришло из речи человека
 * через модель; это единственная граница между именем и SQL.
 */
export async function addColumn(table, column) {
  if (!isSafeName(table) || !isSafeName(column)) {
    return { error: "unsafe-name", ok: false }
  }
  const have = await columnsOf(table)
  if (have.includes(column)) return { already: true, ok: true }
  // 🔒 РОД ЗАВОДИТСЯ ВМЕСТЕ СО ЗНАЧЕНИЕМ, А НЕ ПОТОМ. Колонка без пары —
  // значение, у которого рода не будет уже никогда.
  const made = await sql(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT`)
  if (!made.ok) return made
  await sql(`ALTER TABLE ${table} ADD COLUMN ${column}${CLAIM_SUFFIX} TEXT`)
  await sql(`ALTER TABLE ${table} ADD COLUMN ${column}${BASIS_SUFFIX} TEXT`)
  return made
}

/** Строка человека, заводится при первом обращении. */
export async function rowOf(who) {
  await sql(`INSERT OR IGNORE INTO ${ROOT} (who) VALUES (?)`, [who])
  const r = await sql(`SELECT * FROM ${ROOT} WHERE who = ?`, [who])
  return r.ok && r.rows.length ? r.rows[0] : null
}

import { sql } from "./store.mjs"

// ТАБЛИЦА СООБЩЕНИЙ ПАМЯТИ И ДВА УКАЗАТЕЛЯ (194-1).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13: «Создаём таблицу стандартную, которая у нас будет
// для сообщений». Имя `messages_that_came_into_memory` выбрал он сам: имя вечное,
// на нём повиснут пути.
//
// 🔒 ОДНА СТРОКА — ОДНО ВХОДЯЩЕЕ: фраза, файл или вопрос. Саммари живёт здесь,
// полное описание — рядом с файлом в объектном хранилище, и второй копии нет:
// две правды об одном объекте разошлись бы на первой правке.
//
// 🔒 СВЯЗИ С ПРЕДЫДУЩИМИ СООБЩЕНИЯМИ И С РЕЕСТРОМ — ТОНКИЕ ТАБЛИЦЫ, А НЕ МАССИВ В
// СТРОКЕ. Владелец назвал массив; закон службы 3600 (шаг 145) говорит, почему нет:
// список внутри строки нельзя проиндексировать, он врёт при удалении и отвечает на
// один вопрос из двух. Указатель отвечает на оба: «с чем связано сообщение 12» и
// «какие сообщения ссылались на 7».
//
// 🛑 КОЛОНКА — НЕ ТАБЛИЦА. `CREATE TABLE IF NOT EXISTS` у существующей таблицы не
// делает ничего; колонка, добавленная позже, идёт в `LATE_COLUMNS` и приезжает
// лестницей `ALTER` из `ensureMessages()` — оплачено в проекте трижды.
// 🛑 ТАБЛИЦУ СОЗДАЁТ ЭТОТ КОД, А НЕ ПРИБОР (закон 144): прибор, создающий свою
// среду, прячет дефекты кода, который эту среду обязан создавать.

export const MESSAGES = "messages_that_came_into_memory"
export const LINKS = `${MESSAGES}__links`
export const REGISTRY = `${MESSAGES}__registry`

/** Направление: запрос на добавление, на извлечение или ни то ни другое (null). */
export const DIRECTION = { RECALL: "recall", REMEMBER: "remember" }

/** Род входящего. Новый род добавляется сюда и в `CHECK` лестницей не приедет — только новой формой. */
export const KINDS = ["text", "audio", "image", "video", "pdf", "document"]

/** Состояние строки: описано моделью · сохранено целиком · сорвалось. */
export const STATUS = { DESCRIBED: "described", FAILED: "failed", SAVED: "saved" }

/**
 * Откуда известны место и время (слово владельца 2026-09-13: «забыли поля, связанные с календарём и
 * геометками»). Сказано человеком · из самого файла · с устройства · выведено. Имена `scope_*` повторяют
 * договор памяти `scope: { at, lat, lon, radius_m }`, чтобы одно понятие не звалось двумя словами.
 * 🔒 `scope_at` — КОГДА ПРОИЗОШЛО то, о чём объект; `created_at` — когда он пришёл. Это разные вопросы.
 * 🔒 ПУСТОЙ ОХВАТ ЗНАЧИТ «НЕ ЗНАЮ ГДЕ», А НЕ «ВЕЗДЕ» (закон 141).
 */
export const SCOPE_SOURCES = ["said", "exif", "device", "guess"]

const list = (xs) => xs.map((x) => `'${x}'`).join(", ")

/**
 * Колонки, пришедшие после рождения таблицы: `имя тип`.
 * Сегодня пусто — форма родилась целиком в 194-1.
 */
export const LATE_COLUMNS = []

const MESSAGES_SQL = `CREATE TABLE IF NOT EXISTS ${MESSAGES} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      direction TEXT CHECK (direction IS NULL OR direction IN (${list(Object.values(DIRECTION))})),
      kind TEXT NOT NULL CHECK (kind IN (${list(KINDS)})),
      title TEXT,
      tags TEXT,
      summary TEXT,
      object_id TEXT,
      vector_id TEXT,
      rag_source TEXT,
      who TEXT,
      source TEXT,
      mime TEXT,
      size_bytes INTEGER,
      status TEXT NOT NULL CHECK (status IN (${list(Object.values(STATUS))})),
      error TEXT,
      described_by TEXT,
      describe_ms INTEGER,
      language TEXT,
      full_chars INTEGER,
      scope_at TEXT,
      scope_lat REAL,
      scope_lon REAL,
      scope_radius_m INTEGER,
      scope_place TEXT,
      scope_source TEXT CHECK (scope_source IS NULL OR scope_source IN (${list(SCOPE_SOURCES)})),
      event_starts_at TEXT,
      event_ends_at TEXT,
      event_time_zone TEXT,
      event_all_day INTEGER,
      event_repeats TEXT,
      remind_at TEXT
    )`

const LINKS_SQL = `CREATE TABLE IF NOT EXISTS ${LINKS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      previous_message_id INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )`

// Форма указателя та же, что `automation_facts` службы 3600: ключ признака, куда
// легло значение и какая строка. Значений указатель не хранит — вторая правда.
const REGISTRY_SQL = `CREATE TABLE IF NOT EXISTS ${REGISTRY} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      fact_key TEXT NOT NULL,
      table_name TEXT,
      row_id INTEGER,
      created_at TEXT NOT NULL
    )`

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS ${MESSAGES}_who ON ${MESSAGES} (who, id)`,
  `CREATE INDEX IF NOT EXISTS ${MESSAGES}_place ON ${MESSAGES} (scope_lat, scope_lon)`,
  `CREATE INDEX IF NOT EXISTS ${MESSAGES}_event ON ${MESSAGES} (event_starts_at)`,
  `CREATE INDEX IF NOT EXISTS ${LINKS}_message ON ${LINKS} (message_id)`,
  `CREATE INDEX IF NOT EXISTS ${LINKS}_previous ON ${LINKS} (previous_message_id)`,
  `CREATE INDEX IF NOT EXISTS ${REGISTRY}_message ON ${REGISTRY} (message_id)`,
  `CREATE INDEX IF NOT EXISTS ${REGISTRY}_key ON ${REGISTRY} (fact_key, id)`,
]

/**
 * Какие колонки есть у таблицы сейчас. Пустой список — таблицы нет.
 * 🛑 `PRAGMA table_info` через дверь слоя данных отдаёт пусто; работает табличная функция.
 */
export async function columnsOf(table) {
  const r = await sql(`SELECT name FROM pragma_table_info('${table}')`)
  return r.ok ? (r.rows ?? []).map((x) => x.name) : []
}

/**
 * Завести таблицу сообщений и оба указателя, провести по лестнице.
 *
 * 🔒 ОТВЕТ ЧИТАЕТСЯ ЦЕЛИКОМ (закон 161): слой данных отвечает `200` с `{ok:false}`
 * на отвергнутый SQL, и первый же отказ возвращается наружу со своим текстом.
 */
export async function ensureMessages() {
  for (const statement of [MESSAGES_SQL, LINKS_SQL, REGISTRY_SQL, ...INDEXES]) {
    const r = await sql(statement)
    if (!r.ok) return { error: r.error ?? "sql-refused", ok: false, statement: statement.slice(0, 80) }
  }
  const have = await columnsOf(MESSAGES)
  for (const column of LATE_COLUMNS) {
    const name = column.split(/\s+/)[0]
    if (have.includes(name)) continue
    const r = await sql(`ALTER TABLE ${MESSAGES} ADD COLUMN ${column}`)
    if (!r.ok) return { error: r.error ?? "alter-refused", ok: false, statement: column }
  }
  return { ok: true }
}

/** Время строки пишем мы, до секунд: умолчание базы не различит два входящих внутри секунды по порядку. */
export const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z")

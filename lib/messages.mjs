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
// 🔒 С 194-10 РОДОВ ДЕВЯТЬ: `markdown`, `html` и `code` различаются так же, как `pdf` (слово владельца о
// равенстве форматов). Число правится вместе с перечислением.
// 🔒 С 195-2 РОДОВ ДЕСЯТЬ: `web` — ссылка, открытая настоящим браузером. Слово владельца (паспорт §20.6): «то что мы сохраняем
// ссылке это тоже самое объект… просто источник объекта ссылка»; раскладка по хранилищам — та же, что у объекта.
export const KINDS = ["text", "markdown", "html", "code", "audio", "image", "video", "pdf", "document", "web"]

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
export const LATE_COLUMNS = [
  // 194-13: кто прислал объект — email архитектора на стенде, имя человека в Telegram, `who` договора в API.
  // Слово владельца: «должен быть написан реальный источник например Telegram от Рома Амстер».
  "author TEXT",
  // 195-2: адрес ссылки — ссылка ложится тем же приёмом, что объект, и её адрес живёт рядом с родом `web`. По нему же ловится
  // повтор (паспорт §20.6 ②: «по умолчанию… ничего не делаем возвращаем то ответ который уже существуют»).
  "url TEXT",
]

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
  // 🛑 `CHECK` НЕ МЕНЯЕТСЯ `ALTER`-ОМ, ПОЭТОМУ НОВЫЙ РОД ПРИХОДИТ НОВОЙ ФОРМОЙ (194-10) — ПЕРЕСБОРКОЙ БЕЗ
  // ПОТЕРЬ. ✗ первая редакция пересоздавала только пустую таблицу и отказывала при строках: владелец уже
  // сохранял объекты с экрана, и после доставки не прошло бы ни одно сохранение.
  // Порядок: новая форма под временным именем → перенос поимённо → сверка счёта → удаление старой →
  // переименование. Счёт разошёлся — старая не трогается. Обрыв между удалением и переименованием оставит
  // данные во временной таблице, и её имя названо в ответе.
  const existing = await sql(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`, [MESSAGES])
  const shape = String(existing.rows?.[0]?.sql ?? "")
  if (shape && !KINDS.every((k) => shape.includes(`'${k}'`))) {
    const TMP = `${MESSAGES}__rebuild`
    const cols = await columnsOf(MESSAGES)
    const fresh = await columnsOf(TMP)
    if (fresh.length) return { error: `rebuild-leftover: таблица ${TMP} уже есть — прежняя пересборка оборвалась`, ok: false }
    const created = await sql(MESSAGES_SQL.replace(`CREATE TABLE IF NOT EXISTS ${MESSAGES} (`, `CREATE TABLE ${TMP} (`))
    if (!created.ok) return { error: created.error ?? "rebuild-create-refused", ok: false, statement: "CREATE rebuild" }
    // 🔒 ПОЗДНИЕ КОЛОНКИ ДОБАВЛЯЮТСЯ ВО ВРЕМЕННУЮ ТАБЛИЦУ ДО ПЕРЕНОСА (195-2). ✗ Найдено чтением: перенос брал только колонки
    // исходной формы, и поздняя `author` (194-13) после пересборки вернулась бы лестницей ПУСТОЙ — у всех строк пропало бы, кто
    // их прислал. Колонки переносятся по фактическому составу обеих таблиц, а не по тексту формы.
    for (const column of LATE_COLUMNS) {
      const late = await sql(`ALTER TABLE ${TMP} ADD COLUMN ${column}`)
      if (!late.ok) {
        await sql(`DROP TABLE IF EXISTS ${TMP}`)
        return { error: `rebuild-late-column-refused: ${column}; старая таблица не тронута`, ok: false }
      }
    }
    const tmpCols = await columnsOf(TMP)
    const shared = cols.filter((c) => tmpCols.includes(c))
    const moved = await sql(`INSERT INTO ${TMP} (${shared.join(", ")}) SELECT ${shared.join(", ")} FROM ${MESSAGES}`)
    const before = Number((await sql(`SELECT COUNT(*) AS n FROM ${MESSAGES}`)).rows?.[0]?.n ?? -1)
    const after = Number((await sql(`SELECT COUNT(*) AS n FROM ${TMP}`)).rows?.[0]?.n ?? -2)
    if (!moved.ok || before !== after) {
      await sql(`DROP TABLE IF EXISTS ${TMP}`)
      return { error: `rebuild-count-mismatch: было ${before}, перенесено ${after}; старая таблица не тронута`, ok: false }
    }
    const dropped = await sql(`DROP TABLE ${MESSAGES}`)
    if (!dropped.ok) return { error: `rebuild-drop-refused: данные целы в обеих таблицах (${TMP})`, ok: false }
    const renamed = await sql(`ALTER TABLE ${TMP} RENAME TO ${MESSAGES}`)
    if (!renamed.ok) return { error: `rebuild-rename-refused: данные в ${TMP}`, ok: false }
  }
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

/** Колонки, которые пишет `insertMessage`, — поимённо (закон 144: `INSERT` без списка колонок запрещён). */
const WRITABLE = [
  "created_at", "direction", "kind", "title", "tags", "summary", "object_id", "vector_id", "rag_source",
  "who", "source", "mime", "size_bytes", "status", "error", "described_by", "describe_ms", "language",
  "full_chars", "scope_at", "scope_lat", "scope_lon", "scope_radius_m", "scope_place", "scope_source",
  "event_starts_at", "event_ends_at", "event_time_zone", "event_all_day", "event_repeats", "remind_at",
  "author", "url",
]

/**
 * Записать одно входящее (194-4). Массивы (`tags`) уезжают JSON-строкой.
 *
 * 🔒 НОМЕР СТРОКИ БЕРЁТСЯ ИЗ ОТВЕТА ТОЙ ЖЕ ВСТАВКИ, А НЕ ВТОРЫМ ЗАПРОСОМ: `last_insert_rowid()` отдельным
 * вызовом вернул бы номер чужой вставки, случившейся между двумя запросами.
 * @returns {Promise<{ok:true, id:number} | {ok:false, error:string}>}
 */
export async function insertMessage(row) {
  const ensured = await ensureMessages()
  if (!ensured.ok) return { error: `ensure: ${ensured.error}`, ok: false }
  const values = { created_at: nowIso(), ...row }
  if (Array.isArray(values.tags)) values.tags = JSON.stringify(values.tags)
  const cols = WRITABLE.filter((c) => values[c] !== undefined)
  const r = await sql(
    `INSERT INTO ${MESSAGES} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
    cols.map((c) => values[c]),
  )
  if (!r.ok || !Number(r.lastInsertRowid)) return { error: r.error ?? "no-row-id", ok: false }
  return { id: Number(r.lastInsertRowid), ok: true }
}

/**
 * Последняя строка про объект (194-9): поиск находит ОБЪЕКТ, а экран показывает, что про него легло.
 * 🔒 ПОСЛЕДНЯЯ ПО `id`, А НЕ ПО ВРЕМЕНИ: время печатается до секунд, две записи внутри секунды совпали бы.
 * 🔒 `null` — ЗАКОННЫЙ ОТВЕТ: объект мог лечь до появления таблицы сообщений (демо-корпус 192).
 */
export async function getMessageByObject(objectId) {
  const ensured = await ensureMessages()
  if (!ensured.ok) return null
  const r = await sql(
    `SELECT id, ${WRITABLE.join(", ")} FROM ${MESSAGES} WHERE object_id = ? ORDER BY id DESC LIMIT 1`,
    [String(objectId)],
  )
  return r.ok ? (r.rows?.[0] ?? null) : null
}

/** Одна строка по номеру — поимённо, без `SELECT *` (закон 144). */
export async function getMessage(id) {
  // 🔒 ЛЕСТНИЦА ЗОВЁТСЯ И ЗДЕСЬ (195-2): чтение поимённо упадёт целиком на колонке `url`, которой ещё нет, если после доставки
  // первым пришло чтение, а не запись. Закон 143: «колонка добавляется четырьмя правками — и вызов лестницы у каждого, кто читает».
  const ensured = await ensureMessages()
  if (!ensured.ok) return null
  const r = await sql(`SELECT id, ${WRITABLE.join(", ")} FROM ${MESSAGES} WHERE id = ?`, [Number(id)])
  return r.ok ? (r.rows?.[0] ?? null) : null
}

/**
 * Последняя СОХРАНЁННАЯ строка с этим адресом (195-2).
 * 🔒 ПОВТОРНАЯ ССЫЛКА ПО УМОЛЧАНИЮ — «НИЧЕГО НЕ ДЕЛАЕМ, ВОЗВРАЩАЕМ ТО, ЧТО УЖЕ ЕСТЬ» (паспорт §20.6 ②). Сорвавшаяся попытка
 * (`failed`) повтором не считается: ей нечего вернуть.
 * 🛑 АДРЕС СРАВНИВАЕТСЯ БУКВАЛЬНО: `https://example.com` и `https://example.com/` — разные строки. Нормализация — отдельное решение.
 */
/**
 * Связать две записи памяти (195-4): например ролик и его обложку.
 *
 * ✗ ТАБЛИЦА СВЯЗЕЙ ЖИЛА С 194-1 БЕЗ ЕДИНОГО ПИСАТЕЛЯ — способность, написанная и не подключённая, снаружи неотличима от отсутствующей
 * (закон 143). Найдено при поиске «кто её зовёт», а не грепом по имени.
 * 🔒 СВЯЗЬ НАПРАВЛЕННАЯ И НЕ САМА С СОБОЙ: `message_id` — новая запись, `previous_message_id` — та, к которой она относится.
 * @returns {Promise<{ok:true, id:number} | {ok:false, error:string}>}
 */
export async function linkMessages(messageId, previousMessageId) {
  const a = Number(messageId)
  const b = Number(previousMessageId)
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) return { error: "bad-ids", ok: false }
  if (a === b) return { error: "self-link", ok: false }
  const ensured = await ensureMessages()
  if (!ensured.ok) return { error: `ensure: ${ensured.error}`, ok: false }
  const r = await sql(
    `INSERT INTO ${LINKS} (message_id, previous_message_id, created_at) VALUES (?, ?, ?)`,
    [a, b, nowIso()],
  )
  if (!r.ok || !Number(r.lastInsertRowid)) return { error: r.error ?? "no-row-id", ok: false }
  return { id: Number(r.lastInsertRowid), ok: true }
}

/** Связи записи в обе стороны (195-4): к чему она относится и что относится к ней. */
export async function linksOf(messageId) {
  const ensured = await ensureMessages()
  if (!ensured.ok) return []
  const r = await sql(
    `SELECT id, message_id, previous_message_id, created_at FROM ${LINKS} WHERE message_id = ? OR previous_message_id = ? ORDER BY id`,
    [Number(messageId), Number(messageId)],
  )
  return r.ok ? (r.rows ?? []) : []
}

/**
 * Какие объекты этого рода СОХРАНЕНЫ (195-8): поиск ссылок оставляет из кандидатов склада только их.
 * 🔒 РОД ЖИВЁТ В ТАБЛИЦЕ, А НЕ В КАРТОЧКЕ ПОИСКА: у ссылки и объекта одна коллекция векторов, и отличить их можно только строкой.
 * @returns {Promise<Set<string>>}
 */
export async function objectIdsOfKind(kind) {
  const ensured = await ensureMessages()
  if (!ensured.ok) return new Set()
  const r = await sql(
    `SELECT object_id FROM ${MESSAGES} WHERE kind = ? AND status = 'saved' AND object_id IS NOT NULL`,
    [String(kind)],
  )
  return new Set(r.ok ? (r.rows ?? []).map((x) => String(x.object_id)) : [])
}

export async function getSavedByUrl(url) {
  const ensured = await ensureMessages()
  if (!ensured.ok) return null
  const r = await sql(
    `SELECT id, ${WRITABLE.join(", ")} FROM ${MESSAGES} WHERE url = ? AND status = 'saved' ORDER BY id DESC LIMIT 1`,
    [String(url)],
  )
  return r.ok ? (r.rows?.[0] ?? null) : null
}

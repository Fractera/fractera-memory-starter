import { sql } from "./store.mjs"
import { LEGACY, SEP } from "./source.mjs"

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
// 🔒 С 207-4 НАПРАВЛЕНИЙ ТРИ: сказать · спросить · ПРОКОММЕНТИРОВАТЬ ответ. Третье — вход, которого
// у памяти не было вовсе: приглашение поправить ответ было сказано словами, а двери не существовало
// (долг шага 206). Число правится вместе с перечислением.
// 🛑 `CHECK` НЕ МЕНЯЕТСЯ `ALTER`-ОМ: новое направление приезжает ПЕРЕСБОРКОЙ формы — тем же путём,
// что новый род (194-10), и по тому же признаку устаревшей формы в `ensureMessages`.
// 🔒 С 219-1 НАПРАВЛЕНИЙ ЧЕТЫРЕ, И ЧЕТВЁРТОЕ — ЕДИНСТВЕННОЕ ИСХОДЯЩЕЕ. ✗ Измерено 2026-09-17 по
// вопросу владельца: таблица хранила ТОЛЬКО входящие (`feedback=15 · recall=14 · remember=18`), то
// есть ответа памяти не существовало как вещи, а `ans_N` был номером ВОПРОСА. Разобрать жалобу на
// ответ было нечем, и досье вынуждено было угадывать.
// 🛑 `CHECK` НЕ МЕНЯЕТСЯ `ALTER`-ОМ: новое направление приезжает ПЕРЕСБОРКОЙ формы — тем же путём,
// что `feedback` в 207-4. Число правится вместе с перечислением.
export const DIRECTION = { ANSWER: "answer", FEEDBACK: "feedback", RECALL: "recall", REMEMBER: "remember" }

/** Род входящего. Новый род добавляется сюда и в `CHECK` лестницей не приедет — только новой формой. */
// 🔒 С 194-10 РОДОВ ДЕВЯТЬ: `markdown`, `html` и `code` различаются так же, как `pdf` (слово владельца о
// равенстве форматов). Число правится вместе с перечислением.
// 🪦 С 195-2 РОДОВ ДЕСЯТЬ: `web` — ссылка, открытая настоящим браузером. Слово владельца (замысел службы): «то что мы сохраняем
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
/**
 * Поздние колонки таблицы связей (218-10): ПОЧЕМУ два сообщения связаны и НАСКОЛЬКО близко.
 *
 * 🔒 ПРИЧИНА ХРАНИТСЯ, А НЕ ВЫВОДИТСЯ ЗАНОВО: «по смыслу» и «по времени» — разные утверждения о разговоре.
 * Первое говорит «об одном и том же», второе — «сказано подряд». Без колонки связь читалась бы как факт
 * без основания, и через неделю её нельзя было бы ни проверить, ни оспорить.
 * 🔒 ТЕ ЖЕ ЗАКОНЫ, ЧТО У ТАБЛИЦЫ СООБЩЕНИЙ: колонка — не таблица, лестница идёт после `CREATE`.
 */
export const LINK_LATE_COLUMNS = ["reason TEXT", "score REAL"]

export const LATE_COLUMNS = [
  // 194-13: кто прислал объект — email архитектора на стенде, имя человека в Telegram, `who` договора в API.
  // Слово владельца: «должен быть написан реальный источник например Telegram от Рома Амстер».
  "author TEXT",
  // 195-2: адрес ссылки — ссылка ложится тем же приёмом, что объект, и её адрес живёт рядом с родом `web`. По нему же ловится
  // повтор (замысел службы).
  "url TEXT",
  // 207-2: путь источника — какая служба и какая её подчинённая сущность прислала сообщение
  // (`chat/telegram-bot/roma-armstrong`). Решение владельца 2026-09-16: колонка отвечает не «какой
  // человек сказал» — человек тут всегда один, — а «откуда пришло». Разбор и запреты — `lib/source.mjs`.
  "source_path TEXT",
  // 207-2: чем предъявился зовущий — секретом машины или ключом памяти. Отдельно от пути потому,
  // что путь называет СЕБЯ сам, а это измеренный факт. Связать одно с другим сегодня нельзя:
  // секрет машины общий на все службы (причина — в `lib/source.mjs`).
  "source_auth TEXT",
  // 218-19: род КОММЕНТАРИЯ — `improve` (правка памяти) или `beyond` (заявка на другое решение).
  // 🔒 Отдельно от колонки `kind`: та говорит, ЧЕМ пришло сообщение (текст, pdf, ссылка), а эта —
  // ЧЕГО человек хочет своим комментарием. Одна колонка на оба вопроса отвечала бы неверно на любой.
  // 🛑 ПУСТО ЗНАЧИТ «РОД НЕ НАЗВАН», А НЕ «improve»: модель могла не ответить, и уверенное умолчание
  // отправило бы заявку в стопку пожеланий молча (закон 144).
  "feedback_kind TEXT",
  // 218-21: ЧТО ЧЕЛОВЕК РЕШИЛ ПО ЭТОМУ КОММЕНТАРИЮ — `task:<имя заявки>` или `declined`.
  // 🎯 Слово владельца 2026-09-17: «если я перегружаю, то всё возвращается в исходное состояние. А это
  // значит ничего не работает». Так и было: экран собирал сигналы заново, потому что решение человека
  // нигде не хранилось.
  // 🔒 ХРАНИТСЯ НЕ ФЛАГ, А СЛЕД: у одобренного стоит ИМЯ заявки, в которую он уехал. Флаг «обработано»
  // отвечал бы «да» и молчал о том, где теперь искать работу.
  "feedback_done TEXT",
  // 219-1: обстоятельства ОТВЕТА — на какой ступени он добыт, сколько занял и звалась ли модель.
  // 🔒 Рядом со строкой ответа, а не в журнале: журнал это файл, он обрезает и ротацией стирается, а
  // по этим трём полям видно, дорого ли достался ответ, на который человек потом пожаловался.
  "answer_depth INTEGER",
  "answer_ms INTEGER",
  "answer_model TEXT",
  // 219-3: ХОД МЫСЛЕЙ ОТВЕТА — тот самый `chain`, который сегодня уходит наружу и исчезает.
  // 🔒 Рядом со строкой, а не в файле-журнале: журнал обрезает до 600 знаков и стирается ротацией, а
  // разбирать жалобу на ответ без того, что память тогда делала, — это гадание.
  // 🛑 JSON-строкой, как `tags`: у шагов нет своих вопросов, к ним обращаются целиком, и отдельная
  // таблица завела бы вторую сущность там, где хватает поля.
  "answer_chain TEXT",
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
  // 207-2: по источнику отвечают на вопрос «кто мне писал» — группировкой, а не отдельной таблицей.
  `CREATE INDEX IF NOT EXISTS ${MESSAGES}_source_path ON ${MESSAGES} (source_path, id)`,
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
// 🔒 ЛЕСТНИЦА ПРОХОДИТСЯ ОДИН РАЗ ЗА ЖИЗНЬ ПРОЦЕССА, А НЕ НА КАЖДУЮ ЗАПИСЬ (211-6).
//
// ✗ НАЙДЕНО ЖИВЫМ ЗАМЕРОМ ПОСЛЕ ПРОГОНА ВЛАДЕЛЬЦА: ответ «где ты сейчас» — первая ступень, ни базы,
// ни модели — занимал 4,8 с. Платили не за ответ:  делает ТРИНАДЦАТЬ обращений к
// слою данных (проверка формы, три создания, семь индексов, состав колонок, заполнение), и звалась
// она при каждой записи и каждом чтении.
//
// 🔒 ПОЧЕМУ ЭТО БЕЗОПАСНО: форма таблицы не меняется под работающим процессом — её меняет ДОСТАВКА,
// а доставка перезапускает процесс. Кэшируется только УСПЕХ: отказ обязан быть повторён, иначе
// временная недоступность склада запомнилась бы навсегда.
// 🛑 И ЭТО НЕ ОТМЕНЯЕТ ЗАКОН «КОЛОНКА — НЕ ТАБЛИЦА»: лестница по-прежнему исполняется обоими путями,
// просто один раз за запуск, а не двадцать раз в минуту.
let ladderDone = null

export async function ensureMessages() {
  if (ladderDone) return ladderDone
  const run = ensureMessagesOnce()
  const result = await run
  if (result.ok) ladderDone = Promise.resolve(result)
  return result
}

async function ensureMessagesOnce() {
  // 🛑 `CHECK` НЕ МЕНЯЕТСЯ `ALTER`-ОМ, ПОЭТОМУ НОВЫЙ РОД ПРИХОДИТ НОВОЙ ФОРМОЙ (194-10) — ПЕРЕСБОРКОЙ БЕЗ
  // ПОТЕРЬ. ✗ первая редакция пересоздавала только пустую таблицу и отказывала при строках: владелец уже
  // сохранял объекты с экрана, и после доставки не прошло бы ни одно сохранение.
  // Порядок: новая форма под временным именем → перенос поимённо → сверка счёта → удаление старой →
  // переименование. Счёт разошёлся — старая не трогается. Обрыв между удалением и переименованием оставит
  // данные во временной таблице, и её имя названо в ответе.
  const existing = await sql(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`, [MESSAGES])
  const shape = String(existing.rows?.[0]?.sql ?? "")
  // 🔒 УСТАРЕВШЕЙ ФОРМУ ДЕЛАЕТ ЛЮБОЙ НЕДОСТАЮЩИЙ `CHECK`, А НЕ ТОЛЬКО РОД (207-4). ✗ До этого правка
  // смотрела лишь на роды: новое НАПРАВЛЕНИЕ (`feedback`) приехало бы в старую форму и было бы
  // отвергнуто базой на первой же записи — а снаружи это выглядело бы как «комментарий не работает».
  const staleShape =
    shape &&
    (!KINDS.every((k) => shape.includes(`'${k}'`)) ||
      !Object.values(DIRECTION).every((d) => shape.includes(`'${d}'`)))
  if (staleShape) {
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
  const haveLinks = await columnsOf(LINKS)
  for (const column of LINK_LATE_COLUMNS) {
    const name = column.split(/\s+/)[0]
    if (haveLinks.includes(name)) continue
    const r = await sql(`ALTER TABLE ${LINKS} ADD COLUMN ${column}`)
    if (!r.ok) return { error: r.error ?? "alter-refused", ok: false, statement: `links: ${column}` }
  }
  const have = await columnsOf(MESSAGES)
  for (const column of LATE_COLUMNS) {
    const name = column.split(/\s+/)[0]
    if (have.includes(name)) continue
    const r = await sql(`ALTER TABLE ${MESSAGES} ADD COLUMN ${column}`)
    if (!r.ok) return { error: r.error ?? "alter-refused", ok: false, statement: column }
  }
  // 🔒 СТРОКИ, ПРИШЕДШИЕ ДО 207-2, ПОЛУЧАЮТ ЧЕСТНУЮ ПОМЕТКУ, А НЕ ВЫДУМАННЫЙ ИСТОЧНИК.
  // Прежнее плоское `source` (api · telegram · …) сохраняется хвостом: оно единственное, что о
  // происхождении этих строк известно, и терять его незачем. Запрос идемпотентен — трогает только
  // строки без пути, поэтому лестница может звать его сколько угодно раз.
  const filled = await sql(
    `UPDATE ${MESSAGES}
        SET source_path = CASE WHEN source IS NOT NULL AND source <> ''
                               THEN '${LEGACY}${SEP}' || source ELSE '${LEGACY}' END
      WHERE source_path IS NULL OR source_path = ''`,
  )
  if (!filled.ok) return { error: filled.error ?? "backfill-refused", ok: false, statement: "backfill source_path" }
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
  "author", "url", "source_path", "source_auth", "feedback_kind", "feedback_done", "answer_depth", "answer_ms", "answer_model", "answer_chain",
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
/**
 * Когда этот человек говорил с памятью в прошлый раз (217-1). `null` — впервые.
 *
 * 🔒 ЧИТАЕТСЯ ДО ЗАПИСИ ТЕКУЩЕЙ СТРОКИ, иначе ответом будет «только что» ВСЕГДА, и разговор никогда
 * не начнётся заново. 🔒 ПО `id`, А НЕ ПО ВРЕМЕНИ: время печатается до секунд, и две строки внутри
 * одной секунды дали бы неопределённый порядок.
 */
export async function previousAt(who) {
  const ensured = await ensureMessages()
  if (!ensured.ok) return null
  const r = await sql(`SELECT created_at FROM ${MESSAGES} WHERE who = ? ORDER BY id DESC LIMIT 1`, [String(who)])
  if (!r.ok || !Array.isArray(r.rows) || !r.rows.length) return null
  return r.rows[0].created_at ?? null
}


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
 * 🔒 ПОВТОРНАЯ ССЫЛКА ПО УМОЛЧАНИЮ — «НИЧЕГО НЕ ДЕЛАЕМ, ВОЗВРАЩАЕМ ТО, ЧТО УЖЕ ЕСТЬ» (замысел службы). Сорвавшаяся попытка
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
export async function linkMessages(messageId, previousMessageId, { reason = null, score = null } = {}) {
  const a = Number(messageId)
  const b = Number(previousMessageId)
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) return { error: "bad-ids", ok: false }
  if (a === b) return { error: "self-link", ok: false }
  const ensured = await ensureMessages()
  if (!ensured.ok) return { error: `ensure: ${ensured.error}`, ok: false }
  const r = await sql(
    `INSERT INTO ${LINKS} (message_id, previous_message_id, created_at, reason, score) VALUES (?, ?, ?, ?, ?)`,
    [a, b, nowIso(), reason, Number.isFinite(Number(score)) && score !== null ? Number(score) : null],
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

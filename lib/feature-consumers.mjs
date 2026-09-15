// ПОДКЛЮЧЕНИЯ ЭЛЕМЕНТОВ К ПРИЗНАКАМ (205-5).
//
// 🎯 ЗАЧЕМ ЭТО ЕСТЬ. Слово владельца 2026-09-15: «предлагаю запланировать переиспользование
// элементов реестра признаков внутри нашей административной панели — это позволит любым
// существующим элементом подключаться и извлекать свои собственные элементы реестра признаков для
// своих собственных нужд». Реестр отвечал, ЧТО память умеет понимать; подключения отвечают, КТО
// этим пользуется.
//
// 🔒 ОПРЕДЕЛЕНИЕ — В ФАЙЛЕ, ПОДКЛЮЧЕНИЕ — В ДАННЫХ, И ЭТО ЗАКОН 0 ПРОЕКТА. Сам признак живёт в
// `AGI-CONFIG/agi-config.json`: его читают глазами и откатывают коммитом. А «чат подключил себе три
// признака» — это факт, который меняется в работе, растёт и запрашивается; такому место в таблице.
// ✗ Положи мы подключения в конфиг — каждое нажатие в панели становилось бы правкой репозитория.
//
// 🛑 ССЫЛКА ИДЁТ ОТ ПОДКЛЮЧЕНИЯ К ПРИЗНАКУ, А НЕ ОБРАТНО. Список элементов внутри записи признака
// (поле `consumers` в конфиге) пришлось бы править при каждом подключении, он не индексируется и
// врёт при снятии признака. Тот же довод, которым отвергнута «пуля со списком таблиц» в службе 3600.

import { activeFeatures, readFeatures } from "./features.mjs"
import { sql } from "./store.mjs"

export const TABLE = "feature_consumers"

/**
 * Кто вправе подключаться — ЗАКРЫТЫЙ СПИСОК, и это граница безопасности, а не удобство.
 *
 * 🔒 Имя элемента приходит снаружи и уезжает в значение колонки и в условие запроса. Открытый
 * список означал бы, что любой зовущий заводит свои элементы, и через месяц таблица подключений
 * перестанет отвечать на вопрос «кто этим пользуется»: в ней будут опечатки и черновики.
 * 🔒 `probe` СТОИТ ЗДЕСЬ НАМЕРЕННО: приборам нужна своя метка, чтобы негативный контроль и уборка
 * не трогали живые подключения. Закон проекта: прибор убирает за собой ПО СВОЕЙ МЕТКЕ, а не
 * очищает таблицу целиком — это уже было оплачено стёртой личной памятью владельца.
 */
export const ELEMENTS = ["telegram-chat", "guest-app", "automations", "memory-stand", "probe"]

export function isElement(v) {
  return typeof v === "string" && ELEMENTS.includes(v)
}

/**
 * Форма таблицы — одним выражением, рядом с лестницей правок.
 *
 * 🛑 `strftime` В КАВЫЧКАХ. Без них `CREATE TABLE` отвергается ЦЕЛИКОМ, отказ проглатывается по
 * закону вызывающего, и снаружи всё зелено — таблицы просто не существует. В проекте это уже
 * оплачено тремя формами сразу (шаги 144–146).
 * 🔒 ПАРА «ЭЛЕМЕНТ + ПРИЗНАК» УНИКАЛЬНА: подключить дважды — это то же подключение, а не второе.
 */
export async function ensureConsumers() {
  const create = await sql(
    `CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      element TEXT NOT NULL,
      feature_key TEXT NOT NULL,
      connected_by TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )`,
  )
  if (!create.ok) return create
  return sql(`CREATE UNIQUE INDEX IF NOT EXISTS ${TABLE}_pair ON ${TABLE} (element, feature_key)`)
}

/**
 * Что подключено элементу.
 *
 * 🛑 КОЛОНКИ ПЕРЕЧИСЛЕНЫ ПОИМЁННО, `SELECT *` ЗАПРЕЩЁН. Таблица, поднятая лестницей `ALTER`, и
 * вновь созданная имеют один набор колонок в РАЗНОМ порядке — позиционное чтение ломается только
 * у того, у кого система уже поработала.
 */
export async function consumersOf(element) {
  if (!isElement(element)) {
    return { elements: ELEMENTS, error: "unknown-element", ok: false, hint: `элемент бывает только таким: ${ELEMENTS.join(" · ")}` }
  }
  const ready = await ensureConsumers()
  if (!ready.ok) return { ...ready, ok: false }
  const rows = await sql(
    `SELECT feature_key, connected_by, created_at FROM ${TABLE} WHERE element = ? ORDER BY feature_key`,
    [element],
  )
  if (!rows.ok) return { ...rows, ok: false }
  return {
    ok: true,
    element,
    count: rows.rows.length,
    features: rows.rows.map((r) => ({ key: r.feature_key, connected_by: r.connected_by ?? null, since: r.created_at })),
  }
}

/**
 * Заменить набор подключений элемента целиком.
 *
 * 🔒 ЦЕЛИКОМ, А НЕ ЗАПЛАТОЙ, И ПРИЧИНА ТА ЖЕ, ЧТО У МАССИВОВ МЕНЮ В ПАНЕЛИ: слияние по одному
 * ключу оставило бы снятое подключение на диске навсегда — «его нет в присланном» читалось бы как
 * «не трогай». Набор — это и есть ответ на вопрос «чем пользуется элемент».
 * 🛑 КЛЮЧ ПРОВЕРЯЕТСЯ ПО РЕЕСТРУ, А НЕ ПРИНИМАЕТСЯ НА ВЕРУ: чужой ключ (например, ключ реестра
 * чата) отвергается С ПОДСКАЗКОЙ — иначе подключение молча указывает в пустоту, и об этом узнают
 * в тот день, когда признак понадобится.
 * 🛑 СНЯТЫЙ ПРИЗНАК НОВЫХ ПОДКЛЮЧЕНИЙ НЕ ПРИНИМАЕТ (правило 4, паспорт §6) и называет замену.
 */
export async function setConsumers({ by = null, element, keys }) {
  if (!isElement(element)) {
    return { elements: ELEMENTS, error: "unknown-element", ok: false, hint: `элемент бывает только таким: ${ELEMENTS.join(" · ")}` }
  }
  if (!Array.isArray(keys)) {
    return { error: "bad-keys", ok: false, hint: "keys — список ключей признаков, пусть и пустой" }
  }
  const all = readFeatures()
  const live = new Set(activeFeatures().map((f) => f.key))
  const wanted = [...new Set(keys.map((k) => String(k ?? "").trim()).filter(Boolean))]

  const rejected = []
  for (const key of wanted) {
    if (live.has(key)) continue
    const known = all.find((f) => f.key === key)
    rejected.push(
      // 🔒 ПРИЧИНА СНЯТИЯ — СТРОКА САМОГО РЕЕСТРА, И ЗАМЕНА НАЗВАНА ВНУТРИ НЕЁ (сторож `features.mjs:182`
      // требует от неё быть словами, а не отметкой). Пересказывать её здесь значило бы завести вторую
      // правду о снятии, которая разойдётся с реестром на первой правке.
      known
        ? { key, why: "retired", what_happened: `признак «${key}» снят: ${known.retired}` }
        : { key, why: "unknown-feature", what_happened: `такого признака в реестре памяти нет: список — GET /v1/features` },
    )
  }
  if (rejected.length) {
    return { error: "unknown-feature", ok: false, rejected, what_happened: rejected[0].what_happened }
  }

  const ready = await ensureConsumers()
  if (!ready.ok) return { ...ready, ok: false }

  const gone = await sql(`DELETE FROM ${TABLE} WHERE element = ?`, [element])
  if (!gone.ok) return { ...gone, ok: false }
  for (const key of wanted) {
    const put = await sql(`INSERT INTO ${TABLE} (element, feature_key, connected_by) VALUES (?, ?, ?)`, [element, key, by])
    if (!put.ok) return { ...put, ok: false }
  }
  return { ok: true, element, count: wanted.length, features: wanted, what_happened: `у элемента «${element}» теперь ${wanted.length} подключений` }
}

/** Ключ признака → элементы, которые им пользуются. Для каталога `GET /v1/features`. */
export async function elementsByFeature() {
  const ready = await ensureConsumers()
  if (!ready.ok) return { ok: false, error: ready.error }
  const rows = await sql(`SELECT element, feature_key FROM ${TABLE} ORDER BY element`)
  if (!rows.ok) return { ok: false, error: rows.error }
  const map = {}
  for (const r of rows.rows) (map[r.feature_key] ??= []).push(r.element)
  return { ok: true, map }
}

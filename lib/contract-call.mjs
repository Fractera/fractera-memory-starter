// ВЫЗОВ, СОБРАННЫЙ ИЗ ДОГОВОРА, — ДЛЯ ФОРМЫ СТЕНДА И ДЛЯ ПРИБОРА (200-2).
//
// 🔒 ФОРМА СТЕНДА НЕ ЗНАЕТ, КАКИЕ МЕТОДЫ У ПАМЯТИ ЕСТЬ. Цели приходят со
// страницы, порождённые из `contract.mjs`: метод, добавленный в договор,
// появляется на стенде без правки экрана. Слово владельца 2026-09-14: «finish it
// for all items and methods, using api only».
//
// 🔒 ПОЧЕМУ `.mjs` В `lib/`, А НЕ РЯДОМ С ОСТРОВКОМ — тот же закон, что у
// `bench-call.mjs`: сборку тела зовут и форма, и прибор 200-5, и обе стороны
// видят одно поведение, а не проверяют глазами.
//
// 🔒 ЧТО УЕЗЖАЕТ: только заполненное. Незаполненное обязательное НЕ подменяется —
// вызов уходит без него, и отказ `missing-params` говорит сам договор. Заполненное
// не той формы (кривой JSON, дробное число) не уезжает и называется в `bad`:
// значение не исчезает молча (закон шага 143).

/**
 * @typedef {object} CallParam
 * @property {string} name
 * @property {string} type        string · array · boolean · integer — типы JSON Schema договора
 * @property {string} [format]    `binary` — файл
 * @property {boolean} required
 * @property {string} hint        описание для человека: перевод или текст договора
 *
 * @typedef {object} CallTarget
 * @property {string} id          имя метода или путь каталога
 * @property {"method" | "get"} kind
 * @property {string} path        путь договора: `/v1/remember`, `/v1/tables/{имя}`
 * @property {string} hint        что делает — перевод или текст договора
 * @property {CallParam[]} params
 *
 * @typedef {object} ContractCall
 * @property {"GET" | "POST"} verb
 * @property {string} path        путь адреса с подставленными значениями
 * @property {Record<string, unknown> | null} body   тело `/v1`, как оно уедет
 * @property {{ method: string, body: Record<string, unknown> } | { get: string }} door  что уйдёт в дверь стенда
 * @property {string[]} bad       заполнено не той формы — не уезжает
 * @property {string[]} missing   обязательное не заполнено
 */

const PLACEHOLDER = /\{([^}]+)\}/g

/** Параметры адреса каталога — имена в фигурных скобках пути. */
export function placeholdersOf(path) {
  return [...String(path).matchAll(PLACEHOLDER)].map((m) => m[1])
}

/** Пустая запись списка (заготовка карточки охвата) — не значение. */
function isBlankEntry(e) {
  return !!e && typeof e === "object" && Object.values(e).every((x) => x === "" || x === null || x === undefined)
}

/** Непустые поля записи; пустая строка в тело не уезжает. */
function trimEntry(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return e
  const out = {}
  for (const [k, v] of Object.entries(e)) {
    if (v === "" || v === null || v === undefined) continue
    out[k] = typeof v === "string" ? v.trim() : v
  }
  return out
}

/** @returns {{ value?: unknown, skip?: true, bad?: true }} */
function valueOf(param, raw) {
  // 🛑 ФАЙЛ НЕ ЕДЕТ В JSON: его несёт `multipart/form-data`, а это 200-3.
  if (param.format === "binary") return { skip: true }
  if (param.type === "boolean") return raw === true ? { value: true } : { skip: true }
  if (param.type === "integer") {
    const s = String(raw ?? "").trim()
    if (!s) return { skip: true }
    const n = Number(s)
    return Number.isInteger(n) ? { value: n } : { bad: true }
  }
  if (param.type === "array") {
    let list = raw
    if (!Array.isArray(raw)) {
      const s = String(raw ?? "").trim()
      if (!s) return { skip: true }
      try {
        list = JSON.parse(s)
      } catch {
        return { bad: true }
      }
      if (!Array.isArray(list)) return { bad: true }
    }
    const kept = list.filter((e) => !isBlankEntry(e)).map(trimEntry)
    return kept.length ? { value: kept } : { skip: true }
  }
  const s = typeof raw === "string" ? raw.trim() : ""
  return s ? { value: s } : { skip: true }
}

/**
 * Собрать вызов цели договора из значений формы.
 *
 * @param {CallTarget} target
 * @param {Record<string, unknown>} values  значения по имени параметра
 * @returns {ContractCall}
 */
export function buildContractCall(target, values) {
  /** @type {string[]} */
  const bad = []
  /** @type {string[]} */
  const missing = []
  const text = (name) => (typeof values[name] === "string" ? values[name].trim() : "")

  if (target.kind === "get") {
    for (const name of placeholdersOf(target.path)) if (!text(name)) missing.push(name)
    const path = target.path.replace(PLACEHOLDER, (whole, name) => (text(name) ? encodeURIComponent(text(name)) : whole))
    // 🔒 В ДВЕРЬ УХОДИТ НЕЗАКОДИРОВАННОЕ ИМЯ: кодирует она сама, и двойная
    // кодировка превратила бы `a b` в `a%2520b`.
    const get = target.path.replace(/^\/v1\//, "").replace(PLACEHOLDER, (_, name) => text(name))
    return { bad, body: null, door: { get }, missing, path, verb: "GET" }
  }

  /** @type {Record<string, unknown>} */
  const body = {}
  for (const p of target.params) {
    const r = valueOf(p, values[p.name])
    if (r.bad) bad.push(p.name)
    else if (!r.skip) body[p.name] = r.value
    if (p.required && !(p.name in body)) missing.push(p.name)
  }
  return { bad, body, door: { body, method: target.id }, missing, path: target.path, verb: "POST" }
}

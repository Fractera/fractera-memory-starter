// СОСЕДИ: КАРТА ОТ ПАНЕЛИ И ЕЁ КЭШ НА ДИСКЕ (227-5).
//
// 🎯 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-18, ДОСЛОВНО: «Гибрид: своё — всегда с диска, чужое — у панели с
// кэшем». Своё описание (`OWN-SERVICE-PROPS.json`) этот модуль не трогает вовсе: оно читается в
// `services.mjs` и не зависит ни от сети, ни от панели.
//
// 🔒 СЕТЬ ЗДЕСЬ НЕ ДОРОГА, И ЭТО ИЗМЕРЕНО (226-2): карта читается ОДИН РАЗ ЗА ЖИЗНЬ ПРОЦЕССА.
// Довод «сетевая задержка на горячем пути» снят измерением, а не отброшен.
//
// 🔒 ПАНЕЛЬ СПРАШИВАЕТСЯ ЧЕРЕЗ «ОДНУ ДВЕРЬ» СЛОЯ ДАННЫХ — `/service/panel/api/service-map`, а не
// портом `3002`. Порт панели в коде памяти означал бы второй адрес и второй ключ.
//
// 🛑 МОЛЧА УСТАРЕВШАЯ КАРТА — УВЕРЕННЫЙ НЕВЕРНЫЙ ОТВЕТ, А ОН ДОРОЖЕ ПУСТОГО. Поэтому у состояния
// соседей три исхода, а не два: свежая · с кэша, возраст назван · неизвестны.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { dataCall } from "./data-call.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * Где лежит кэш карты.
 *
 * 🔒 РЯДОМ С ЖУРНАЛОМ, А НЕ В КОРНЕ ДЕРЕВА: это рантайм-данные машины, как `.env.local`. Файл в
 * корне выглядел бы описанием проекта и однажды уехал бы в git вместе с чужими адресами.
 */
export const CACHE_PATH =
  process.env.SERVICE_MAP_CACHE_FILE ?? join(HERE, "..", "logs", "service-map.cache.json")

/** Путь к карте у панели — через слой данных. */
const MAP_PATH = "/service/panel/api/service-map"

/** Прочитать кэш с диска. Нет файла или он битый — `null`, и это законное состояние. */
export function readCache() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_PATH, "utf8"))
    if (!Array.isArray(raw?.services)) return null
    return raw
  } catch {
    return null
  }
}

function writeCache(map) {
  try {
    mkdirSync(dirname(CACHE_PATH), { recursive: true })
    writeFileSync(CACHE_PATH, JSON.stringify({ ...map, cached_at: new Date().toISOString() }, null, 2))
    return true
  } catch {
    // 🛑 НЕУДАЧНАЯ ЗАПИСЬ КЭША НЕ ОТМЕНЯЕТ ПОЛУЧЕННУЮ КАРТУ: она уже в памяти процесса и годна.
    // Молчаливо потерять её ради целостности файла значило бы наказать работу за диск.
    return false
  }
}

/**
 * Взять у карты только записи служб — то, что нужно маршрутизатору.
 *
 * 🔒 МОЛЧАЩИЕ СЛУЖБЫ В СОСЕДИ НЕ ИДУТ, НО И НЕ ТЕРЯЮТСЯ: у них нет описания, а значит нет ни
 * адреса, ни слов темы — переадресовать к ним нечем. Их число называется отдельно, чтобы «соседей
 * мало» отличалось от «соседи молчат».
 */
export function describedOf(map) {
  return (map?.services ?? []).filter((s) => s?.props).map((s) => s.props)
}

/** Сколько служб в карте установлено, но себя не описало. */
export function silentCount(map) {
  return (map?.services ?? []).filter((s) => !s?.props).length
}

/**
 * Спросить панель. Возвращает карту или причину, по которой её нет.
 *
 * 🔒 ОТВЕТ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ HTTP — это делает `dataCall`: слой данных отвечает `200`
 * с `{ok:false}` на отвергнутый запрос.
 */
export async function askPanel() {
  const r = await dataCall(MAP_PATH, undefined, "GET")
  if (!r.ok) return { error: r.error, map: null, why: r.why ?? "" }
  const map = r.body
  if (!Array.isArray(map?.services)) return { error: "map-malformed", map: null, why: "в ответе панели нет списка служб" }
  return { error: null, map, why: "" }
}

/** Возраст снимка в секундах — или `null`, если метки нет. */
export function ageSeconds(map) {
  const at = map?.cached_at ?? map?.built_at
  if (!at) return null
  const ms = Date.now() - Date.parse(at)
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 1000)) : null
}

/**
 * Сказать словами, откуда взялись соседи и насколько они свежи.
 *
 * 🛑 ЭТО НЕ УКРАШЕНИЕ ОТВЕТА. Человек, которому дали адрес соседней службы по карте недельной
 * давности, узнает об этом только когда адрес не ответит. Возраст, названный заранее, — разница
 * между «система ошиблась» и «система предупредила».
 */
export function sourceWords(state) {
  if (!state.known) return `о соседних службах ничего не известно: ${state.why}`
  if (state.fresh) return "карта служб получена от панели только что"
  const age = state.age_s
  const when = age === null ? "возраст снимка неизвестен" : `снимку ${age >= 3600 ? `${Math.round(age / 3600)} ч` : `${Math.round(age / 60)} мин`}`
  return `карта служб взята из кэша (${when}): ${state.why}`
}

export { writeCache }

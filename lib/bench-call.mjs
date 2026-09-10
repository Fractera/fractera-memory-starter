// ЧТО ИМЕННО УЕДЕТ В ПАМЯТЬ СО СТЕНДА — СОБИРАЕТСЯ ЗДЕСЬ, ОДНОЙ ФУНКЦИЕЙ (183-1).
//
// 🔒 ПОЧЕМУ ЭТО `.mjs` В `lib/`, А НЕ ФАЙЛ РЯДОМ С ОСТРОВКОМ. Живи сборка тела
// внутри клиентского компонента, проверить её можно было бы ТОЛЬКО браузером —
// то есть глазами. Здесь её зовут и островок, и прибор, и обе стороны видят
// одно и то же поведение. Тот же приём, что у ядра памяти: `.mjs` зовётся и
// из `server.mjs`, и из двери Next.
//
// 🔒 ГЛАВНЫЙ ЗАКОН ФАЙЛА: ПАРАМЕТР, КОТОРОГО НЕТ В ДОГОВОРЕ, НЕ УЕЗЖАЕТ МОЛЧА —
// он попадает в `dropped` и показывается человеку рядом с телом запроса.
// Присланные данные, которые молча ничего не делают, — отдельный класс дефекта
// (закон шага 143): без этого списка «память проигнорировала» неотличимо от
// «стенд не послал».

/**
 * @typedef {"standard" | "deep" | "extreme"} BenchDepth
 *
 * @typedef {object} BenchParams
 * @property {string} at              дата охвата, `гггг-мм-дд`
 * @property {string} deny            отрицание прежнего вывода
 * @property {BenchDepth} depth       глубина поиска — словами, не номером
 * @property {string} history         предыдущий разговор
 * @property {boolean} historyOn      отдавать ли историю
 * @property {boolean} needTable      требуется ли создать таблицу
 * @property {string} place           место охвата
 * @property {string} prior           результаты предыдущих поисков
 * @property {boolean} priorOn        отдавать ли их
 * @property {boolean} wantChain      возвращать ли цепочку размышлений
 * @property {string} who             от чьего имени
 *
 * @typedef {"say" | "ask" | "raw"} BenchMode
 *
 * @typedef {object} BuiltCall
 * @property {Record<string, unknown>} body   тело запроса, как оно уедет
 * @property {string[]} dropped               выставлено, но договор не принимает
 * @property {string} method                  имя метода договора
 */

/** Пустое состояние органов управления. */
export const EMPTY_PARAMS = /** @type {BenchParams} */ ({
  at: "",
  deny: "",
  depth: "standard",
  history: "",
  historyOn: false,
  needTable: false,
  place: "",
  prior: "",
  priorOn: false,
  wantChain: false,
  who: "bench-1",
})

/**
 * Собрать вызов из органов управления.
 *
 * @param {object} input
 * @param {string} input.lang
 * @param {BenchMode} input.mode
 * @param {BenchParams} input.params
 * @param {readonly string[]} input.supported имена параметров, объявленные
 *   договором ДЛЯ ЭТОГО метода. Приходят порождёнными из `contract.mjs`;
 *   рукописного списка поддержанного здесь нет и быть не должно.
 * @param {string} input.text
 * @returns {BuiltCall}
 */
export function buildCall({ lang, mode, params, supported, text }) {
  const method = mode === "say" ? "remember" : "recall"
  /** @type {Record<string, unknown>} */
  const body = { lang, who: params.who }
  /** @type {string[]} */
  const dropped = []

  const trimmed = text.trim()
  if (trimmed) body.text = trimmed

  // 🔒 ОДИН ПРОХОД ПО ВСЕМ ОРГАНАМ: выставленное либо уезжает, либо попадает в
  // «не доезжает». Третьего исхода — исчезнуть — у значения нет.
  /** @type {Array<[string, unknown]>} */
  const wanted = [
    ["depth", mode === "ask" ? params.depth : null],
    ["history", params.historyOn && params.history.trim() ? params.history.trim() : null],
    ["prior", params.priorOn && params.prior.trim() ? params.prior.trim() : null],
    ["want_chain", params.wantChain ? true : null],
    ["at", params.at || null],
    ["place", params.place.trim() || null],
    ["deny", mode === "say" && params.deny.trim() ? params.deny.trim() : null],
    ["need_table", mode === "say" && params.needTable ? true : null],
  ]

  for (const [name, value] of wanted) {
    if (value === null) continue
    if (supported.includes(name)) body[name] = value
    else dropped.push(name)
  }

  return { body, dropped, method }
}

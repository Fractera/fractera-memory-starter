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
 * @typedef {object} ScopeEntry
 * @property {string} at     дата, `гггг-мм-дд`
 * @property {string} place  место
 *
 * @typedef {object} BenchParams
 * @property {ScopeEntry[]} scope     охват: СПИСОК записей, у одной фразы их бывает много
 * @property {string} deny            отрицание прежнего вывода
 * @property {BenchDepth} depth       глубина поиска — словами, не номером
 * @property {string} history         предыдущий разговор
 * @property {boolean} historyOn      отдавать ли историю
 * @property {boolean} needTable      требуется ли создать таблицу
 *
 * @property {string} prior           результаты предыдущих поисков — текстом
 * @property {boolean} priorOn        отдавать ли их
 * @property {string} thread          нить прежнего разбора: идентификатор из ответа памяти
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
  // 🔒 ОДНА ПУСТАЯ КАРТОЧКА ОХВАТА ЕСТЬ ВСЕГДА: пустой список на экране — это
  // место, где не видно, что делать. В тело пустая карточка не уедет.
  scope: [{ at: "", place: "" }],
  deny: "",
  depth: "standard",
  history: "",
  historyOn: false,
  needTable: false,

  prior: "",
  priorOn: false,
  thread: "",
  wantChain: false,
  who: "bench-1",
})

/** Непустые записи охвата; ни одной — значит поля в теле не будет вовсе. */
function scopeOf(params) {
  const list = (params.scope ?? [])
    .map((e) => ({ at: String(e.at ?? "").trim(), place: String(e.place ?? "").trim() }))
    .filter((e) => e.at || e.place)
    .map((e) => {
      const one = {}
      if (e.at) one.at = e.at
      if (e.place) one.place = e.place
      return one
    })
  return list.length ? list : null
}

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
    // 🔒 ПУСТЫЕ КАРТОЧКИ ОТСЕИВАЮТСЯ ЗДЕСЬ, А НЕ В СЛУЖБЕ: заготовка, которую
    // человек не заполнил, охватом не является — и отказ по форме за неё был бы
    // отказом за то, чего он не выставлял.
    ["scope", scopeOf(params)],
    // 🔒 НИТЬ — СВОЙСТВО ЗАПИСИ, А НЕ ЧТЕНИЯ: у recall модель не зовётся вовсе,
    // и продолжать там нечего. Выставленная в режиме вопроса, она честно
    // попадёт в «не доезжает» — договор её у recall не объявляет.
    ["thread", params.thread.trim() || null],
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

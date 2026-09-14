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

// 🔒 РОД ССЫЛКИ ПРОВЕРЯЕТСЯ ТЕМ ЖЕ `youtubeId()`, ЧТО В ПАМЯТИ (200-5): экран и служба не могут расходиться в том, что считать роликом.
import { youtubeId } from "./youtube-chapters.mjs"

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
 * @property {File[]} files           файлы вложений «Сказать» — едут частями формы, а не JSON (200-5)
 * @property {string[]} links         обычные ссылки — страницы (200-5)
 * @property {string[]} youtube       ссылки на ролики YouTube (200-5)
 *
 * @typedef {"say" | "ask" | "raw"} BenchMode
 *
 * @typedef {object} BuiltCall
 * @property {Record<string, unknown>} body   тело запроса, как оно уедет
 * @property {string[]} dropped               выставлено, но договор не принимает
 * @property {string} method                  имя метода договора
 * @property {File[]} files                   файлы, которые уедут частями формы
 * @property {string[]} invalid               ссылки не своего рода: ролик в links, не ролик в youtube
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
  // 🔒 ПО ОДНОЙ ПУСТОЙ СТРОКЕ ССЫЛКИ — по той же причине, что карточка охвата: пустой список не подсказывает, что делать.
  files: [],
  links: [""],
  youtube: [""],
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

  const clean = (list) => (list ?? []).map((u) => String(u ?? "").trim()).filter(Boolean)
  const links = clean(params.links)
  const youtube = clean(params.youtube)
  // 🔒 ССЫЛКА НЕ СВОЕГО РОДА НАЗЫВАЕТСЯ ДО ОТПРАВКИ: слово владельца — «чтобы ты не проходила».
  const invalid = [...links.filter((u) => youtubeId(u) !== null), ...youtube.filter((u) => youtubeId(u) === null)]

  const trimmed = text.trim()
  if (trimmed) body.text = trimmed

  // 🔒 ОДИН ПРОХОД ПО ВСЕМ ОРГАНАМ: выставленное либо уезжает, либо попадает в
  // «не доезжает». Третьего исхода — исчезнуть — у значения нет.
  /** @type {Array<[string, unknown]>} */
  // 🔒 С 200-4 ОРГАН НЕ ЗНАЕТ, КАКОМУ ГЛАГОЛУ ОН «ПОЛОЖЕН»: это знает только договор.
  // ✗ До 200-4 здесь стояли условия режима, и выставленное у чужого глагола получало
  // `null` — глубина у «Сказать», отрицание и требование таблицы у «Спросить» исчезали
  // молча, мимо «не доезжает». Решает `supported`, и больше ничто.
  // 🔒 ГЛУБИНА «СТАНДАРТ» — УМОЛЧАНИЕ: у вопроса она уезжает всегда, у записи
  // называется «не доезжает», только если человек выбрал не стандарт.
  const wanted = [
    ["depth", mode === "ask" || params.depth !== "standard" ? params.depth : null],
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
    ["deny", params.deny.trim() || null],
    ["need_table", params.needTable ? true : null],
    // 🔒 ВЛОЖЕНИЯ-ССЫЛКИ (200-5): пустые строки — заготовки, в тело не едут.
    ["links", links.length ? links : null],
    ["youtube", youtube.length ? youtube : null],
  ]

  for (const [name, value] of wanted) {
    if (value === null) continue
    if (supported.includes(name)) body[name] = value
    else dropped.push(name)
  }

  // 🔒 ФАЙЛЫ ЕДУТ ЧАСТЯМИ ФОРМЫ И ТОЛЬКО ТУДА, ГДЕ ДОГОВОР ИХ ОБЪЯВЛЯЕТ; у чужого глагола — «не доезжает», как любой орган.
  let files = params.files ?? []
  if (files.length && !supported.includes("files")) {
    dropped.push("files")
    files = []
  }

  return { body, dropped, files, invalid, method }
}

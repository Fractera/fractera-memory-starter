// НЕОБЯЗАТЕЛЬНЫЕ ПАРАМЕТРЫ ДВУХ ГЛАГОЛОВ — ОДНО МЕСТО НА ОБА (183-2 … 183-6).
//
// 🔒 ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ, А НЕ ПРОВЕРКИ ВНУТРИ ГЛАГОЛОВ. Проверка, написанная
// дважды, расходится молча: у `recall` дата стала бы строгой, у `remember` —
// какой угодно, и никто бы этого не заметил. Здесь она одна.
//
// 🔒 ГЛАВНЫЙ ЗАКОН ФАЙЛА: КАЖДЫЙ ПРИСЛАННЫЙ ПАРАМЕТР ПОЛУЧАЕТ НАЗВАННУЮ СУДЬБУ.
// Присланные данные, которые молча ничего не делают, — отдельный класс дефекта
// (закон шага 143): агент шлёт, ничего не происходит, и ни отказа, ни записи.
// Поэтому наружу вместе с ответом едет `params` — по строке на параметр:
//
//   accepted       принят и подействовал; `note` говорит, ЧТО именно он сделал
//                  и где его предел, если предел есть;
//   not_supported  принят по форме, способности за ним пока нет — и это сказано
//                  словами, а не молчанием (ANTI-PATTERNS: «названная, но не
//                  обеспеченная возможность»);
//   bad_form       значение не той формы; параметр отброшен, и назван почему.
//
// 🛑 `bad_form` НЕ РОНЯЕТ ВЫЗОВ ЦЕЛИКОМ, И ЭТО ВЫБОР. Отказ на весь запрос из-за
// кривой даты стоил бы зовущему всей работы; отброшенный параметр с названной
// причиной стоит ему одного поля. Но и тихо съесть его нельзя: мусор в охвате
// потом неотличим от знания.

/** Глубина — словами, а не номером уровня. Наружу идут слова (паспорт §13). */
export const DEPTHS = ["standard", "deep", "extreme"]

/**
 * До какого уровня память РЕАЛЬНО умеет подниматься сегодня.
 *
 * 🔒 ЧИСЛО ЖИВЁТ ЗДЕСЬ, РЯДОМ С ПРОВЕРКОЙ, А НЕ В ТЕКСТЕ ИНСТРУКЦИИ. Построены
 * первый (база без модели) и второй (база с моделью); третий, четвёртый и пятый
 * — нет. Появится третий — правится эта строка, и ответ перестаёт врать сам.
 */
export const BUILT_LEVELS = 2

/** Какому пределу уровня соответствует слово глубины. */
export const DEPTH_CEILING = { deep: 4, extreme: 5, standard: 3 }

const isText = (v) => typeof v === "string" && v.trim().length > 0
const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isYesNo = (v) => typeof v === "boolean"

/**
 * Что известно о каждом параметре: как проверить его форму, действует ли он
 * сегодня и что сказать человеку про его предел.
 */
/**
 * Одна запись охвата: `{at, place}`. Годится, если хотя бы одно поле есть и оба
 * той формы, которую мы обещали.
 *
 * 🔒 ЗАПИСЬ БЕЗ ОБОИХ ПОЛЕЙ — НЕ ПУСТОЙ ОХВАТ, А МУСОР. Пустой охват выражается
 * ОТСУТСТВИЕМ записи; запись-пустышка говорит «здесь что-то есть», и это «что-то»
 * потом неотличимо от знания.
 */
function scopeEntryTrouble(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return "запись охвата — это объект {at, place}"
  const at = entry.at
  const place = entry.place
  const hasAt = at !== undefined && at !== null && at !== ""
  const hasPlace = place !== undefined && place !== null && place !== ""
  if (!hasAt && !hasPlace) return "в записи охвата должна быть дата или место — пустая запись охватом не становится"
  if (hasAt && !isDate(at)) return "дата пишется как гггг-мм-дд: свободная фраза охватом не становится"
  if (hasPlace && !isText(place)) return "место пишется словом"
  return null
}

/** Список записей охвата: годится, если он непуст и годна КАЖДАЯ запись. */
function scopeTrouble(v) {
  if (!Array.isArray(v)) return "охват — это список записей {at, place}"
  if (v.length === 0) return "пустой список охватом не становится: нет записей — не присылайте поле"
  for (let i = 0; i < v.length; i += 1) {
    const trouble = scopeEntryTrouble(v[i])
    // 🔒 НОМЕР ЗАПИСИ НАЗЫВАЕТСЯ, А НЕ ОСТАВЛЯЕТСЯ НА ДОГАДКУ. «Что-то не так с
    // охватом» при пяти карточках заставляет зовущего перебирать их руками.
    if (trouble) return `запись ${i + 1}: ${trouble}`
  }
  return null
}

const SPEC = {
  deny: {
    check: isText,
    formNote: "нужен текст: чем именно прежний вывод неверен",
    note: "цикл дообучения от отрицания ещё не построен — сказанное не отменяет прежний вывод",
    works: false,
  },
  depth: {
    check: (v) => DEPTHS.includes(v),
    formNote: `глубина бывает только такой: ${DEPTHS.join(" · ")}`,
    note: "предел уровня выставлен; выше построенного память всё равно не поднимется — она скажет это числом",
    works: true,
  },
  history: {
    check: isText,
    formNote: "нужен текст предыдущего разговора",
    note: "слова истории участвуют в поиске наравне со словами вопроса",
    works: true,
  },
  need_table: {
    check: isYesNo,
    formNote: "да или нет",
    note: "записанное этой фразой сразу поднимается в собственную таблицу, не дожидаясь второго значения",
    works: true,
  },
  scope: {
    check: (v) => scopeTrouble(v) === null,
    // 🔒 ПРИЧИНА ОТКАЗА СЧИТАЕТСЯ ЗАНОВО, А НЕ ХРАНИТСЯ СТРОКОЙ: у списка она
    // зависит от того, какая именно запись подвела.
    formNoteOf: scopeTrouble,
    formNote: "охват — непустой список записей {at, place}",
    note: "охват записан в журнал вызова целиком, всеми записями; в само знание охват пока не ложится",
    works: true,
  },
  prior: {
    check: isText,
    formNote: "нужен текст того, что уже нашли",
    note: "слова прежних находок участвуют в поиске наравне со словами вопроса",
    works: true,
  },
  want_chain: {
    check: isYesNo,
    formNote: "да или нет",
    note: "цепочка шагов поиска возвращается в поле chain",
    works: true,
  },
}

/**
 * Прочитать необязательные параметры вызова.
 *
 * @param {Record<string, unknown>} body тело запроса как пришло
 * @param {string[]} names какие параметры этот глагол принимает
 * @returns {{ report: Array<{name: string, note: string, state: string}>, values: Record<string, unknown> }}
 */
export function readParams(body, names) {
  const values = {}
  const report = []

  for (const name of names) {
    const raw = body?.[name]
    // 🔒 НЕ ПРИСЛАН — НЕ СТРОКА В ОТЧЁТЕ. Отчёт о том, чего зовущий не слал,
    // был бы шумом: он читается моделью, и каждая лишняя строка стоит ей хода.
    if (raw === undefined || raw === null || raw === "") continue

    const spec = SPEC[name]
    if (!spec) continue

    if (!spec.check(raw)) {
      // 🔒 У СОСТАВНОГО ЗНАЧЕНИЯ ПРИЧИНА СЧИТАЕТСЯ ПО НЕМУ САМОМУ: она называет
      // номер подведшей записи, а не «что-то не так с охватом».
      const why = spec.formNoteOf ? spec.formNoteOf(raw) : null
      report.push({ name, note: why ?? spec.formNote, state: "bad_form" })
      continue
    }
    if (!spec.works) {
      report.push({ name, note: spec.note, state: "not_supported" })
      continue
    }
    values[name] = raw
    report.push({ name, note: spec.note, state: "accepted" })
  }

  return { report, values }
}

/**
 * Слова, по которым идёт механический поиск: вопрос плюс принятый контекст.
 *
 * 🔒 ИСТОЧНИК КАЖДОГО СЛОВА НАЗЫВАЕТСЯ, А НЕ ТЕРЯЕТСЯ В ОБЩЕЙ КУЧЕ. Иначе
 * ответ, найденный по слову из истории, выглядит как найденный по вопросу — и
 * зовущий решает, что память знает больше, чем знает.
 */
export function searchWords({ history, prior, text }) {
  const cut = (s) =>
    String(s ?? "")
      .toLowerCase()
      .split(/[^a-zа-яё0-9]+/)
      .filter((w) => w.length > 2)

  const used = []
  const words = cut(text)
  if (history) {
    words.push(...cut(history))
    used.push("history")
  }
  if (prior) {
    words.push(...cut(prior))
    used.push("prior")
  }
  return { used, words }
}

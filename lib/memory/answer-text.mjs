// ТЕКСТ ОТВЕТА ДВУХ ГЛАГОЛОВ — ТО, ЧТО ЧЕЛОВЕК ПРОЧИТАЕТ ГЛАЗАМИ (206-10).
//
// 🎯 ТРЕБОВАНИЕ ВЛАДЕЛЬЦА 2026-09-16, ДОСЛОВНО: «когда пользователь задаёт вопрос на изучение данных,
// очевидно, что формат вывода напрямую помогает ему определить результат… если пользователь загрузил
// какой-либо объект, ему нужно вернуть описание в виде саммари: например, "вы загрузили фотографию",
// краткое саммари и "сохранили этот объект в истории вашей памяти". Даже когда пользователь просто
// наговорил что-то… важно вернуть ответ: "если я тебя правильно понял, то ты имел в виду…" и что
// сохранено в память. И в конце в обоих случаях, а также в случае извлечения данных, обязательно
// написать: прокомментируйте ответ, если он вас не устраивает — это будет использоваться для
// обучения модели».
//
// 🔒 ТРИ СЛУЧАЯ, ОДНА ФОРМА: сказал · прислал вещь · спросил. У каждого свой лид, но приглашение
// поправить стоит в конце ВСЕГДА — именно оно превращает ответ в разговор, а не в отчёт.
// 🪦 ПРЕЖДЕ ЗДЕСЬ БЫЛО ГОЛОЕ ПЕРЕЧИСЛЕНИЕ (200-6, «в тексте просто делаешь перечисления всех фактов»).
// Перечисление осталось внутри — человеку по-прежнему видно построчно, что именно записано, — но
// теперь у него есть начало и конец, обращённые к человеку.
//
// 🔒 СЛОВА ПЕРЕВОДИМЫ, СТРУКТУРА — НЕТ: лиды и приглашение живут в `lib/words.mjs` на двух языках,
// а значения и роды печатаются как есть. Пересказ — работа зовущей модели, не памяти.

import { say } from "./words.mjs"

const readable = (what) => String(what ?? "").replace(/_/g, " ")

/** Род вещи словами человека — для лида «вы загрузили …». */
const KIND_WORDS = {
  en: { audio: "an audio recording", document: "a document", image: "a photo", pdf: "a PDF", video: "a video", web: "a page" },
  ru: { audio: "аудиозапись", document: "документ", image: "фотографию", pdf: "PDF", video: "видео", web: "страницу" },
}
const kindWord = (kind, lang) => {
  const branch = KIND_WORDS[lang] ?? KIND_WORDS.en
  return branch[kind] ?? (lang === "ru" ? "файл" : "a file")
}

/** Род вещи по типу файла — у старых вещей без строки в таблице рода нет, а тип есть. */
function kindFromMime(mime) {
  const m = String(mime ?? "")
  if (m.startsWith("image/")) return "image"
  if (m.startsWith("audio/")) return "audio"
  if (m.startsWith("video/")) return "video"
  if (m === "application/pdf") return "pdf"
  return null
}

function objectLine(o) {
  const label = o.title || o.name || o.url || o.id || "?"
  if (!o.ok) return `- ✗ ${label}: ${o.error ?? "refused"}`
  const tags = [o.kind, o.messageId != null ? `#${o.messageId}` : null, o.existing ? "existing" : null].filter(Boolean).join(" ")
  return `- [${tags}] ${label}`
}

/**
 * Собрать ответ из частей и поставить приглашение поправить.
 *
 * 🛑 ПРИГЛАШЕНИЕ ДОБАВЛЯЕТСЯ ЗДЕСЬ, В ОДНОМ МЕСТЕ, А НЕ В КАЖДОМ ГЛАГОЛЕ. Написанное трижды, оно
 * исчезло бы из одного из трёх молча — и как раз в том ответе, где человеку важнее всего поправить.
 */
// 🔒 ПРИГЛАШЕНИЕ ПЕРИОДИЧЕСКОЕ, А НЕ ПОСТОЯННОЕ (217-1, задание владельца 2026-09-16):
// «не быть навязчивыми… в начале сессии к любому важному запросу, а в течение сессии только к тем,
// которые требовали долгой цепочки рассуждений». Кто решает и по каким измеренным порогам —
// `lib/invite.mjs`. 🛑 Здесь оно печаталось БЕЗУСЛОВНО, и закон не исполнялся ни дня.
function withFeedback(parts, lang, invite = true) {
  // 🔒 ПУСТАЯ СТРОКА ВНУТРИ — ЭТО ВОЗДУХ МЕЖДУ ГРУППАМИ, А НЕ МУСОР (218-4). Выбросив её, мы
  // склеиваем «Из записей» и «По связям» в одну стену текста — ровно то, что владелец назвал
  // набором не связанных между собой отрывков. Выбрасываются только пропуски и края.
  const kept = parts.filter((x) => x !== undefined && x !== null)
  while (kept.length && String(kept[0]).trim() === "") kept.shift()
  while (kept.length && String(kept[kept.length - 1]).trim() === "") kept.pop()
  const body = []
  for (const x of kept) {
    if (String(x).trim() === "" && String(body[body.length - 1] ?? "").trim() === "") continue
    body.push(x)
  }
  if (invite) body.push(say("answer-feedback", lang))
  return body.join("\n")
}

/** Текст ответа «Сказать»: что понято, что сохранено, что стало с присланным. */
export function rememberText({ invite = true, kept, lang, noted, objects, trouble, what_happened }) {
  const facts = []
  for (const n of noted ?? []) {
    const value = n.became ?? n.added ?? n.value
    // 🔒 ЧЕЛОВЕК ЧИТАЕТ `label` НА СВОЁМ ЯЗЫКЕ, А НЕ МАШИННОЕ ИМЯ РОДА (218-4). Машинное остаётся
    // в объекте ответа — по нему ищут; в тексте оно выглядит как кусок чужой схемы.
    const name = typeof n?.label === "string" && n.label.trim() ? n.label.trim() : readable(n.what)
    if (value !== undefined && value !== null && value !== "") facts.push(`  • ${name}: ${value}`)
  }
  const things = (objects ?? []).filter((o) => o.ok)
  const parts = []

  // 🔒 ВЕЩЬ ОБЪЯВЛЯЕТСЯ СВОИМ ЛИДОМ, А НЕ СТРОКОЙ СПИСКА: человек прислал фотографию и ждёт услышать
  // именно это. Саммари берётся у самой вещи; нет его — не выдумываем, показываем название.
  for (const o of things) {
    parts.push(`${say("answer-object-lead", lang, { kind: kindWord(o.kind, lang) })} ${o.summary || o.title || o.name || o.url || ""}`.trim())
    parts.push(say("answer-object-kept", lang))
  }
  for (const o of (objects ?? []).filter((o) => !o.ok)) parts.push(objectLine(o))

  if (facts.length) {
    parts.push(say("answer-understood", lang))
    parts.push(...facts)
  }
  // 🔒 «СОХРАНЕНО» ГОВОРИТ, ЧТО ИМЕННО ПРОИЗОШЛО С ФРАЗОЙ, А НЕ ПОВТОРЯЕТ СПИСОК. Повтор одного и
  // того же дважды читается как две разные вещи — и человек ищет между ними разницу, которой нет.
  // 🔒 СОХРАНЁННОЕ — ТОЖЕ ГРУППА, А НЕ ХВОСТ ОДНОЙ СТРОКОЙ (218-4): человек читает ответ сверху
  // вниз, и «что записано» обязано выглядеть так же, как «что нашлось» у вопроса.
  if (kept) parts.push("", `${say("answer-kept", lang)}`, `  • ${kept}`)
  // 🔒 ОТКАЗ НАЗЫВАЕТСЯ ВСЕГДА, А НЕ ТОЛЬКО КОГДА БОЛЬШЕ НЕЧЕГО СКАЗАТЬ (216-2).
  // ✗ Оплачено живой пробой владельца 2026-09-16: окно подписки было исчерпано, фраза уцелела
  // целиком — и человек прочитал одно «В память сохранено», а причину увидел только тот, кто
  // открыл машинную часть ответа. Неполная работа выглядела полным успехом.
  if (trouble) parts.push(`${say("answer-not-parsed", lang)} ${trouble}`)
  // 🔒 ЧТО ИМЕННО ПРОИЗОШЛО — ГОВОРИТСЯ И ТОГДА, КОГДА ФРАЗА УЦЕЛЕЛА, НО ФАКТОВ В НЕЙ НЕ НАШЛОСЬ
  // (218-3). ✗ Оплачено словом владельца 2026-09-16: «это не ответ, это цепочка мыслей». Человек
  // читал «В память сохранено» и не узнавал главного — что разбор не дал ничего. Молчание об этом
  // читается как «записано всё», то есть как успех, которого не было.
  if (!facts.length && !things.length) {
    const said = String(what_happened ?? "").trim()
    parts.push("", said ? said.charAt(0).toUpperCase() + said.slice(1) : "")
  }
  return withFeedback(parts, lang, invite)
}

/**
 * Когда это было и где — человеческими словами, в скобках после самой находки (218-2).
 *
 * 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-16: «почему всё то, что ты собираешь, не имеет никаких временных и
 * географических меток? У тебя просто не связаны между собой по датам набор каких-то огрызков слов».
 *
 * 🔒 ДВА ВРЕМЕНИ, И ОНИ РАЗНЫЕ: `at` — о каком времени речь («в пятницу»), `said_at` — когда это
 * сказали. Фраза, произнесённая сегодня, бывает о пятнице, и склеить их значит соврать об обоих.
 * 🔒 ПУСТОЕ НЕ ПЕЧАТАЕТСЯ ВОВСЕ: «место: —» читается как «проверено, места нет», а правда — «не
 * знаю». Уверенное умолчание дороже отсутствующего значения.
 */
function whenWhere(k, lang) {
  const bits = []
  const at = k?.at ? String(k.at) : null
  const place = k?.place ? String(k.place) : null
  const said = k?.said_at ? String(k.said_at).slice(0, 10) : null
  if (at) bits.push(lang === "en" ? `about ${at}` : `когда: ${at}`)
  // 218-15: место, выведенное по истории («то кафе»), помечено как вывод — это не слова человека
  const guessed = k?.place_source === "guess"
  if (place) bits.push(lang === "en" ? `in ${place}${guessed ? " (from history)" : ""}` : `место${guessed ? " (по истории)" : ""}: ${place}`)
  if (said) bits.push(lang === "en" ? `said ${said}` : `сказано ${said}`)
  return bits.length ? ` (${bits.join(", ")})` : ""
}

/**
 * Текст ответа «Спросить»: что нашлось — словами человека, с временем и местом.
 *
 * 🛑 НАРУЖУ НЕ УЕЗЖАЕТ НИЧЕГО СЛУЖЕБНОГО. ✗ Оплачено живым блоком владельца 2026-09-16: на вопрос
 * «кто у нас в Мадриде» пришёл сырой контекст движка связей — JSON сущностей со `<SEP>`, — и
 * владелец назвал это иероглифами. Человек задал вопрос словами и ответ обязан получить словами;
 * внутреннее устройство остаётся внутри (закон чёрного ящика).
 */
/**
 * Откуда взята находка — человеческим словом, а не именем хранилища (218-4).
 *
 * 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-16: «твои объекты нигде не предоставляют данные, что они извлекли из
 * таблицы, нигде не предоставляют отдельно данные, что извлечено из других форматов… из этого
 * бардака не вытянуть систематизированный ответ, а тем более его не может понять человек».
 *
 * 🔒 ГРУППА НАЗЫВАЕТСЯ ТЕМ, ЧТО ОНА ЗНАЧИТ ДЛЯ ЧЕЛОВЕКА, А НЕ ТЕМ, КАК УСТРОЕНА ВНУТРИ: «по связям»
 * вместо «graph», «по смыслу» вместо «vector». Имя хранилища наружу не уезжает — закон чёрного
 * ящика, и он же бережёт сменность блока: узнавший наши хранилища привязан к нам.
 */
const GROUPS = {
  en: { "deep-memory": "From your memory, after reasoning", world: "From the model’s general knowledge — NOT from your memory", graph: "From the links", graph2: "One step further along the links", link: "Connected to what was found", object: "From the things you sent", self: "About memory itself", table: "From the records", vector: "Close in meaning" },
  ru: { "deep-memory": "Из вашей памяти — после размышления", world: "Из общих знаний модели — НЕ из вашей памяти", graph: "По связям", graph2: "На шаг дальше по связям", link: "Связано с найденным", object: "Из присланных вещей", self: "О самой памяти", table: "Из записей", vector: "Близкое по смыслу" },
}

/** Почему сообщение связано — словом человека (218-10). */
const LINK_WHY = {
  en: { meaning: "about the same", time: "said right after" },
  ru: { meaning: "об этом же", time: "сказано следом" },
}
const groupWord = (kind, lang) => (GROUPS[lang] ?? GROUPS.en)[kind] ?? (GROUPS[lang] ?? GROUPS.en).table

/** Твёрдость словами человека: кода наружу не выдаём — его нельзя прочитать вслух. */
const FIRMNESS = {
  en: { affirmative: "This is firm: it is written down exactly so.", depends: "This depends on which one you mean — say it and the answer becomes firm.", presumed: "This is a guess: assembled by meaning and links, not taken from a direct record." },
  ru: { affirmative: "Это твёрдо: записано ровно так.", depends: "Это зависит от того, о каком именно вы спрашиваете — назовите, и ответ станет твёрдым.", presumed: "Это предположение: собрано по смыслу и связям, а не взято прямой записью." },
}

/**
 * Текст ответа «Спросить»: сгруппировано по источнику, со временем и местом, словами человека.
 *
 * 🛑 НАРУЖУ НЕ УЕЗЖАЕТ НИЧЕГО СЛУЖЕБНОГО. ✗ Оплачено живым блоком владельца 2026-09-16: на вопрос
 * «кто у нас в Мадриде» пришёл сырой контекст движка связей — JSON сущностей со `<SEP>`, — и
 * владелец назвал это иероглифами. Человек задал вопрос словами и ответ обязан получить словами.
 */
export function recallText({ certainty, deepAnswer = "", deeper = null, invite = true, known, lang, objects, qScope = null, what_happened }) {
  const buckets = new Map()
  // 🔒 КАК ПОНЯТ ВОПРОС — ПЕРВОЙ СТРОКОЙ, ЕСЛИ В НЁМ ЕСТЬ ВРЕМЯ ИЛИ МЕСТО (218-8). Человек видит, что
  // «в пятницу» стало датой, — и может поправить, если дата не та.
  const asked = qScope
    ? [qScope.at_words ? `${qScope.at_words} (${qScope.at})` : null, qScope.place].filter(Boolean).join(", ")
    : ""
  for (const k of known ?? []) {
    if (k?.value === undefined || k?.value === null || k?.value === "") continue
    const value = String(k.value)
    // 🛑 ПРИЗНАК СЛУЖЕБНОГО — НЕ ДЛИНА, А ФОРМА: фигурные скобки с `"entity"`, разделитель движка,
    // заголовок его раздела. Такую находку не показываем вовсе: обрезать её значит показать огрызок.
    if (/<SEP>|"entity\d?"\s*:|Knowledge Graph Data/.test(value)) continue
    const kind = String(k?.found_by ?? "table")
    if (!buckets.has(kind)) buckets.set(kind, [])
    // 218-10: у связанного сказано, ПОЧЕМУ оно здесь — «об этом же» или «сказано следом»
    // 218-11: у второго круга сказано, ЧЕРЕЗ КОГО к находке пришли — иначе она читается как ответ на вопрос напрямую
    const via = kind === "graph2" && k?.via ? (lang === "en" ? ` — via ${k.via}` : ` — через «${k.via}»`) : ""
    const why = kind === "link" && k?.link_reason ? ` — ${(LINK_WHY[lang] ?? LINK_WHY.en)[k.link_reason] ?? k.link_reason}` : ""
    buckets.get(kind).push(`  • ${value}${whenWhere(k, lang)}${via}${why}`)
  }

  const parts = []
  if (asked) parts.push(lang === "en" ? `You asked about: ${asked}.` : `Вы спрашиваете о: ${asked}.`, "")
  // 🔒 218-12: ОТВЕТ РАЗМЫШЛЕНИЯ — ПЕРВЫМ, КОРОТКО; ниже видно, из чего он собран и что в нём из мира.
  if (deepAnswer) parts.push(lang === "en" ? `Answer: ${deepAnswer}` : `Ответ: ${deepAnswer}`, "")
  if (buckets.size) {
    parts.push(say("answer-found", lang))
    // 🔒 ПОРЯДОК ГРУПП — ОТ ТВЁРДОГО К ПОХОЖЕМУ: человек читает сверху вниз и первым видит то, что
    // записано прямо, а не то, что лишь близко. Обратный порядок приучает верить догадке.
    for (const kind of ["self", "table", "graph", "graph2", "vector", "link", "deep-memory", "world", "object"]) {
      const rows = buckets.get(kind)
      if (rows?.length) parts.push("", `${groupWord(kind, lang)}:`, ...rows)
    }
    for (const [kind, rows] of buckets) {
      if (!["self", "table", "graph", "graph2", "vector", "link", "deep-memory", "world", "object"].includes(kind)) parts.push("", `${groupWord(kind, lang)}:`, ...rows)
    }
  } else if (!(objects ?? []).length) {
    // 🔒 218-16: «не знаю» — только когда не нашлось НИЧЕГО. ✗ Живой замер: «Этого я не знаю» стояло
    // строкой выше найденной вещи, и ответ сам себе противоречил.
    const said = String(what_happened ?? "").trim()
    parts.push(said ? said.charAt(0).toUpperCase() + said.slice(1) : "")
  } else {
    parts.push(say("answer-found", lang))
  }

  // 🔒 218-16: НАЙДЕННАЯ ВЕЩЬ — ЧЕЛОВЕЧЕСКОЙ СТРОКОЙ: что это, коротко о чём, какого рода. ✗ Живой замер:
  // «- [] 404.jpg» — пустые скобки и имя файла читались как служебный мусор.
  const things = (objects ?? []).map((o) => {
    const kind = o.kind ?? kindFromMime(o.mime)
    const about = String(o.summary ?? "").trim().split(/\n/)[0].slice(0, 180)
    // подпись — в именительном падеже: «фотография», а не «фотографию» из лида «вы загрузили …»
    const NOUN = {
      en: { audio: "audio", code: "code", document: "document", image: "photo", pdf: "PDF", video: "video", web: "page" },
      ru: { audio: "аудиозапись", code: "код", document: "документ", image: "фотография", pdf: "PDF", video: "видео", web: "страница" },
    }
    const what = (NOUN[lang] ?? NOUN.en)[kind] ?? (lang === "en" ? "file" : "файл")
    const title = o.title || o.name || o.id || "?"
    return `  • ${title}${about && about !== title ? ` — ${about}` : ""} (${what}${o.messageId ? (lang === "en" ? `, record №${o.messageId}` : `, запись №${o.messageId}`) : ""})`
  })
  if (things.length) parts.push("", `${groupWord("object", lang)}:`, ...things)

  // 🔒 ТВЁРДОСТЬ ГОВОРИТСЯ СЛОВАМИ И В КОНЦЕ: обязательный атрибут ответа (требование владельца
  // 2026-09-16) человек обязан прочитать, а не найти кодом в машинной части.
  // 🔒 218-12: ПРЕДЛОЖЕНИЕ ГЛУБЖЕ НАЗЫВАЕТ ЧТО, СКОЛЬКО И КАК СОГЛАСИТЬСЯ — иначе это вежливость, а не выбор.
  if (deeper) {
    const c = deeper.cost ?? {}
    if (deeper.refused) parts.push("", lang === "en" ? `I tried to think deeper and could not: ${deeper.refused}.` : `Я попробовал подумать глубже и не смог: ${deeper.refused}.`)
    else parts.push("", lang === "en"
      ? `No close links in memory. I can go deeper: ${deeper.what}. It usually takes ${c.seconds_from}–${c.seconds_to} s and one model turn on ${c.quota}. To agree, ask again with depth «deep».`
      : `Близких связей в памяти не нашлось. Могу поискать глубже: ${deeper.what}. Обычно это ${c.seconds_from}–${c.seconds_to} секунд и один ход модели — ${c.quota}. Чтобы согласиться, спросите снова с глубиной «deep».`)
  }
  // 🔒 218-12: ЕСЛИ В ОТВЕТЕ ЕСТЬ ЗНАНИЯ О МИРЕ, ТВЁРДОСТЬ ГОВОРИТ ИМЕННО ЭТО — «собрано по смыслу и связям» было бы неправдой.
  const worldIn = (known ?? []).some((k) => k?.found_by === "world")
  const firm = worldIn
    ? (lang === "en" ? "This is a guess: part of the answer is the model’s general knowledge, not your memory." : "Это предположение: часть ответа — общие знания модели, а не ваша память.")
    : (FIRMNESS[lang] ?? FIRMNESS.en)[String(certainty ?? "")]
  if (firm && buckets.size) parts.push("", firm)
  return withFeedback(parts, lang, invite)
}

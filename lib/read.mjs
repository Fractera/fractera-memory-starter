// ЧТЕНИЕ: ТАБЛИЦА ИЛИ ГРАФ — ОДНИМ РЕШЕНИЕМ, И ЧЕСТНОЕ «НЕ ЗНАЮ» (201-6).
//
// 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-14: обещание «искать без искусственного интеллекта» аннулировано —
// «Лишний костыль который тратит время и отвечает только на английском языке». Прежний механический
// поиск сравнивал слова русского вопроса с английскими именами родов и промахивался ВСЕГДА, а на
// английском давал уверенные ложные попадания по служебным словам (матрица 200-7: 19/9/0).
//
// 🔒 ЧТО ЕГО ЗАМЕНИЛО: один вызов модели по ТОМУ, ЧТО У ЧЕЛОВЕКА УЖЕ ЗАПИСАНО, решает, о каких
// колонках и таблицах речь; дальше отвечает КОД — из таблицы. Связи и история идут в граф, и только
// если имя из вопроса графу известно.
//
// 🛑 ГРАФ НЕ УМЕЕТ СКАЗАТЬ «НЕ ЗНАЮ» — ИЗМЕРЕНО 201-2: на имя, которого нет, он возвращает пять
// ближайших сущностей и 60 тыс. знаков контекста. Поэтому существование имени проверяется ДО
// вопроса — поиском по меткам, который модель не зовёт вовсе (41–280 мс).

import { dataCall } from "./data-call.mjs"


/**
 * Имена из вопроса — то, чем граф ищет.
 *
 * 🔒 ИМЯ, А НЕ ФРАЗА: измерено 201-2 — по имени нужная сущность первая, по фразе она девятая или не
 * попадает вовсе. Берём слова с заглавной буквы (кроме первого слова предложения, где заглавная
 * ничего не значит) и латинские имена собственные.
 */
export function namesIn(text) {
  const words = String(text ?? "").split(/[^A-Za-zА-Яа-яЁё-]+/).filter(Boolean)
  const out = []
  words.forEach((w, i) => {
    const first = w[0]
    if (i === 0) return
    if (first !== first.toLowerCase() && w.length > 2) out.push(w)
  })
  return [...new Set(out)]
}

/**
 * Основы имени: само имя и его усечения.
 *
 * 🛑 ПОИСК МЕТОК ПОДСТРОЧНЫЙ И ПАДЕЖЕЙ НЕ ЗНАЕТ — измерено 2026-09-08: «Зеленодольске» не находит
 * «Зеленодольск». Человек же спрашивает падежами: «что было с ДенисОМ». Поэтому нестрогость наша, а
 * не его: пробуем имя, потом усечения на 1–3 буквы, и первое, что нашлось, — ответ.
 * ✗ Оплачено прогоном 201-6: «что было с Денисом?» дало «не знаю» при живой метке «Денис».
 * 🔒 УСЕЧЕНИЕ ОГРАНИЧЕНО ТРЕМЯ БУКВАМИ И ОСНОВОЙ НЕ КОРОЧЕ ЧЕТЫРЁХ: дальше начинаются ложные
 * совпадения — «Ден» нашёл бы и «Денвер», и «Денис», и это уже не то же имя.
 */
export function stemsOf(name) {
  const w = String(name ?? "").trim()
  const out = [w]
  for (let cut = 1; cut <= 3; cut += 1) {
    if (w.length - cut >= 4) out.push(w.slice(0, w.length - cut))
  }
  return out
}

/** Какие из имён граф вообще знает. Модель не зовётся; промах здесь и есть честное «не знаю». */
export async function knownLabels(names) {
  const found = []
  for (const name of names) {
    for (const stem of stemsOf(name)) {
      const r = await dataCall(`/service/rag/graph/label/search?q=${encodeURIComponent(stem)}&limit=5`, undefined, "GET")
      const list = Array.isArray(r.body) ? r.body : []
      if (list.length) {
        found.push({ asked: name, by: stem, labels: list.map(String) })
        break
      }
    }
  }
  return found
}

/**
 * Спросить связи — с нашими ключевыми словами и узким окном.
 *
 * 🔒 КЛЮЧЕВЫЕ СЛОВА ДАЁМ МЫ: без них движок зовёт свою модель, чтобы вытащить слова из вопроса —
 * 3538 мс против 666 мс (измерено 189-4). С ними ходов модели ноль.
 * 🔒 `top_k 5` И `chunk_top_k 3` — ИЗМЕРЕНО 201-2: контекст сжимается с ~60 тыс. знаков до 7–10 тыс.,
 * а нужная сущность по имени остаётся первой.
 */
export async function askGraph({ labels, question }) {
  const r = await dataCall("/service/rag/query", {
    chunk_top_k: 3,
    enable_rerank: false,
    hl_keywords: [],
    ll_keywords: labels,
    mode: "local",
    only_need_context: true,
    query: question,
    top_k: 5,
  })
  if (!r.ok) return { ok: false, error: r.error, why: r.why }
  const text = String(r.body?.response ?? r.body?.result ?? "")
  return { ok: true, context: text, size: text.length }
}

// 🪦 ЗДЕСЬ БЫЛ ОТВЕТ ИЗ ТАБЛИЦЫ ПО ВЫБРАННЫМ РОДАМ (`fromTable`) И СЧЁТ СУММ. Родов и таблиц под
// них больше нет (206-1, решение владельца 2026-09-15): чтение идёт по именам в связях и по смыслу
// в векторе, а всё известное о человеке отдаётся из единственной таблицы сообщений.

/**
 * Объекты, годные этому вопросу (ТЗ 200-9, влито сюда).
 *
 * 🔒 ФИЛЬТР ПО «О КОМ» — ЭТО КАЧЕСТВО ОТВЕТА, А НЕ ЗАЩИТА ДАННЫХ (закон четвёртый): память —
 * инструмент одного архитектора, и чужой объект в ответе есть дефект точности.
 * 🔒 ФИЛЬТР ПО РОДУ: спросили про ссылку — паспорт в ответ не идёт. Род намерения берётся из слов
 * вопроса; не узнали род — не сужаем вовсе, потому что пустой ответ хуже лишней строки.
 */
const KIND_WORDS = {
  audio: ["аудио", "запись", "голосов", "audio", "voice"],
  document: ["документ", "файл", "pdf", "договор", "document", "file"],
  image: ["фото", "снимок", "картинк", "изображен", "скан", "photo", "image", "picture"],
  link: ["ссылк", "страниц", "сайт", "статья", "link", "page", "article"],
  video: ["видео", "ролик", "youtube", "video"],
}

export function wantedKinds(question) {
  const q = String(question ?? "").toLowerCase()
  const kinds = []
  for (const [kind, words] of Object.entries(KIND_WORDS)) {
    if (words.some((w) => q.includes(w))) kinds.push(kind)
  }
  return kinds
}

export function filterObjects({ objects, question, who }) {
  const kinds = wantedKinds(question)
  const mine = objects.filter((o) => !o.who || o.who === who)
  const dropped = objects.length - mine.length
  if (kinds.length === 0) return { dropped_alien: dropped, dropped_kind: 0, objects: mine }
  const byKind = mine.filter((o) => !o.kind || kinds.includes(o.kind))
  return { dropped_alien: dropped, dropped_kind: mine.length - byKind.length, objects: byKind }
}

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

// NODE STEP 596-3: the same two moves on a Fractera node. «Does the graph know this name» — the memory's own label index
// (`labels.mjs`), no model, no graph run. «What is connected to it» — the graph element in the memory's space with the memory's own
// keywords (no language model there at all); its structured answer is laid out as the context the reading code always read:
// `"description": "…"` lines for the entities and links, and a numbered list of the memory documents the items came from
// (`[1] memory/<who>/<time>`), so `bridge.mjs` ties every finding back to its table row exactly as before.
import { docNameOf, graphCall } from "./node.mjs"
import { labelsLike } from "./labels.mjs"


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
      const list = labelsLike(stem, 5)
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
  const r = await graphCall("graph-query", {
    chunk_top_k: 3,
    hl_keywords: [],
    ll_keywords: labels,
    mode: "local",
    query: String(question ?? "").trim() || labels.join(", "),
    top_k: 5,
  })
  if (!r.ok) return { ok: false, error: r.error, why: r.why }
  const text = contextOf(r.body)
  return { ok: true, context: text, size: text.length }
}

/** The graph's structured answer as the context text `bridge.mjs` reads (596-3). Nothing found — an empty context. */
export function contextOf(body) {
  if (!body?.found) return ""
  const lines = []
  const sources = []
  const remember = (filePath) => {
    for (const p of String(filePath ?? "").split("<SEP>")) {
      const doc = docNameOf(p.trim())
      if (doc.startsWith("memory/") && !sources.includes(doc)) sources.push(doc)
    }
  }
  lines.push("-----Entities-----")
  for (const e of body.entities ?? []) {
    lines.push(JSON.stringify({ entity: e.entity_name ?? e.entity ?? "", description: String(e.description ?? "") }))
    remember(e.file_path)
  }
  lines.push("-----Relationships-----")
  for (const x of body.relationships ?? []) {
    lines.push(JSON.stringify({ entity1: x.src_id ?? x.entity1 ?? "", entity2: x.tgt_id ?? x.entity2 ?? "", description: String(x.description ?? "") }))
    remember(x.file_path)
  }
  for (const c of body.chunks ?? []) remember(c.file_path)
  lines.push("-----Sources-----")
  sources.forEach((s, i) => lines.push(`[${i + 1}] ${s}`))
  return lines.join("\n")
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
  // 218-16: «запись» снята — память всё называет записями, и слово сужало любой вопрос до голосовых
  audio: ["аудио", "голосов", "аудиозапис", "audio", "voice"],
  document: ["документ", "файл", "pdf", "договор", "код", "модуль", "предложени", "document", "file", "code"],
  image: ["фото", "снимок", "картинк", "изображен", "скан", "photo", "image", "picture"],
  link: ["ссылк", "страниц", "сайт", "статья", "link", "page", "article"],
  video: ["видео", "ролик", "youtube", "video"],
}

/**
 * Слово вопроса называет ГРУППУ, а в таблице лежат РОДА (`KINDS` в `lib/messages.mjs`).
 *
 * 🔒 ОДНО ИМЯ РОДА НА ВСЁ (218-16). ✗ Живой замер на настоящей ссылке: фильтр искал род `link`, а в
 * таблице ссылка записана как `web` — ссылка не находилась вопросом НИКОГДА, хотя её карточка стояла в
 * хранилище первой (0.50). Тем же зазором слово «документ» отбрасывало PDF: род `document`, а PDF — `pdf`.
 * Два имени для одного рода расходятся молча; здесь они сведены к именам таблицы.
 */
const GROUP_KINDS = {
  audio: ["audio"],
  document: ["document", "pdf", "markdown", "html", "code", "text"],
  image: ["image"],
  link: ["web"],
  video: ["video"],
}

export function wantedKinds(question) {
  const q = String(question ?? "").toLowerCase()
  const kinds = []
  for (const [group, words] of Object.entries(KIND_WORDS)) {
    if (words.some((w) => q.includes(w))) kinds.push(...(GROUP_KINDS[group] ?? [group]))
  }
  return [...new Set(kinds)]
}

export function filterObjects({ objects, question, who }) {
  const kinds = wantedKinds(question)
  // 🔒 БЕЗ ФИЛЬТРА ПО АВТОРУ (218-16) — ТЕМ ЖЕ ЗАКОНОМ, ЧТО У ТАБЛИЦЫ (207-3) И ВЕКТОРА (218-5):
  // знание памяти общее. ✗ Живой замер на настоящих файлах: снимок нашёлся в хранилище ПЕРВЫМ (0.56),
  // а в ответ не попал — его строка несла другого автора, и он был отброшен как «чужой». Шесть вещей
  // из шести легли и ни одна не нашлась.
  void who
  const mine = objects
  const dropped = 0
  if (kinds.length === 0) return { dropped_alien: dropped, dropped_kind: 0, objects: mine }
  const byKind = mine.filter((o) => !o.kind || kinds.includes(o.kind))
  return { dropped_alien: dropped, dropped_kind: mine.length - byKind.length, objects: byKind }
}

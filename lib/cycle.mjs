// ВТОРОЙ КРУГ ЧТЕНИЯ — НЕ ГЛУБЖЕ ДВУХ УРОВНЕЙ, СО СВЕРКОЙ (218-11).
//
// 🎯 ЦЕПОЧКА ВЛАДЕЛЬЦА, ступень 5: «пытаемся получить результат через граф LightRAG, при необходимости
// повторяем несколько циклов в глубину не более двух уровней, анализируя связи с векторной базой данных,
// реляционным локальным хранилищем и объектным хранилищем».
//
// ✗ ЧТО БЫЛО. Главная рисовала этот пункт зелёным, а в коде был один проход: граф → строки. Вопрос
// «у кого работает Петя и где тот живёт» находил «Петя работает у Ивана» и останавливался — то, что
// Иван живёт в Севилье, лежало в памяти и не приходило никогда. Сноска *⁷ говорила это честно.
//
// 🔒 КРУГ ВТОРОЙ ИДЁТ ОТ НОВЫХ ИМЁН НАЙДЕННОГО, А НЕ ОТ ВОПРОСА. Имена вопроса уже спрошены первым
// кругом; повторять их — платить второй раз за то же.
// 🔒 СВЕРКА С ТАБЛИЦЕЙ ОБЯЗАТЕЛЬНА. Граф собирает сущности из текста и сливает описания: он способен
// предложить документ, который лишь похож. Находка второго круга остаётся, только если (1) она есть
// строкой в таблице — значит это было сказано, и (2) в ней то самое имя, через которое к ней пришли.
// Иначе это домысел хранилища, а не память.
// 🔒 ОБЪЕКТЫ НЕ ИЩУТСЯ ЗАНОВО: строка уже называет `object_id`, и находка несёт его дальше.
// 🔒 ХОДОВ МОДЕЛИ НОЛЬ, УРОВНЕЙ НЕ БОЛЬШЕ ДВУХ. Третий круг — это уже «глубже» из пункта 5.3, и он
// делается только с согласия человека, а не молча.

import { rowsBySources, sourcesOf } from "./bridge.mjs"
import { askGraph, knownLabels } from "./read.mjs"

/** Не больше пяти новых имён: шестое уже не уточняет вопрос, а раздувает чтение. */
const MAX_NAMES = 5

/** Слова с заглавной буквы в любом месте фразы (первое слово тоже: «Иван живёт…»). */
const capitalized = (text) =>
  String(text ?? "")
    .split(/[^\p{L}-]+/u)
    .filter((w) => w.length > 2 && w[0] !== w[0].toLowerCase())

const stem = (w) => String(w).toLowerCase().slice(0, 4)

/**
 * Называет ли текст хотя бы одно из имён — общими четырьмя буквами (падежи).
 *
 * 🔒 ТА ЖЕ СВЕРКА И ДЛЯ ПЕРВОГО КРУГА (218-11). ✗ Живой замер: на «что любит Марина» граф вернул и
 * «Петя работает в Мадриде» — соседа по графу, в котором Марины нет. От этого мусора второй круг
 * пошёл дальше, к Пете и чехлам. Граф отдаёт окрестность, а не ответ; что из окрестности сказано о
 * спрошенном, решает таблица.
 */
export function mentionsAny(text, names) {
  const own = new Set(capitalized(text).map(stem))
  return (names ?? []).some((n) => own.has(stem(n)))
}

/**
 * Второй круг.
 *
 * @param {{question: string, known: Array<{value?: string, message_id?: number}>}} a
 * @returns {Promise<{found: object[], names: string[], ms: number, reason: string}>}
 */
export async function secondCycle({ known, question }) {
  const started = Date.now()
  const done = (reason, found = [], names = []) => ({ found, ms: Date.now() - started, names, reason })

  const asked = new Set(capitalized(question).map(stem))
  const fresh = []
  for (const k of known ?? []) {
    for (const w of capitalized(k?.value)) {
      if (asked.has(stem(w)) || fresh.some((f) => stem(f) === stem(w))) continue
      fresh.push(w)
    }
  }
  const names = fresh.slice(0, MAX_NAMES)
  if (!names.length) return done("no-new-names")

  const labels = await knownLabels(names)
  if (!labels.length) return done("graph-knows-none", [], names)
  const flat = labels.flatMap((l) => l.labels)

  // 🔒 ВТОРОЙ КРУГ СПРАШИВАЕТ О НОВЫХ ИМЕНАХ, А НЕ ИСХОДНЫЙ ВОПРОС. ✗ Живой замер: на «у кого работает
  // Стас» второй круг шёл с тем же вопросом, и граф отдавал ссылки на куски, подходящие под ВОПРОС, —
  // «Геннадий Павлович живёт в Севилье» под него не подходит и не пришёл никогда.
  const got = await askGraph({ labels: flat, question: names.join(" ") })
  if (!got.ok || !got.context) return done(`graph-silent: ${got.error ?? "empty"}`, [], names)

  const have = new Set((known ?? []).map((k) => Number(k?.message_id)).filter(Boolean))
  const rows = await rowsBySources(sourcesOf(got.context))

  const found = []
  for (const r of rows) {
    if (have.has(Number(r.id))) continue
    // 🔒 СВЕРКА: в строке обязано быть то имя, через которое к ней пришли.
    const own = new Set(capitalized(r.summary).map(stem))
    const via = names.find((n) => own.has(stem(n)))
    if (!via) continue
    have.add(Number(r.id))
    found.push({
      at: r.scope_at ?? null,
      claim: null,
      found_by: "graph2",
      message_id: r.id,
      vector_id: r.vector_id ?? null,
      object_id: r.object_id ?? null,
      place: r.scope_place ?? null,
      place_source: r.scope_source ?? null,
      said_at: r.created_at ?? null,
      value: String(r.summary ?? "").slice(0, 1000),
      via,
      what: "через связь второго уровня",
    })
  }
  return done(found.length ? "found" : "nothing-confirmed", found, names)
}

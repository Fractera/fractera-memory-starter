// МОСТ МЕЖДУ ХРАНИЛИЩАМИ: ГРАФ НАЗЫВАЕТ ДОКУМЕНТ — ТАБЛИЦА ГОВОРИТ ПРАВДУ (218-2).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-16: «сначала мы ищем запись в агентном RAG, потом сопоставляем эту
// запись с таблицами базы данных, извлекаем из них идентификаторы объектного хранилища и векторного
// хранилища, при необходимости их анализируем».
//
// ✗ ЧТО БЫЛО ДО ЭТОГО ФАЙЛА. Три хранилища опрашивались ПАРАЛЛЕЛЬНО и независимо, каждое отдавало
// своё «похожее», а ответ был склейкой похожего. Измерено живым блоком владельца: граф знал «Петя
// работает в Мадриде», а вектор на вопрос про ту же связь не знал ничего — они друг друга не
// спрашивали. Наружу при этом уезжал сырой дамп хранилища, и человек читал служебный JSON.
//
// 🔒 ПЕРЕХОД ИДЁТ ПО ИДЕНТИФИКАТОРУ, А НЕ ПО ПЕРЕСКАЗУ. Граф печатает «Reference Document List» —
// имена документов вида `memory/<кто>/<время>`, и ровно они лежат в колонке `rag_source` строки.
// Мост был записан при каждой записи с 206-3 и НЕ ЧИТАЛСЯ НИ РАЗУ: приём «кто её зовёт» даёт ноль.
//
// 🔒 ВРЕМЯ И МЕСТО БЕРУТСЯ У СТРОКИ, А НЕ У ПЕРЕСКАЗА. ✗ Оплачено тем же блоком: владелец увидел
// «набор огрызков слов, не связанных по датам». У строки есть `created_at` (когда сказано),
// `scope_at` и `scope_place` (о каком времени и месте речь) — и это разные вещи: фраза, сказанная
// сегодня, может быть о пятнице.

import { MESSAGES } from "./messages.mjs"
import { sql } from "./store.mjs"

/**
 * Имена документов из ответа графа. Пусто — граф ответил без ссылок, и это законный случай.
 *
 * 🔒 БЕРЁМ ИМЕННО СПИСОК ССЫЛОК, А НЕ ВСЁ, ЧТО ПОХОЖЕ НА ПУТЬ: строка `[3] memory/<кто>/<время>`
 * стоит в своём разделе, и её формат задан движком, а не угадан нами.
 */
export function sourcesOf(context) {
  const t = String(context ?? "")
  const out = []
  for (const m of t.matchAll(/^\s*\[\d+\]\s+(memory\/[^\s]+)\s*$/gm)) out.push(m[1])
  return [...new Set(out)]
}

/**
 * Человеческие описания связей из ответа графа — запасной путь, когда строки нет.
 *
 * 🔒 ТОЛЬКО ОПИСАНИЯ, БЕЗ ОБЁРТКИ: наружу не уезжают ни имена сущностей движка, ни `<SEP>`, ни JSON.
 * 🛑 СТАРЫЕ ЗАПИСИ ЖИВУТ В ГРАФЕ БЕЗ СТРОКИ В ТАБЛИЦЕ — таблица моложе графа. Выбросив их, память
 * забыла бы то, что помнит.
 */
export function linksOf(context) {
  const out = []
  for (const m of String(context ?? "").matchAll(/"description":\s*"((?:[^"\\]|\\.)*)"/g)) {
    for (const piece of m[1].split("<SEP>")) {
      const s = piece.replace(/\\n/g, " ").replace(/\\"/g, '"').trim()
      if (s.length >= 12 && !out.includes(s)) out.push(s)
    }
  }
  return out
}

/**
 * Строки единственной таблицы по именам документов графа.
 *
 * 🔒 СПИСОК КОЛОНОК НАЗВАН ПОИМЁННО: `SELECT *` по этой таблице запрещён федеральным законом —
 * лестница `ALTER` дописывает колонки в конец, и порядок у поднятой и вновь созданной таблицы разный.
 */
export async function rowsBySources(sources) {
  const list = (sources ?? []).filter(Boolean)
  if (!list.length) return []
  const holes = list.map(() => "?").join(", ")
  const r = await sql(
    `SELECT id, created_at, summary, title, kind, object_id, vector_id, rag_source, scope_at, scope_place, scope_source, source_path
       FROM ${MESSAGES} WHERE rag_source IN (${holes}) ORDER BY id DESC`,
    list,
  )
  return r.ok && Array.isArray(r.rows) ? r.rows : []
}

/**
 * Строки таблицы по именам кусков вектора.
 *
 * 🔒 КЛЮЧ У ВЕКТОРА И У ГРАФА ОДИН И ТОТ ЖЕ — `memory/<кто>/<время>`, и он же лежит в колонке
 * `vector_id`. Значит запасной вход (вектор) приводит к той же правде, что основной (граф): к
 * строке. Без этого вектор отдавал КУСОК ТЕКСТА как ответ — без времени, без места, без источника.
 */
export async function rowsByVectorIds(ids) {
  const list = (ids ?? []).filter(Boolean)
  if (!list.length) return []
  const holes = list.map(() => "?").join(", ")
  const r = await sql(
    `SELECT id, created_at, summary, title, kind, object_id, vector_id, rag_source, scope_at, scope_place, scope_source, source_path
       FROM ${MESSAGES} WHERE vector_id IN (${holes}) ORDER BY id DESC`,
    list,
  )
  return r.ok && Array.isArray(r.rows) ? r.rows : []
}

/**
 * Находка для ответа человеку: что сказано, когда и где.
 *
 * 🔒 «КОГДА СКАЗАНО» И «О КОГДА» — РАЗНЫЕ ПОЛЯ, И ОБА НАЗЫВАЮТСЯ. Пустое значит «не знаю», а не
 * «сегодня» и не «везде»: уверенное умолчание дороже отсутствующего значения (федеральный закон 144).
 */
export function foundFromRow(row) {
  return {
    at: row.scope_at ?? null,
    claim: null,
    found_by: "graph",
    // 218-10: номер строки нужен, чтобы подтянуть связанные с ней сообщения
    message_id: row.id ?? null,
    vector_id: row.vector_id ?? null,
    object_id: row.object_id ?? null,
    place: row.scope_place ?? null,
    place_source: row.scope_source ?? null,
    said_at: row.created_at ?? null,
    value: String(row.summary ?? "").slice(0, 1000),
    what: "сказанное",
  }
}

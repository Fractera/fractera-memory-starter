// «ТО КАФЕ» — МЕСТО, РАЗРЕШЁННОЕ ПО ИСТОРИИ САМОГО ЧЕЛОВЕКА (218-15, пункт 3.3 цепочки).
//
// 🎯 ЦЕПОЧКА ВЛАДЕЛЬЦА, ступень 3: «присутствие в запросе данных о геометке: географические координаты
// в чистом виде, название города, названия объектов в городе, которые можно было бы связать в истории с
// определённой геометкой».
//
// 🔒 ЭТО ВЫВОД, А НЕ СКАЗАННОЕ. Человек сказал «в том кафе»; «кафе «Лима» на Гран-Виа» память вывела из
// своей же истории. Поэтому источник места — `guess`, а основание — номер записи, из которой оно взято.
// Уверенное умолчание дороже отсутствующего значения (закон 144): догадка без основания через неделю
// неотличима от слов человека.
// 🔒 НЕСКОЛЬКО КАНДИДАТОВ — НЕ УГАДЫВАТЬ. Два разных кафе в истории значат, что «то кафе» можно понять
// двояко; место остаётся пустым («не знаю где»), а кандидаты названы в ходе мыслей.
// 🔒 ХОДОВ МОДЕЛИ НОЛЬ: модель уже отметила в разборе, что место названо указанием; ищет код по таблице.

import { MESSAGES } from "./messages.mjs"
import { sql } from "./store.mjs"

/** Слова-указатели: по ним объект не ищется — они есть в любой фразе. */
const POINTERS = new Set(["тот", "того", "том", "тому", "та", "той", "ту", "то", "этот", "этом", "эта", "этой", "это", "наш", "наша", "наше", "нашем", "нашей", "мой", "моём", "моей", "там", "туда", "же", "the", "that", "our", "same"])

/** Основы предметных слов указания: «в том кафе» → «кафе»; «в нашем офисе» → «офис». */
export function refStems(ref) {
  return String(ref ?? "")
    .toLowerCase()
    .split(/[^\p{L}-]+/u)
    .filter((w) => w.length >= 4 && !POINTERS.has(w))
    .map((w) => w.slice(0, Math.max(4, w.length - 2)))
}

/**
 * Разрешить место по истории.
 *
 * @param {string} ref — как место названо: «то кафе», «наш офис»
 * @param {number} [beforeId] — искать только в записях раньше этой (своя строка не в счёт)
 * @returns {Promise<{place: string, fromId: number} | {ambiguous: string[]} | null>}
 */
export async function resolvePlaceRef(ref, beforeId = null) {
  const stems = refStems(ref)
  if (!stems.length) return null
  const r = await sql(
    `SELECT id, scope_place FROM ${MESSAGES}
      WHERE scope_place IS NOT NULL AND scope_place <> ''${beforeId ? " AND id < ?" : ""}
      ORDER BY id DESC LIMIT 300`,
    beforeId ? [Number(beforeId)] : [],
  )
  const rows = r.ok ? r.rows ?? [] : []
  const hits = rows.filter((x) => stems.some((s) => String(x.scope_place).toLowerCase().includes(s)))
  const distinct = [...new Set(hits.map((x) => String(x.scope_place)))]
  if (!distinct.length) return null
  if (distinct.length > 1) return { ambiguous: distinct.slice(0, 5) }
  return { fromId: Number(hits[0].id), place: distinct[0] }
}

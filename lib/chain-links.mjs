// СВЯЗЬ СООБЩЕНИЯ С ТЕМИ САМЫМИ ПРЕЖНИМИ — ПО СМЫСЛУ И ПО ВРЕМЕНИ (218-10).
//
// 🎯 ЦЕПОЧКА ВЛАДЕЛЬЦА, ступень 2: «выявить связь данного сообщения с цепочкой предыдущих сообщений,
// чтобы построить связанный диалог в конкретной области запроса».
//
// ✗ ЧТО БЫЛО. Таблица связей и её писатель существовали с 195-4, но звали их только отзыв (к своему
// ответу) и вложения (к своей фразе). Обычная запись и вопрос не связывались ни с чем: каждое
// сообщение жило островом, и ответ собирался из кусков, не знающих друг о друге.
// Приём «кто её зовёт» дал это за одну команду.
//
// 🔒 ДВЕ ПРИЧИНЫ, И ОНИ РАЗНЫЕ:
//   · «meaning» — об одном и том же: поиск по смыслу выше измеренного порога 0.40;
//   · «time»    — сказано подряд: предыдущее сообщение в пределах одного разговора (30 минут тишины,
//                 тот же измеренный порог, что у приглашения прокомментировать, 217-1).
// 🔒 ХОДОВ МОДЕЛИ НОЛЬ: одна свёртка фразы в вектор, миллисекунды. Связь не угадывается моделью.
// 🔒 НЕ БОЛЬШЕ ТРЁХ СВЯЗЕЙ ПО СМЫСЛУ: четвёртая похожая фраза уже не уточняет разговор, а размывает его.

import { NEW_SESSION_MS } from "./invite.mjs"
import { linkMessages, MESSAGES } from "./messages.mjs"
import { searchSaid } from "./said-vector.mjs"
import { sql } from "./store.mjs"
import { rowsByVectorIds } from "./bridge.mjs"

const MAX_MEANING = 3

/**
 * «Те самые прежние» — это общее ДЕЙСТВУЮЩЕЕ ЛИЦО, а не общая тема (218-10, живой замер).
 *
 * ✗ ОПЛАЧЕНО ЗАМЕРОМ: при одном пороге близости «Оля заказала кабели» связалась с «Петя заказал
 * чехлы» (0.545), а «Оля забрала заказ» — со «встречей по поставке аксессуаров» (0.521). Порог 0.40
 * измерен на паре «вопрос → запись»; две записи между собой похожи сильнее, и для них он не годится.
 * Похожая тема — не разговор об одном и том же.
 *
 * 🔒 ПОЭТОМУ ПО СМЫСЛУ СВЯЗЫВАЕТСЯ ТОЛЬКО ТО, ГДЕ ЕСТЬ ОБЩЕЕ ИМЯ, либо почти дословный повтор.
 * Имя — слово с заглавной буквы в ЛЮБОМ месте фразы: `namesIn` из чтения первое слово пропускает, а
 * «Оля заказала…» начинается именно с имени. Падежи — общими четырьмя буквами, как у меток графа.
 */
const REPEAT_SCORE = 0.7
const stemsOfNames = (text) =>
  new Set(
    String(text ?? "")
      .split(/[^\p{L}-]+/u)
      .filter((w) => w.length > 2 && w[0] !== w[0].toLowerCase())
      .map((w) => w.toLowerCase().slice(0, 4)),
  )
const shareName = (a, b) => {
  const x = stemsOfNames(a)
  for (const s of stemsOfNames(b)) if (x.has(s)) return true
  return false
}

/**
 * Связать только что записанное сообщение с прежними.
 *
 * @param {{messageId: number, text: string, ownVectorId?: string|null}} a
 * @returns {Promise<{meaning: Array<{id:number, score:number}>, time: number|null, errors: string[]}>}
 */
export async function linkToEarlier({ messageId, text, ownVectorId = null }) {
  const out = { errors: [], meaning: [], time: null }
  const id = Number(messageId)
  if (!Number.isInteger(id) || id <= 0) return { ...out, errors: ["bad-message-id"] }

  // ── ПО ВРЕМЕНИ: предыдущее сообщение того же разговора ──────────────────────────────────────
  // 🔒 ПРОДОЛЖЕНИЕМ РАЗГОВОРА СЧИТАЕТСЯ ТОЛЬКО СТРОКА ТОГО ЖЕ ИСТОЧНИКА (219-2).
  // ✗ Оплачено негативным контролем в тот же час: связь ставилась между ЛЮБЫМИ соседними строками в
  // пределах получаса, и в один «разговор» слиплись одиннадцать ходов из разных источников. Досье
  // строителю пришло бы с чужой перепиской — а это хуже пустого досье.
  // 🛑 ИСТОЧНИК СРАВНИВАЕТСЯ ВКЛЮЧАЯ ПУСТОЙ: две строки без пути — это один поток «неизвестно откуда»,
  // а не повод связать их с чем угодно.
  const prev = await sql(
    `SELECT id, created_at FROM ${MESSAGES}
      WHERE id < ?
        AND COALESCE(source_path, '') = COALESCE((SELECT source_path FROM ${MESSAGES} WHERE id = ?), '')
      ORDER BY id DESC LIMIT 1`,
    [id, id],
  )
  const row = prev.ok ? (prev.rows ?? [])[0] : null
  if (row && Date.now() - Date.parse(row.created_at) < NEW_SESSION_MS) {
    const r = await linkMessages(id, row.id, { reason: "time" })
    if (r.ok) out.time = Number(row.id)
    else out.errors.push(`time: ${r.error}`)
  }

  // ── ПО СМЫСЛУ: похожее, сказанное раньше ────────────────────────────────────────────────────
  const q = String(text ?? "").trim()
  if (q) {
    const near = await searchSaid({ k: MAX_MEANING + 2, question: q })
    if (near.ok) {
      const hits = near.near.filter((h) => h.id !== ownVectorId)
      const rows = await rowsByVectorIds(hits.map((h) => h.id))
      const scoreOf = new Map(hits.map((h) => [String(h.id), h.score]))
      for (const r of rows) {
        if (out.meaning.length >= MAX_MEANING) break
        const other = Number(r.id)
        if (other === id || out.meaning.some((m) => m.id === other)) continue
        const score = Number((scoreOf.get(String(r.vector_id)) ?? 0).toFixed(3))
        if (!shareName(q, r.summary) && score < REPEAT_SCORE) continue
        const w = await linkMessages(id, other, { reason: "meaning", score })
        if (w.ok) out.meaning.push({ id: other, score })
        else out.errors.push(`meaning: ${w.error}`)
      }
    } else {
      out.errors.push(`meaning: ${near.refused}`)
    }
  }
  return out
}

/**
 * Сообщения, связанные с найденными (один шаг), — для сборки ответа.
 *
 * 🔒 ОДИН ШАГ, А НЕ ОБХОД: связь связи уже не о вопросе. Два уровня — это пункт 5.2 цепочки, и он
 * строится отдельно, а не прячется здесь.
 * 🔒 ВОПРОСЫ НЕ ПОДТЯГИВАЮТСЯ: память не отвечает собственными вопросами (закон 207-3).
 * 🔒 ПОДТЯГИВАЕТСЯ ТОЛЬКО СВЯЗЬ ПО СМЫСЛУ. ✗ Живой замер: в ответ «что заказала Оля» попал «джаз по
 * вечерам» — лишь потому, что сказан следом. Связь по времени отвечает «разговор продолжается» и нужна
 * вопросу («а когда он их заберёт?»), но в содержание ответа она не годится.
 */
export async function linkedRows(messageIds, { limit = 5 } = {}) {
  const ids = [...new Set((messageIds ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0))]
  if (!ids.length) return []
  const holes = ids.map(() => "?").join(", ")
  const r = await sql(
    `SELECT l.reason, l.score, m.id, m.created_at, m.summary, m.scope_at, m.scope_place, m.object_id, m.vector_id, m.scope_source
       FROM messages_that_came_into_memory__links l
       JOIN ${MESSAGES} m
         ON m.id = CASE WHEN l.message_id IN (${holes}) THEN l.previous_message_id ELSE l.message_id END
      WHERE (l.message_id IN (${holes}) OR l.previous_message_id IN (${holes}))
        AND m.id NOT IN (${holes})
        AND (m.direction IS NULL OR m.direction NOT IN ('recall', 'feedback'))
        AND l.reason = 'meaning'
      ORDER BY m.id DESC LIMIT ${Number(limit) || 5}`,
    [...ids, ...ids, ...ids, ...ids],
  )
  const seen = new Set()
  return (r.ok ? r.rows ?? [] : []).filter((x) => (seen.has(x.id) ? false : seen.add(x.id)))
}

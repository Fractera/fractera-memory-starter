// РАЗГОВОР — ЭТО ЦЕПОЧКА ХОДОВ, И ОНА ЧИТАЕТСЯ ПО СВЯЗЯМ (219-2).
//
// 🎯 ТРЕБОВАНИЕ ВЛАДЕЛЬЦА 2026-09-17: «это может быть сессия: вопрос — ответ — уточнение — ответ —
// уточнение — ответ — финальный ответ-резюме — запрос на комментарий — ответ пользователя. Всю эту
// цепочку вместе с датами и ссылками доставить в pre-step».
//
// 🔒 СВЯЗИ УЖЕ ЕСТЬ, И ЭТО ИЗМЕРЕНО, А НЕ ПРЕДПОЛОЖЕНО. После 219-1 ответ стал строкой, и цепочка
// сложилась САМА, без единой правки связывания:
//   #275 вопрос    → #274 (time)
//   #276 ОТВЕТ     → #275 (answer)
//   #277 уточнение → #276 (time)   ← уточнение цепляется за ОТВЕТ, а не за прошлый вопрос
//   #278 ОТВЕТ     → #277 (answer)
// Поэтому здесь только ЧИТАТЕЛЬ: писать новые связи не нужно.
//
// 🔒 ГРАНИЦУ РАЗГОВОРА ЗАДАЁТ САМА СВЯЗЬ, А НЕ ВТОРОЕ ПРАВИЛО. `linkToEarlier` ставит `time` только
// внутри 30 минут (`NEW_SESSION_MS`, измерено в 217-1) — значит обход по связям обрывается там же,
// где обрывается разговор. Второй порог здесь разошёлся бы с первым на первой же правке.
//
// 🛑 ОБХОД ПО ЧИСЛУ ХОДОВ ОГРАНИЧЕН: разговор из тысячи реплик — это не разговор, а склейка, и
// досье из него никто не прочитает. Предел назван числом, а не подразумевается.

import { LINKS, MESSAGES } from "./messages.mjs"
import { sql } from "./store.mjs"

/** Разобрать сохранённый ход мыслей. Битое значение — пустая цепочка, а не падение всего разговора. */
function parseChain(raw) {
  if (!raw) return []
  try {
    const v = JSON.parse(String(raw))
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** Сколько ходов разговора собираем максимум. */
export const MAX_TURNS = 40

/**
 * Причины связей, по которым идёт разговор.
 *
 * 🔒 `meaning` СЮДА НЕ ВХОДИТ: она про схожесть фраз, а не про ход разговора. Впусти её — и в цепочку
 * притянет всё, что когда-либо говорилось на ту же тему, из любого дня.
 * ✗ `feedback` ДОБАВЛЕН 219-6 ПОСЛЕ ПРОГОНА ПРИБОРА: комментарий человека связывался с ответом
 * БЕЗЫМЯННО, и в собранный разговор не попадал — то есть в досье не было видно самой жалобы, ради
 * которой разбор и затевается.
 */
const CHAIN_REASONS = ["time", "answer", "feedback"]

/**
 * Собрать разговор, в котором участвует эта строка.
 *
 * @param {number} messageId — любая строка разговора (обычно прокомментированный ответ)
 * @returns {Promise<{ok: boolean, turns: Array<object>, error?: string}>} ходы ПО ПОРЯДКУ
 */
export async function conversationOf(messageId) {
  const start = Number(messageId)
  if (!Number.isInteger(start) || start <= 0) return { error: "bad-message-id", ok: false, turns: [] }

  const seen = new Set([start])
  const wave = [start]
  const reasons = `'${CHAIN_REASONS.join("', '")}'`

  // Обход в обе стороны: назад — к началу разговора, вперёд — к тому, что было сказано после.
  while (wave.length && seen.size < MAX_TURNS) {
    const here = wave.splice(0, wave.length)
    const list = here.join(", ")
    const r = await sql(
      `SELECT message_id, previous_message_id FROM ${LINKS}
        WHERE reason IN (${reasons}) AND (message_id IN (${list}) OR previous_message_id IN (${list}))`,
    )
    if (!r.ok) return { error: r.error ?? "links-read-failed", ok: false, turns: [] }
    for (const l of r.rows ?? []) {
      for (const side of [Number(l.message_id), Number(l.previous_message_id)]) {
        if (seen.has(side) || seen.size >= MAX_TURNS) continue
        seen.add(side)
        wave.push(side)
      }
    }
  }

  const rows = await sql(
    `SELECT id, created_at, direction, summary, title, source_path, answer_depth, answer_ms, answer_model, answer_chain, feedback_kind
       FROM ${MESSAGES} WHERE id IN (${[...seen].join(", ")}) ORDER BY id`,
  )
  if (!rows.ok) return { error: rows.error ?? "rows-read-failed", ok: false, turns: [] }

  // 🔒 ПОРЯДОК — ПО НОМЕРУ СТРОКИ, И ЭТО НЕ ВОЗВРАТ К УГАДЫВАНИЮ. Номер здесь не ИЩЕТ участников
  // разговора (их назвали связи), а только упорядочивает уже найденных: строки выдаются счётчиком,
  // и он строго растёт. Время печатается до секунд — два хода внутри секунды сортировкой по нему
  // поменялись бы местами (закон 83).
  return {
    ok: true,
    turns: (rows.rows ?? []).map((x) => ({
      about: x.title ?? null,
      // 🔒 219-3: РАЗМЫШЛЕНИЯ ОТДАЮТСЯ РАЗОБРАННЫМИ, А НЕ СТРОКОЙ JSON: читатель досье не обязан знать,
      // как они хранятся. Испорченная запись не роняет разговор — она становится пустой цепочкой.
      chain: parseChain(x.answer_chain),
      at: x.created_at,
      depth: x.answer_depth ?? null,
      direction: x.direction,
      feedbackKind: x.feedback_kind ?? null,
      from: x.source_path ?? null,
      id: x.id,
      model: x.answer_model ?? null,
      ms: x.answer_ms ?? null,
      text: String(x.summary ?? ""),
    })),
  }
}

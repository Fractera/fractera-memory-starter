// ГЛУБЖЕ — ТОЛЬКО С СОГЛАСИЯ: ПРЕДЛОЖЕНИЕ С ЦЕНОЙ (5.3) И РАЗМЫШЛЕНИЕ СО ЗНАНИЯМИ О МИРЕ (5.4), 218-12.
//
// 🎯 ЦЕПОЧКА ВЛАДЕЛЬЦА, ступень 5: «если на усмотрение модели близких связей не обнаружено, рекомендуется
// предложить пользователю согласовать более глубинные исследования — поиск с размышлением и обращением к
// собственным знаниям модели, чтобы связать результаты с реальной моделью мира».
//
// 🔒 5.3 И 5.4 — ОДИН МЕХАНИЗМ, А НЕ ДВА ПУНКТА. Предлагать то, чего нет, — ложь: сноска *⁴ так и
// говорила, «предложение углубиться — это слова, а не поле, на которое зовущий может ответить».
// Поэтому предложение называет, ЧТО будет сделано, ЧТО это стоит и КАК согласиться, а согласие
// (`depth: "deep"`) действительно запускает размышление.
//
// 🔒 ЗНАНИЯ МОДЕЛИ О МИРЕ — ЕДИНСТВЕННОЕ МЕСТО, ГДЕ ПАМЯТЬ МОЖЕТ УВЕРЕННО ОШИБИТЬСЯ. Отсюда три правила:
//   · только с согласия, никогда молча;
//   · сказанное из памяти и сказанное из мира лежат в РАЗНЫХ группах и не смешиваются;
//   · утверждение «из памяти» обязано назвать номера записей, на которые опирается, и эти номера
//     проверяются по тому, что модели показали. Без ссылки или со ссылкой на невиданное — выбрасывается:
//     иначе догадка модели выглядела бы воспоминанием человека.

import { MESSAGES } from "./messages.mjs"
import { sql } from "./store.mjs"
import { think } from "./think.mjs"

/**
 * Цена, которую называет предложение.
 *
 * 🔒 ЧИСЛА ИЗМЕРЕНЫ, А НЕ ВЫБРАНЫ: по журналу службы 2026-09-16 вызовы с моделью заняли p50 4,0 с ·
 * p75 11,0 с · p90 32,4 с (248 замеров). Размышление несёт больше текста, чем разбор фразы, поэтому
 * называется диапазон от p75 до p90, а не медиана — обещать быстрее, чем бывает, хуже, чем медленнее.
 */
export const DEEP_COST = { model_turns: 1, seconds_from: 11, seconds_to: 32 }

/** Сколько последних записей показать модели сверх найденного: материал для размышления, а не весь склад. */
const RECENT_FOR_MODEL = 30

/**
 * «Близких связей не нашлось».
 *
 * 🔒 БЛИЗКО — ЭТО ИМЯ И СМЫСЛ ВМЕСТЕ, А НЕ ОДНО ИМЯ (218-12). ✗ Живой замер: «сколько стоит такси из
 * аэропорта Барахас в центр Мадрида» нашло по имени «Петя работает в Мадриде» — и память сочла вопрос
 * отвеченным, предложения глубже не было. Имя в вопросе не делает запись ответом на вопрос.
 * Поэтому находка близка, только если её запись по смыслу ближе к вопросу, чем измеренный порог 0.40.
 * Ответ о самой памяти и уже сделанное размышление близки по определению.
 *
 * @param {object[]} known
 * @param {Map<string, number>} scoreOf — близость записи к вопросу по её `vector_id`
 * @param {number} threshold
 */
export function noCloseLinks(known, scoreOf, threshold) {
  return !(known ?? []).some((k) => {
    const by = String(k?.found_by ?? "")
    if (by === "self" || by === "deep-memory" || by === "world") return true
    if (by === "vector") return Number(k?.score ?? 0) >= threshold
    return Number(scoreOf?.get(String(k?.vector_id ?? "")) ?? 0) >= threshold
  })
}

/** Предложение углубиться — поле, на которое можно ответить, и слова для человека. */
export function offerDeeper(lang) {
  const ru = lang !== "en"
  return {
    accept: { depth: "deep", verb: "recall" },
    cost: { ...DEEP_COST, quota: ru ? "окно подписки Claude на сервере — общее с Telegram-ботом" : "the Claude subscription window on the server, shared with the Telegram bot" },
    depth: "deep",
    what: ru
      ? "подумать над тем, что записано, и привлечь общие знания модели о мире"
      : "reason over what is recorded and bring in the model's general knowledge of the world",
  }
}

const DEEP_PROMPT = `Тебе задали вопрос, и в памяти человека не нашлось прямого ответа. Человек СОГЛАСИЛСЯ,
чтобы ты подумал глубже и привлёк общие знания о мире.

Ниже — вопрос и пронумерованные записи памяти (номер, дата, место, текст).

Верни JSON:
{"answer":"...","from_memory":[{"claim":"...","records":[123]}],"from_world":[{"claim":"..."}]}

Правила:
- "answer": короткий ответ человеку на его языке, 1–3 предложения. Если ответа нет — так и скажи.
- "from_memory": только то, что ВЫВОДИТСЯ из показанных записей. У каждого утверждения — номера записей,
  на которые оно опирается. Нет опоры в записях — это НЕ from_memory.
- "from_world": то, что ты знаешь о мире сам, а не из записей: факты, общие сведения, здравый смысл.
  Эти утверждения человек прочитает с пометкой «не из вашей памяти».
- Не выдумывай записей и номеров. Не пересказывай записи, не относящиеся к вопросу.
- Пустые списки допустимы.`

/**
 * Размышление с согласия.
 *
 * @param {{question: string, known: object[], lang?: string}} a
 * @returns {Promise<{ok: boolean, answer?: string, found?: object[], dropped?: string[], ms?: number, refusal?: string, why?: string}>}
 */
export async function goDeeper({ known, lang = "ru", question }) {
  const started = Date.now()
  const ids = new Set((known ?? []).map((k) => Number(k?.message_id)).filter(Boolean))
  const recent = await sql(
    `SELECT id, created_at, summary, scope_at, scope_place FROM ${MESSAGES}
      -- 🛑 219-6: ОТВЕТЫ ПАМЯТИ ИСКЛЮЧЕНЫ НАРАВНЕ С ВОПРОСАМИ И ОТЗЫВАМИ. Размышление опирается на то,
      -- что рассказал человек; дай ему свои же ответы — и модель начнёт рассуждать о пересказе
      -- пересказа, всё дальше уходя от сказанного.
      WHERE direction IS NULL OR direction NOT IN ('recall', 'feedback', 'answer')
      ORDER BY id DESC LIMIT ${RECENT_FOR_MODEL}`,
  )
  const rows = recent.ok ? recent.rows ?? [] : []
  const shown = new Map()
  for (const k of known ?? []) if (k?.message_id) shown.set(Number(k.message_id), { at: k.at, place: k.place, said: k.said_at, text: k.value })
  for (const r of rows) if (!shown.has(Number(r.id))) shown.set(Number(r.id), { at: r.scope_at, place: r.scope_place, said: r.created_at, text: r.summary })

  const lines = [...shown.entries()].map(([id, r]) =>
    `№${id} [сказано ${String(r.said ?? "").slice(0, 10)}${r.at ? `, когда: ${r.at}` : ""}${r.place ? `, место: ${r.place}` : ""}] ${String(r.text ?? "").slice(0, 400)}`,
  )
  const user = `Язык ответа: ${lang === "en" ? "английский" : "русский"}.\n\nВопрос: ${question}\n\nЗаписи памяти:\n${lines.join("\n") || "(записей нет)"}`

  const r = await think(DEEP_PROMPT, user, { single: true, timeoutMs: 180000 })
  if (!r.ok) return { ms: Date.now() - started, ok: false, refusal: r.refusal, why: r.why }

  const found = []
  const dropped = []
  for (const m of Array.isArray(r.data?.from_memory) ? r.data.from_memory : []) {
    const claim = typeof m?.claim === "string" ? m.claim.trim() : ""
    const refs = (Array.isArray(m?.records) ? m.records : []).map(Number).filter((n) => Number.isInteger(n))
    // 🔒 ОПОРА ПРОВЕРЯЕТСЯ: номер обязан быть среди показанных модели. Невиданный номер — выдумка.
    if (!claim || !refs.length || !refs.every((n) => shown.has(n))) {
      dropped.push(claim || "(пусто)")
      continue
    }
    found.push({ claim: "guess", found_by: "deep-memory", records: refs, value: claim, what: "из памяти после размышления" })
  }
  for (const w of Array.isArray(r.data?.from_world) ? r.data.from_world : []) {
    const claim = typeof w?.claim === "string" ? w.claim.trim() : ""
    if (claim) found.push({ claim: "guess", found_by: "world", value: claim, what: "из общих знаний модели" })
  }
  void ids
  return {
    answer: typeof r.data?.answer === "string" ? r.data.answer.trim() : "",
    dropped,
    found,
    ms: Date.now() - started,
    ok: true,
  }
}

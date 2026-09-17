// ИСХОДЯЩЕЕ — ТАКАЯ ЖЕ СТРОКА ПАМЯТИ, КАК ВХОДЯЩЕЕ (219-1).
//
// 🎯 ВЫВОД ВЛАДЕЛЬЦА 2026-09-17, ПОДТВЕРЖДЁННЫЙ ИЗМЕРЕНИЕМ: «правильно ли я понимаю, что на сегодняшний
// день таблица сообщений имеет только входящие сообщения и не сохраняет исходящие? …Только когда у нас
// будет таблица, которая хранит и входящие, и исходящие, мы сможем вернуться».
//
// ✗ ИЗМЕРЕНО В ТОТ ЖЕ ДЕНЬ: `feedback=15 · recall=14 · remember=18` — все три направления ВХОДЯЩИЕ, и
// ни одно из четырёх мест записи в коде не писало исходящее. `ans_N` был номером ВОПРОСА, то есть
// комментарий человека указывал не на то, что он читал.
//
// 🔒 ПОЧЕМУ ЭТО НЕ «ЕЩЁ ОДНА КОЛОНКА», А ОТДЕЛЬНАЯ СТРОКА. Разговор — это череда ходов, и ответ такой
// же ход, как вопрос: у него своё время, свой текст и свои обстоятельства. Колонка у вопроса умеет
// хранить один ответ и молчит о том, что было дальше; строка становится звеном цепочки.
//
// 🔒 ПИСАТЕЛЬ ОДИН НА ВСЮ СЛУЖБУ. Три глагола отвечают по-разному, но пишут ответ ЗДЕСЬ: вторая
// реализация разошлась бы с первой на первой же правке — тот же закон, что у `dataCall` и у писателя
// заявок.
// 🛑 ЗАПИСЬ ОТВЕТА НЕ ИМЕЕТ ПРАВА СЛОМАТЬ САМ ОТВЕТ. Не записалось — человек всё равно получает то,
// что получил бы; отказ возвращается полем, а не исключением. Тот же рубеж, что у журнала.

import { DIRECTION, insertMessage, linkMessages, STATUS } from "./messages.mjs"

/** Сколько знаков ответа держим в строке. Длиннее — забота 219-4 (вещь в объектном хранилище). */
export const ANSWER_INLINE_LIMIT = 12000

/**
 * Записать исходящее.
 *
 * @param {{text: string, toMessageId: number|null, depth?: number|null, ms?: number|null, usedModel?: boolean|null, sourcePath?: string|null, who?: string|null}} input
 * @returns {Promise<{id: number|null, ok: boolean, error?: string, linked?: boolean, truncated?: boolean}>}
 */
export async function writeAnswer({ chain = null, depth = null, ms = null, sourcePath = null, text, toMessageId = null, usedModel = null, who = null }) {
  const body = String(text ?? "").trim()
  if (!body) return { error: "empty-answer", id: null, ok: false }

  // 🔒 219-3: ХОД МЫСЛЕЙ КЛАДЁТСЯ ВМЕСТЕ С ОТВЕТОМ, А НЕ ПОСЛЕ. Собранный отдельным запросом, он
  // разошёлся бы с ответом при первом же отказе записи: остался бы ответ без размышлений или
  // размышления без ответа, и снаружи оба выглядели бы одинаково.
  // 🛑 ПУСТАЯ ЦЕПОЧКА ОСТАЁТСЯ ПУСТОЙ, А НЕ ВЫДУМЫВАЕТСЯ: ответ из известного не требует размышления,
  // и «шагов нет» — это правда о нём, а не пропажа (закон 144 об уверенном умолчании).
  const steps = Array.isArray(chain)
    ? chain.map((s) => ({ at: s?.at ?? null, ms: Number(s?.ms ?? 0), note: String(s?.note ?? "") })).filter((s) => s.note)
    : []

  const truncated = body.length > ANSWER_INLINE_LIMIT
  const row = await insertMessage({
    // 🔒 ТЕКСТ ЛОЖИТСЯ ЦЕЛИКОМ, А НЕ ОБРЕЗАННЫМ ДО 500 ЗНАКОВ, КАК У ВХОДЯЩИХ. У входящего саммари —
    // выжимка, полное описание лежит рядом с вещью; у ответа полного текста нет больше нигде, и
    // обрезка здесь означала бы, что разобрать жалобу «ответ слишком длинный» уже невозможно.
    summary: truncated ? body.slice(0, ANSWER_INLINE_LIMIT) : body,
    // Обстоятельства ответа: по ним видно, дорого ли он достался и звалась ли модель.
    answer_chain: steps.length ? JSON.stringify(steps) : null,
    answer_depth: depth,
    answer_ms: ms,
    answer_model: usedModel === null ? null : usedModel ? "звалась" : "не звалась",
    direction: DIRECTION.ANSWER,
    kind: "text",
    source: "api",
    source_path: sourcePath,
    status: STATUS.SAVED,
    title: toMessageId ? `ответ на №${toMessageId}` : "ответ",
    who,
  })
  if (!row.ok) return { error: row.error, id: null, ok: false }

  // 🔒 СВЯЗЬ СТАВИТСЯ ЗДЕСЬ ЖЕ: строка ответа без связи с вопросом — потерянное звено, и восстановить
  // его потом можно только угадыванием по номерам, за которое уже заплачено (218-24).
  let linked = false
  if (toMessageId) {
    const l = await linkMessages(row.id, Number(toMessageId), { reason: "answer" })
    linked = Boolean(l.ok)
  }
  return { id: row.id, linked, ok: true, steps: steps.length, truncated }
}

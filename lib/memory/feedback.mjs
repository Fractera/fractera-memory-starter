// ТРЕТИЙ ГЛАГОЛ: ПРОКОММЕНТИРОВАТЬ ОТВЕТ (207-4).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-16: запрос к памяти бывает трёх родов — «запрос на
// добавление данных · запрос на извлечение данных · обратная связь по
// предыдущему ответу». Первые два были глаголами с первого дня; третьего не
// существовало вовсе.
//
// ✗ ЧЕМ ЭТО ОПЛАЧЕНО: шаг 206 научил память ПРИГЛАШАТЬ человека поправить ответ
// («прокомментируйте, если он вас не устраивает»), и приглашение работало — а
// двери для ответа не было. Приглашение без двери хуже молчания: человек
// отвечает в пустоту и делает вывод, что его не слушают.
//
// 🔒 КОММЕНТАРИЙ — ЭТО ВХОДЯЩЕЕ СООБЩЕНИЕ, А НЕ ОСОБАЯ СУЩНОСТЬ. Он ложится
// строкой в ту же единственную таблицу и связывается с прокомментированным
// ответом указателем связей. Отдельная таблица отзывов была бы ровно тем, что
// владелец отменил шагом 206.
//
// 🔒 ССЫЛКА ОБЯЗАТЕЛЬНА И ПРОВЕРЯЕТСЯ. Комментарий «мне не понравилось» без
// названного ответа не значит ничего: непонятно, что именно чинить. Поэтому
// несуществующее имя ответа — отказ, и ничего не записывается.
//
// 🛑 ЧЕГО ЗДЕСЬ НЕТ, НАЗВАНО ЧЕСТНО: навык эволюции, ветка правки и откат по git
// НЕ ПОСТРОЕНЫ (шаг 208 и далее). Ответ говорит это словами, а не делает вид,
// что запустил обучение. Обещание, которого продукт не держит, человек
// проверяет в свой худший день.

import { DIRECTION, getMessage, insertMessage, linkMessages, MESSAGES, STATUS } from "./messages.mjs"
import { putFeedbackVector } from "./feedback-vector.mjs"
import { feedbackKind, KIND, refusalWordsFor } from "./feedback-kind.mjs"
import { findSolution, solutionWords } from "./solution-search.mjs"
import { note } from "./journal.mjs"
import { sql } from "./store.mjs"
import { AUTH, parseSource } from "./source.mjs"
import { toolFailure } from "./tools.mjs"

/** Имя ответа — это номер его строки: `ans_42`. Ничего, кроме номера, в нём нет. */
export function messageIdOf(answerId) {
  const m = /^ans_(\d+)$/.exec(String(answerId ?? "").trim())
  return m ? Number(m[1]) : null
}

const words = (lang, ru, en) => (lang === "en" ? en : ru)

/**
 * Принять отзыв о названном ответе.
 *
 * @param {{about?: string, text?: string, from?: string|string[], lang?: string, auth?: string}} input
 */
export async function feedback(input = {}) {
  const startedAt = Date.now()
  const lang = input.lang === "en" ? "en" : "ru"
  const text = String(input.text ?? "").trim()
  const about = String(input.about ?? "").trim()

  const shaped = (body) => ({ objects: [], text: body.what_happened, ...body })

  if (!about || !text) {
    const what = words(
      lang,
      "нужны оба: имя ответа (about) и сам комментарий (text)",
      "both are required: the answer name (about) and the comment itself (text)",
    )
    await note({ asked: `about=${about || "—"} text=${text || "—"}`, method: "feedback", ms: 0, trouble: what })
    return shaped({ error: "need-about-and-text", ok: false, what_happened: what })
  }

  const messageId = messageIdOf(about)
  if (!messageId) {
    const what = words(
      lang,
      `имя ответа «${about}» не той формы: ожидается ans_<номер>, как его вернули «Сказать» или «Спросить»`,
      `answer name «${about}» is malformed: expected ans_<number>, as returned by remember or recall`,
    )
    return shaped({ error: "bad-answer-id", ok: false, what_happened: what })
  }

  // 🔒 ОТВЕТ ДОЛЖЕН СУЩЕСТВОВАТЬ. Иначе отзывы копились бы про несуществующее, и разбирать их
  // пришлось бы вручную — а «комментарий принят» звучало бы одинаково в обоих случаях.
  const answered = await getMessage(messageId)
  if (!answered) {
    const what = words(
      lang,
      `такого ответа нет: ${about}. Комментарий не записан — комментировать нечего`,
      `no such answer: ${about}. The comment was not stored — there is nothing to comment on`,
    )
    await note({ asked: `${about}: ${text.slice(0, 200)}`, method: "feedback", ms: Date.now() - startedAt, trouble: what })
    return shaped({ error: "unknown-answer", ok: false, what_happened: what })
  }

  let sourcePath = null
  if (input.from) {
    const parsed = parseSource(input.from)
    if (!parsed.ok) return shaped({ error: parsed.error, ok: false, what_happened: parsed.why })
    sourcePath = parsed.text
  }

  const row = await insertMessage({
    direction: DIRECTION.FEEDBACK,
    kind: "text",
    source: "api",
    source_auth: input.auth === AUTH.MACHINE ? AUTH.MACHINE : input.auth === AUTH.KEY ? AUTH.KEY : null,
    source_path: sourcePath,
    status: STATUS.SAVED,
    summary: text.slice(0, 500),
    title: `отзыв о ${about}`,
  })
  if (!row.ok) {
    // 🔒 207-7: РОД ЗАВИСИМОСТИ НАЗЫВАЕТСЯ. «Комментарий не записан» без причины заставляет
    // человека повторять его вручную, не зная, есть ли смысл.
    return toolFailure({ error: row.error, lang, stage: "запись комментария" })
  }

  // 🔒 СВЯЗЬ — ОТДЕЛЬНАЯ СТРОКА УКАЗАТЕЛЯ, А НЕ ПОЛЕ. Так на вопрос отвечают в обе стороны: «о чём
  // этот отзыв» и «что говорили об этом ответе». Поле отвечало бы только на первый.
  // 🔒 У СВЯЗИ ЕСТЬ ПРИЧИНА, И ЭТО НЕ УКРАШЕНИЕ (219-6). ✗ Найдено прибором шага: связь ставилась
  // безымянной, а разговор собирается по НАЗВАННЫМ причинам — и комментарий, ради которого весь
  // разбор и затевается, в собранную цепочку не попадал. Безымянная связь есть связь, которой для
  // читателя не существует.
  const linked = await linkMessages(row.id, messageId, { reason: "feedback" })

  // 🔒 КОММЕНТАРИЙ УЕЗЖАЕТ В ВЕКТОР ТУТ ЖЕ (218-18): сигнал считается по СМЫСЛУ, а положить вектор
  // задним числом некому — экрана сигналов, который бы это делал, не существует.
  // 🛑 ОТКАЗ СКЛАДА ЗАПИСИ НЕ ОТМЕНЯЕТ, НО И НЕ ЗАМАЛЧИВАЕТСЯ: хранилища независимы, а комментарий,
  // легший без вектора, в сигнал уже не соберётся — молча. Тот же закон, что у «Сказать».
  const vector = await putFeedbackVector({ id: row.id, text })

  // ── РОД КОММЕНТАРИЯ: ПРАВКА ПАМЯТИ ИЛИ ЗАЯВКА НА ДРУГОЕ РЕШЕНИЕ (218-19) ────────────────────────
  //
  // 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-17: комментарий «этого в принципе нельзя сделать памятью» обязан
  // получить ту же цепочку, что чужая просьба внутри фразы, — маркетплейс, реестр навыков,
  // предложение микросервиса. Порядок и заглушки живут в навыке `route-beyond-memory`.
  // 🛑 РАЗБОР НЕ ОТМЕНЯЕТ ЗАПИСИ: строка уже лежит. Модель молчит — род не назван, и комментарий
  // остаётся обычным пожеланием в стопке, а не объявляется им.
  const kind = await feedbackKind(text)
  let beyond = null
  // 🔒 РОД ЛОЖИТСЯ В ТУ ЖЕ СТРОКУ, А НЕ В ОТДЕЛЬНУЮ ТАБЛИЦУ ОТЗЫВОВ: комментарий — обычное входящее
  // сообщение, и вторая таблица была бы ровно тем, что владелец отменил шагом 206.
  if (kind.ok) await sql(`UPDATE ${MESSAGES} SET feedback_kind = ? WHERE id = ?`, [kind.kind, row.id])
  if (kind.ok && kind.kind === KIND.BEYOND) {
    const solution = await findSolution(kind.asked)
    // 🔒 ЧЕСТНЫЙ ОТКАЗ — РАВНОПРАВНЫЙ ИСХОД, А НЕ АВАРИЙНЫЙ. Предложение создать микросервис ставится
    // только там, где обещать есть что: иначе стоит отказ с причиной, с альтернативой и с выбором,
    // отданным человеку (слова владельца того же дня).
    beyond = {
      asked: kind.asked,
      proposal: kind.can_promise ? solution.proposal : "honest-refusal",
      searched: solution.searched,
      words: kind.can_promise ? solutionWords([solution], lang) : refusalWordsFor({ asked: kind.asked, could_do: kind.could_do, lang, why_not: kind.why_not }),
    }
  }

  const collected = words(
    lang,
    `принято: это отзыв о ${about}. Он собран; пожелание, повторённое разными словами, становится сигналом — по сигналу правит строитель, веткой и с откатом`,
    `noted: a comment on ${about}. It is collected; a wish repeated in different words becomes a signal, and the builder acts on signals in a branch, revertibly`,
  )
  // 🔒 ЗАЯВКА СЛЫШИТ ОТВЕТ В ТОТ ЖЕ ЗАХОД, А НЕ «БУДЕТ УЧТЕНО». Человек сказал, что памятью этого не
  // решить; ответить ему «отзыв собран» значит промолчать о самой его мысли.
  const what = beyond ? `${beyond.words}\n\n${collected}` : collected
  await note({
    asked: `${about}: ${text.slice(0, 200)}`,
    decisions: [
      `отзыв записан строкой ${row.id}${linked.ok ? ` и связан с ${messageId}` : `; связь не записана: ${linked.error}`}`,
      vector.ok ? `вектор отзыва положен (${vector.id})` : `вектор отзыва НЕ положен: ${vector.refused} — в сигнал он не соберётся`,
    ],
    method: "feedback",
    ms: Date.now() - startedAt,
    returned: what,
  })

  return shaped({
    about,
    answer_id: `ans_${row.id}`,
    // 🔒 ЧЕСТНОЕ СОСТОЯНИЕ, И ОНО ИЗМЕНИЛОСЬ ВМЕСТЕ С ПРАВДОЙ (213-1). Было `not-built`, пока с
    // комментарием не происходило ничего. Теперь он СОБИРАЕТСЯ: повторённое разными словами
    // становится сигналом (`GET /v1/signals`), а по сигналу правит строитель в мастерской — веткой,
    // с откатом и со слиянием рукой владельца.
    // 🛑 УСТАРЕВШЕЕ «НЕ ПОСТРОЕНО» — ТАКАЯ ЖЕ ЛОЖЬ, КАК ОБЕЩАНИЕ НЕПОСТРОЕННОГО, только в другую
    // сторону: оно занижает и учит человека не ждать ответа на свои слова.
    evolution: "collected",
    linked: linked.ok,
    // 🔒 СОСТОЯНИЕ ВЕКТОРА ЕДЕТ НАРУЖУ, А НЕ ОСТАЁТСЯ В ЖУРНАЛЕ: без него комментарий принят одинаково
    // и когда он станет сигналом, и когда не станет никогда.
    meaning_stored: vector.ok,
    // 🔒 РОД ЕДЕТ НАРУЖУ ВСЕГДА, ВКЛЮЧАЯ «НЕ НАЗВАН»: экран сигналов и строитель обязаны отличать
    // пожелание к памяти от заявки на другой продукт, а «не разобрано» — от того и другого.
    kind: kind.ok ? kind.kind : null,
    ...(kind.ok ? {} : { kind_refused: kind.refusal }),
    ...(beyond ? { beyond } : {}),
    message_id: row.id,
    ok: true,
    what_happened: what,
  })
}

// ДОСЬЕ — ВЕСЬ РАЗГОВОР, А НЕ ОБРЫВКИ ВОКРУГ ОДНОЙ СТРОКИ (218-24 → переписано 219-5).
//
// 🎯 ТРЕБОВАНИЕ ВЛАДЕЛЬЦА 2026-09-17, ДОСЛОВНО: «это может быть сессия: вопрос — ответ — уточнение —
// ответ — уточнение — ответ — финальный ответ-резюме — запрос на комментарий — ответ пользователя…
// Всю эту цепочку вместе с датами и ссылками доставить в pre-step».
//
// ✗ ЧЕМ ОПЛАЧЕНА ПЕРЕПИСЬ. Первая редакция брала ±4 строки ПО НОМЕРУ и искала запись журнала ПО
// ВРЕМЕНИ. Оба приёма — угадывание: соседи по счётчику приходят из чужих разговоров, а фильтр «13:04»
// поймал «01:13:04» и подтянул чужую переписку. **Ложное досье хуже пустого**: по нему чинят не то.
//
// 🔒 ТЕПЕРЬ ИСТОЧНИК ОДИН — СВЯЗИ. Разговор собирает `conversationOf()` (219-2), а ответы памяти и их
// размышления лежат строками (219-1, 219-3). Досье ничего не выводит сам: он печатает то, что
// записано, и честно называет то, чего записано нет.

import { conversationOf } from "./conversation.mjs"
import { MESSAGES } from "./messages.mjs"
import { sql } from "./store.mjs"

/** Обезвредить чужой текст: переводы строк сворачиваются, закрывающая кавычка удваивается. */
const safe = (v, n = 700) => {
  const s = String(v ?? "").replace(/\s+/g, " ").replace(/»/g, "»»").trim()
  return s.length > n ? `${s.slice(0, n)}…` : s
}

const WHO = {
  answer: { en: "MEMORY ", ru: "ПАМЯТЬ " },
  feedback: { en: "COMMENT", ru: "ОТЗЫВ  " },
  recall: { en: "PERSON ", ru: "ЧЕЛОВЕК" },
  remember: { en: "PERSON ", ru: "ЧЕЛОВЕК" },
}

/**
 * Досье по имени ответа: весь разговор, в котором этот ответ прозвучал.
 *
 * @param {string} answerName — `ans_<номер>`; принимается и новое имя (строка ОТВЕТА), и старое (входящее)
 * @param {string} lang
 */
export async function caseFile(answerName, lang = "ru") {
  const ru = lang !== "en"
  const id = Number(String(answerName ?? "").replace(/^ans_/, ""))
  if (!Number.isInteger(id)) return ""

  const self = await sql(`SELECT id, direction FROM ${MESSAGES} WHERE id = ?`, [id])
  const row = (self.rows ?? [])[0]
  if (!row) return ru ? `Строки ${answerName} в памяти уже нет.` : `Row ${answerName} is no longer in memory.`

  const talk = await conversationOf(id)
  if (!talk.ok) {
    return ru
      ? `Разговор вокруг ${answerName} собрать не удалось: ${talk.error}.`
      : `Could not assemble the conversation around ${answerName}: ${talk.error}.`
  }

  const L = []
  L.push(ru ? `### Разговор, в котором прозвучал ${answerName}` : `### The conversation where ${answerName} was said`)
  L.push("")
  // 🛑 СТАРОЕ ИМЯ НАЗЫВАЕТСЯ СТАРЫМ. До 219-4 `ans_N` указывал на ВХОДЯЩЕЕ сообщение; читатель,
  // не знающий об этом, решит, что человек комментировал свою же фразу.
  if (row.direction !== "answer") {
    L.push(
      ru
        ? `🛑 Имя ${answerName} — записи прежнего образца: до 219-4 оно указывало на сообщение ЧЕЛОВЕКА, а не на ответ памяти.`
        : `🛑 The name ${answerName} is of the old kind: before 219-4 it pointed at the PERSON's message, not at memory's answer.`,
    )
    L.push("")
  }

  const from = [...new Set(talk.turns.map((t) => t.from).filter(Boolean))]
  L.push(ru ? `Ходов: ${talk.turns.length} · источник: ${from.join(", ") || "не назван"}` : `Turns: ${talk.turns.length} · source: ${from.join(", ") || "not named"}`)
  L.push("")

  for (const t of talk.turns) {
    const who = (WHO[t.direction] ?? { en: t.direction, ru: t.direction })[ru ? "ru" : "en"]
    const mark = t.id === id ? (ru ? "  ← прокомментировано" : "  ← commented") : ""
    L.push(`**${t.at} · ${who} · #${t.id}**${mark}`)
    L.push(`> ${safe(t.text)}`)
    if (t.direction === "answer") {
      const how = [
        ru ? `ступень ${t.depth ?? "—"}` : `depth ${t.depth ?? "—"}`,
        `${t.ms ?? "—"} ${ru ? "мс" : "ms"}`,
        ru ? `модель ${t.model ?? "—"}` : `model ${t.model ?? "—"}`,
      ].join(" · ")
      L.push(`_${how}_`)
      // 🔒 РАЗМЫШЛЕНИЯ ПЕЧАТАЮТСЯ ЦЕЛИКОМ, А НЕ ПЕРЕСКАЗЫВАЮТСЯ: строителю нужно увидеть, ЧТО память
      // делала, а не нашу оценку того, что она делала.
      if ((t.chain ?? []).length) {
        L.push(ru ? "Что память при этом делала:" : "What memory was doing:")
        for (const s of t.chain) L.push(`- ${s.ms} ${ru ? "мс" : "ms"} · ${safe(s.note, 220)}`)
      } else {
        L.push(ru ? "_ход мыслей не сохранён: ответ старше 219-3_" : "_no reasoning stored: the answer predates 219-3_")
      }
    }
    if (t.direction === "feedback" && t.feedbackKind) L.push(ru ? `_род отзыва: ${t.feedbackKind}_` : `_comment kind: ${t.feedbackKind}_`)
    L.push("")
  }

  // 🛑 ПРЕДЕЛЫ НАЗЫВАЮТСЯ, А НЕ ОБХОДЯТСЯ МОЛЧАНИЕМ.
  L.push(
    ru
      ? `Ссылки: строки памяти #${talk.turns.map((t) => t.id).join(", #")}. Разговор обрывается там же, где обрывается связь, — после получаса тишины (порог 217-1); ходов берётся не больше сорока.`
      : `Links: memory rows #${talk.turns.map((t) => t.id).join(", #")}. The conversation ends where the link ends — after thirty minutes of silence (threshold 217-1); at most forty turns are taken.`,
  )
  return L.join("\n")
}

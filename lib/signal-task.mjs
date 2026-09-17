// СИГНАЛ → ЗАЯВКА СТРОИТЕЛЮ: ОДИН ПИСАТЕЛЬ ТЕКСТА (218-20).
//
// 🎯 ЗВЕНО 4 ЦЕПОЧКИ ЭВОЛЮЦИИ: сигналы собирались с 213-1 и ИХ НИКТО НЕ ВИДЕЛ — единственным путём
// был `GET /v1/signals` с ключом. Способность, которую не видно, снаружи неотличима от отсутствующей;
// она же не доводила до звена 5 — навык правки веткой написан и ни разу не применялся, потому что
// повода войти в него не возникало.
//
// 🔒 ТЕКСТ ЗАЯВКИ СОБИРАЕТСЯ ЗДЕСЬ, А НЕ В ВЁРСТКЕ. Экран решает, ЧТО показать человеку; формат того,
// что уезжает в работу, — свойство механизма. Собранный в островке, он разошёлся бы с любым вторым
// местом, где заявку когда-нибудь соберут (бот, письмо, другая страница).
//
// 🔒 ОСНОВАНИЯ ПЕРЕНОСЯТСЯ ДОСЛОВНО И ПОИМЁННО — те же слова людей и те же номера строк. Сводка без
// оснований есть мнение, выданное за наблюдение: строитель обязан прочитать, что именно сказали, а не
// поверить нашему счёту (закон 213-1).
// 🛑 ДОСЛОВНЫЕ ПОВТОРЫ НАЗЫВАЮТСЯ ЧИСЛОМ, НО НЕ ВЫДАЮТСЯ ЗА НАБЛЮДЕНИЯ: три повтора значат, что человек
// настаивает, — это повод задать ему вопрос, а не считать сигнал сильнее.

import { caseFile } from "./case-file.mjs"

/** Строка-заголовок заявки: о чём она, короткими словами. */
const headline = (signal, ru) => {
  const themes = (signal.themes ?? []).join(", ")
  return ru
    ? `Сигнал от людей${themes ? ` по теме: ${themes}` : ""} — наблюдений ${signal.times ?? signal.grounds?.length ?? 0}`
    : `A signal from people${themes ? ` on: ${themes}` : ""} — observations ${signal.times ?? signal.grounds?.length ?? 0}`
}

/**
 * Текст заявки в приёмную по одному сигналу.
 *
 * @param {{grounds?: Array<{id:number, about:string, text:string}>, repeats?: Array<object>, themes?: string[], times?: number}} signal
 * @param {string} lang
 */
export function taskTextFromSignal(signal, lang) {
  const ru = lang !== "en"
  const grounds = signal?.grounds ?? []
  const repeats = signal?.repeats ?? []

  const lines = [headline(signal, ru), ""]
  lines.push(ru ? "Что сказали люди — дословно:" : "What people said, verbatim:")
  for (const g of grounds) lines.push(`• #${g.id} (${ru ? "об ответе" : "on"} ${g.about}): «${g.text}»`)

  if (repeats.length) {
    lines.push("")
    lines.push(
      ru
        ? `Дословных повторов: ${repeats.length} — в счёт наблюдений они не идут, но человек настаивает.`
        : `Verbatim repeats: ${repeats.length} — not counted as observations, but the person is insisting.`,
    )
  }

  // 🔒 ДОСЬЕ КАЖДОГО ОСНОВАНИЯ — ГЛАВНОЕ, ЧТО ОТЛИЧАЕТ ЗАЯВКУ ОТ ЗАПИСКИ (218-24).
  // 🎯 Вопрос владельца: «через три дня агент откроет это и восстановит всю картину? из этого
  // маленького сообщения?» Нет. Поэтому к каждому пожеланию прикладывается то, на что оно отвечало:
  // фраза человека, разговор вокруг, что память тогда делала, и что она считала связанным.

  lines.push("")
  lines.push(
    ru
      ? "Порядок работы — навык memory-evolution: сначала проверить, делает ли память то, что написано в её же инструкции; правка идёт ОДНОЙ веткой и сливается рукой владельца."
      : "How to act — the skill memory-evolution: first check whether memory does what its own instruction says; the change goes in ONE branch and is merged by the architect.",
  )
  return lines.join("\n")
}

/**
 * Чем вызвана заявка — строкой в саму заявку.
 *
 * 🔒 «СИГНАЛ ОТ ЛЮДЕЙ» И «ПОЖЕЛАНИЕ ВЛАДЕЛЬЦА» — РАЗНЫЕ ВЕЩИ, И ПУТАТЬ ИХ ДОРОГО. ✗ Оплачено живым
 * замером 218-20: заявка по сигналу писала «человек добавил задание в список мастерской», и строитель
 * прочёл бы слова людей как просьбу владельца — то есть не пошёл бы их читать вовсе.
 */
export function originOfSignal(signal, lang) {
  const n = signal?.times ?? signal?.grounds?.length ?? 0
  return lang === "en"
    ? `a signal from people taken into work: ${n} observations, said in different words`
    : `сигнал от людей взят в работу: наблюдений ${n}, сказано разными словами`
}

/** Где это увидели — адрес экрана, с которого заявка заведена. */
export const whereOfSignals = (lang) => `/${lang}/build?section=signals`

/**
 * Приложение к заявке — разговоры, в которых прозвучали прокомментированные ответы (219-5).
 *
 * 🔒 ОТДЕЛЬНО ОТ ПОЛЯ «ЧТО ПРОСЯТ», И ЭТО НЕ КОСМЕТИКА. Поле заявки сворачивается в одну строку —
 * так защищены её поля от чужого текста (закон шага 61). Досье из восьми ходов, свёрнутое в строку,
 * читается как каша: ✗ измерено живым прогоном 219-5.
 * 🛑 ДОСЬЕ СОБИРАЕТСЯ ПО УНИКАЛЬНЫМ ОТВЕТАМ: два комментария об одном ответе — это один случай, а не
 * два, и две копии разговора сказали бы читателю неправду о числе случаев.
 */
export async function caseFilesForSignal(signal, lang) {
  const grounds = signal?.grounds ?? []
  const parts = []
  for (const about of [...new Set(grounds.map((g) => g.about))]) parts.push(await caseFile(about, lang))
  return parts.filter(Boolean).join("\n\n")
}

// ТЕКСТ ОТВЕТА ДВУХ ГЛАГОЛОВ — ТО, ЧТО ЧЕЛОВЕК ПРОЧИТАЕТ ГЛАЗАМИ (206-10).
//
// 🎯 ТРЕБОВАНИЕ ВЛАДЕЛЬЦА 2026-09-16, ДОСЛОВНО: «когда пользователь задаёт вопрос на изучение данных,
// очевидно, что формат вывода напрямую помогает ему определить результат… если пользователь загрузил
// какой-либо объект, ему нужно вернуть описание в виде саммари: например, "вы загрузили фотографию",
// краткое саммари и "сохранили этот объект в истории вашей памяти". Даже когда пользователь просто
// наговорил что-то… важно вернуть ответ: "если я тебя правильно понял, то ты имел в виду…" и что
// сохранено в память. И в конце в обоих случаях, а также в случае извлечения данных, обязательно
// написать: прокомментируйте ответ, если он вас не устраивает — это будет использоваться для
// обучения модели».
//
// 🔒 ТРИ СЛУЧАЯ, ОДНА ФОРМА: сказал · прислал вещь · спросил. У каждого свой лид, но приглашение
// поправить стоит в конце ВСЕГДА — именно оно превращает ответ в разговор, а не в отчёт.
// 🪦 ПРЕЖДЕ ЗДЕСЬ БЫЛО ГОЛОЕ ПЕРЕЧИСЛЕНИЕ (200-6, «в тексте просто делаешь перечисления всех фактов»).
// Перечисление осталось внутри — человеку по-прежнему видно построчно, что именно записано, — но
// теперь у него есть начало и конец, обращённые к человеку.
//
// 🔒 СЛОВА ПЕРЕВОДИМЫ, СТРУКТУРА — НЕТ: лиды и приглашение живут в `lib/words.mjs` на двух языках,
// а значения и роды печатаются как есть. Пересказ — работа зовущей модели, не памяти.

import { say } from "./words.mjs"

const readable = (what) => String(what ?? "").replace(/_/g, " ")

/** Род вещи словами человека — для лида «вы загрузили …». */
const KIND_WORDS = {
  en: { audio: "an audio recording", document: "a document", image: "a photo", pdf: "a PDF", video: "a video", web: "a page" },
  ru: { audio: "аудиозапись", document: "документ", image: "фотографию", pdf: "PDF", video: "видео", web: "страницу" },
}
const kindWord = (kind, lang) => {
  const branch = KIND_WORDS[lang] ?? KIND_WORDS.en
  return branch[kind] ?? (lang === "ru" ? "файл" : "a file")
}

function objectLine(o) {
  const label = o.title || o.name || o.url || o.id || "?"
  if (!o.ok) return `- ✗ ${label}: ${o.error ?? "refused"}`
  const tags = [o.kind, o.messageId != null ? `#${o.messageId}` : null, o.existing ? "existing" : null].filter(Boolean).join(" ")
  return `- [${tags}] ${label}`
}

/**
 * Собрать ответ из частей и поставить приглашение поправить.
 *
 * 🛑 ПРИГЛАШЕНИЕ ДОБАВЛЯЕТСЯ ЗДЕСЬ, В ОДНОМ МЕСТЕ, А НЕ В КАЖДОМ ГЛАГОЛЕ. Написанное трижды, оно
 * исчезло бы из одного из трёх молча — и как раз в том ответе, где человеку важнее всего поправить.
 */
function withFeedback(parts, lang) {
  const body = parts.filter((x) => x !== undefined && x !== null && String(x).trim() !== "")
  body.push(say("answer-feedback", lang))
  return body.join("\n")
}

/** Текст ответа «Сказать»: что понято, что сохранено, что стало с присланным. */
export function rememberText({ kept, lang, noted, objects, what_happened }) {
  const facts = []
  for (const n of noted ?? []) {
    const value = n.became ?? n.added ?? n.value
    if (value !== undefined && value !== null && value !== "") facts.push(`- ${readable(n.what)}: ${value}`)
  }
  const things = (objects ?? []).filter((o) => o.ok)
  const parts = []

  // 🔒 ВЕЩЬ ОБЪЯВЛЯЕТСЯ СВОИМ ЛИДОМ, А НЕ СТРОКОЙ СПИСКА: человек прислал фотографию и ждёт услышать
  // именно это. Саммари берётся у самой вещи; нет его — не выдумываем, показываем название.
  for (const o of things) {
    parts.push(`${say("answer-object-lead", lang, { kind: kindWord(o.kind, lang) })} ${o.summary || o.title || o.name || o.url || ""}`.trim())
    parts.push(say("answer-object-kept", lang))
  }
  for (const o of (objects ?? []).filter((o) => !o.ok)) parts.push(objectLine(o))

  if (facts.length) {
    parts.push(say("answer-understood", lang))
    parts.push(...facts)
  }
  // 🔒 «СОХРАНЕНО» ГОВОРИТ, ЧТО ИМЕННО ПРОИЗОШЛО С ФРАЗОЙ, А НЕ ПОВТОРЯЕТ СПИСОК. Повтор одного и
  // того же дважды читается как две разные вещи — и человек ищет между ними разницу, которой нет.
  if (kept) parts.push(`${say("answer-kept", lang)} ${kept}`)
  if (!facts.length && !things.length && !kept) parts.push(String(what_happened ?? ""))
  return withFeedback(parts, lang)
}

/** Текст ответа «Спросить»: что нашлось, затем найденные вещи. */
export function recallText({ known, lang, objects, what_happened }) {
  const lines = []
  for (const k of known ?? []) {
    if (k?.value !== undefined && k?.value !== null && k?.value !== "") lines.push(`- ${readable(k.what)}: ${k.value}`)
  }
  for (const o of objects ?? []) lines.push(objectLine(o))
  const parts = lines.length ? [say("answer-found", lang), ...lines] : [String(what_happened ?? "")]
  return withFeedback(parts, lang)
}

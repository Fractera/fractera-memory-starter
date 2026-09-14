// ТЕКСТ ОТВЕТА ДВУХ ГЛАГОЛОВ: ПЕРЕЧИСЛЕНИЕ ФАКТОВ И ОБЪЕКТОВ (200-6).
//
// 🎯 Слово владельца 2026-09-14: «в тексте просто делаешь перечисления всех фактов с которыми ты столкнулся».
// 🔒 СТРОКА НА ФАКТ И СТРОКА НА ОБЪЕКТ, БЕЗ ПЕРЕВОДИМЫХ СЛОВ: род, значение, род объекта и его номер понятны на любом языке, а
// связный пересказ — работа зовущей модели, не памяти. Нечего перечислить — текстом становится `what_happened`, а не пустая строка.
// 🔒 ОДНО МЕСТО НА ОБА ГЛАГОЛА И НА ДВЕРЬ ФОРМЫ: дверь `remember-ingest` добавляет файлы к `objects` после `remember()` и пересобирает
// текст этим же помощником — иначе файлы были бы в `objects` и отсутствовали бы в тексте.

const readable = (what) => String(what ?? "").replace(/_/g, " ")

function objectLine(o) {
  const label = o.title || o.name || o.url || o.id || "?"
  if (!o.ok) return `- ✗ ${label}: ${o.error ?? "refused"}`
  const tags = [o.kind, o.messageId != null ? `#${o.messageId}` : null, o.existing ? "existing" : null].filter(Boolean).join(" ")
  return `- [${tags}] ${label}`
}

/** Текст ответа «Сказать»: что записано, затем вложения. */
export function rememberText({ noted, objects, what_happened }) {
  const lines = []
  for (const n of noted ?? []) {
    const value = n.became ?? n.added ?? n.value
    if (value !== undefined && value !== null && value !== "") lines.push(`- ${readable(n.what)}: ${value}`)
  }
  for (const o of objects ?? []) lines.push(objectLine(o))
  return lines.length ? lines.join("\n") : String(what_happened ?? "")
}

/** Текст ответа «Спросить»: что известно, затем найденные объекты. */
export function recallText({ known, objects, what_happened }) {
  const lines = []
  for (const k of known ?? []) {
    if (k?.value !== undefined && k?.value !== null && k?.value !== "") lines.push(`- ${readable(k.what)}: ${k.value}`)
  }
  for (const o of objects ?? []) lines.push(objectLine(o))
  return lines.length ? lines.join("\n") : String(what_happened ?? "")
}

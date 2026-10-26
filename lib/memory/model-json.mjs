// РАЗБОР ОТВЕТА МОДЕЛИ: ДОСТАТЬ JSON ИЗ ТОГО, ЧТО ОНА НАПИСАЛА.
//
// 🪦 Эти функции жили в `lib/write-gate.mjs` — воротах записи (201-9), решавших «колонка или
// таблица». Ворота сняты шагом 206-1 вместе со специализированными таблицами; разбор ответа модели
// к тому решению отношения не имел и потому переехал сюда, а не исчез.
//
// 🔒 ЧИСТЫЕ ФУНКЦИИ БЕЗ СЕТИ И БЕЗ МОДЕЛИ НАМЕРЕННО: их проверяет прибор за миллисекунды и без квоты.

/**
 * Достать JSON из ответа модели.
 *
 * ✗ ОПЛАЧЕНО W8 ПРОГОНА 201-9: модель вернула ВЕРНЫЙ JSON, но в ограде ```json и с хвостом после
 * неё. Прежний разбор снимал ограду, только если ответ ею и заканчивался, — и честный факт «считать в
 * евро» был потерян с отказом «модель ответила не по форме».
 * 🔒 ПОРЯДОК ОТ СТРОГОГО К МЯГКОМУ: как есть → содержимое первой ограды → от первой скобки до парной
 * ей закрывающей. Мягкий путь не придумывает данных: он берёт ровно тот объект, что написала модель.
 */
export function parseModelJson(text) {
  const raw = String(text ?? "").trim()
  if (!raw) return null
  const attempts = [raw]
  const fence = raw.match(/```[a-zA-Z]*\s*([\s\S]*?)```/)
  if (fence) attempts.push(fence[1].trim())
  const balanced = firstBalanced(raw)
  if (balanced) attempts.push(balanced)
  for (const a of attempts) {
    try {
      return JSON.parse(a)
    } catch { /* следующий способ */ }
  }
  return null
}

/** Первый сбалансированный объект или массив — с учётом строк, чтобы скобка в тексте его не рвала. */
function firstBalanced(s) {
  const start = s.search(/[[{]/)
  if (start < 0) return null
  const open = s[start]
  const close = open === "{" ? "}" : "]"
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < s.length; i += 1) {
    const ch = s[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === "\\") escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === open) depth += 1
    else if (ch === close) {
      depth -= 1
      if (depth === 0) return s.slice(start, i + 1)
    }
  }
  return null
}

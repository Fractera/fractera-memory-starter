// ВОРОТА ЗАПИСИ: ЧТО ИЗ ОТВЕТА МОДЕЛИ МОЖЕТ ЛЕЧЬ В ТАБЛИЦУ, А ЧТО ИДЁТ ТОЛЬКО В ГРАФ (201-9).
//
// 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-15 (форма выбора): «Сначала чинить, потом прогон» — по четырём дефектам,
// найденным первыми двенадцатью записями большого прогона 201-9, до того как его оборвала квота.
//
// 🔒 ЗАКОН, КОТОРЫЙ ЭТИ ВОРОТА ИСПОЛНЯЮТ, — §8 ПАСПОРТА: граф получает ВСЁ сказанное; таблица —
// только точное, счётное и текущее. До этих ворот закон жил в тексте подсказки, а модель ему не
// подчинялась: завела `how_long_he_has_known_his_friend_denis` (история второго порядка — в таблицу),
// записала «Севилья (юг Испании), последние несколько месяцев» как значение и дала одной фразе два
// «текущих города». Правило, которое исполняет только модель, — пожелание; правило в коде — закон.
//
// 🔒 ЧИСТЫЕ ФУНКЦИИ БЕЗ СЕТИ И БЕЗ МОДЕЛИ НАМЕРЕННО: их проверяет прибор за миллисекунды и без квоты,
// а квоту в этом шаге уже дважды выбирали до дна.

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

/**
 * Сколько слов у значения, чтобы считаться ЗНАЧЕНИЕМ, а не рассказом.
 *
 * 🔒 ЧИСЛО ВЫБРАНО ПО ЖИВЫМ ПРИМЕРАМ, А НЕ ИЗМЕРЕНО НА КОРПУСЕ, И ЭТО НАЗВАНО: «Nissan Teana 2015» — три
 * слова, «лабрадор по кличке Марта» — четыре, «Севилья (юг Испании), последние несколько месяцев» —
 * шесть и уже рассказ. Перемеряется повторным прогоном 201-9.
 */
export const NEW_KIND_MAX_WORDS = 5

const wordsIn = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length

/**
 * Разложить факты модели на «в таблицу» и «только в граф».
 *
 * @param {Array<Record<string, any>>} facts — ответ модели
 * @returns {{toTable: any[], toGraphOnly: Array<{fact: any, why: string}>}}
 *
 * Правила — и у каждого своя оплаченная причина:
 *  ① `shape: "story"` → только граф. История, объяснение, обстоятельства — не значение (§8).
 *  ② в таблицу идёт только короткое значение (≤ NEW_KIND_MAX_WORDS слов); длиннее —
 *     рассказ под видом рода, и ему место в графе. ✗ `how_long_he_has_known_his_friend_denis`.
 * 🪦 Третье правило («у текущего значения одна фраза даёт одно значение») ушло вместе с реестром
 *    2026-09-15: знание о том, что род текущий, жило в признаке.
 * 🛑 Ничего не выбрасывается: всё, что не легло в таблицу, возвращается с причиной и ложится в граф.
 */
export function gateFacts(facts) {
  const toTable = []
  const toGraphOnly = []
  for (const f of Array.isArray(facts) ? facts : []) {
    const kind = String(f?.kind ?? "")
    const value = typeof f?.value === "string" ? f.value.trim() : ""
    if (f?.shape === "story") {
      toGraphOnly.push({ fact: f, why: "это рассказ, а не значение" })
      continue
    }
    // 🪦 Здесь реестр решал, короткое ли значение обязано быть и одно ли значение даёт фраза.
    // Реестр отменён 2026-09-15: правило длины теперь общее для всех родов, а второе правило ушло
    // вместе с накоплением признака.
    if (wordsIn(value) > NEW_KIND_MAX_WORDS) {
      toGraphOnly.push({ fact: f, why: `значение длиннее ${NEW_KIND_MAX_WORDS} слов — это рассказ, а не значение` })
      continue
    }
    toTable.push(f)
  }
  return { toGraphOnly, toTable }
}

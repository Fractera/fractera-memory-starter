// ВРЕМЯ И МЕСТО В ВОПРОСЕ — БЕЗ ХОДА МОДЕЛИ (218-8).
//
// 🎯 ЦЕПОЧКА ВЛАДЕЛЬЦА, ступень 3: «обработать присутствие или отсутствие зависимых параметров —
// дата, дни недели, время суток; геометка: координаты, название города, название объекта».
// Запись это уже умеет (218-7): время и место фразы разбирает тот же вызов модели. Вопрос модель
// не зовёт вовсе (закон 206-3: чтение — ноль ходов), значит разбирать его приходится кодом.
//
// 🔒 МЕСТО УЗНАЁТСЯ ТОЛЬКО ИЗ ТОГО, ЧТО ПАМЯТИ УЖЕ ИЗВЕСТНО. Словаря городов нет и не будет: место,
// которого нет ни в одной записи, отвечать всё равно не на что. Поэтому вопрос сверяется со
// значениями `scope_place` единственной таблицы, а не со списком мира.
// 🔒 РУССКИЕ ПАДЕЖИ — ОБЩИМ НАЧАЛОМ СЛОВА. «в Мадриде» и «Мадрид» совпадают по первым пяти буквам;
// приём грубый намеренно, тот же, что у имён в графе.
// 🔒 ВРЕМЯ СЧИТАЕТСЯ ОТ СЕГОДНЯ ПО UTC. Пусто значит «в вопросе времени нет», а не «сегодня».

const WEEKDAYS = [
  ["воскресень", 0], ["понедельник", 1], ["вторник", 2], ["сред", 3], ["четверг", 4], ["пятниц", 5], ["суббот", 6],
  ["sunday", 0], ["monday", 1], ["tuesday", 2], ["wednesday", 3], ["thursday", 4], ["friday", 5], ["saturday", 6],
]

const iso = (d) => d.toISOString().slice(0, 10)
const addDays = (d, n) => new Date(d.getTime() + n * 86400000)

/**
 * Время из вопроса: дата ГГГГ-ММ-ДД или `null`, плюс слово, которым оно сказано.
 *
 * 🔒 ДЕНЬ НЕДЕЛИ БЕЗ УТОЧНЕНИЯ — БЛИЖАЙШИЙ ВПЕРЕДИ ИЛИ СЕГОДНЯ: «в пятницу» чаще о будущем. Прошлое
 * названо словом («в прошлую пятницу») и считается назад.
 */
// 🛑 `\b` В JAVASCRIPT — ГРАНИЦА ASCII-СЛОВА И ПОСЛЕ КИРИЛЛИЦЫ НЕ СРАБАТЫВАЕТ (закон, оплаченный
// сторожем чисел 208). Прибор 218-8 поймал это здесь же: «вчера» не распознавалось. Граница слова
// поэтому задана явно, через классы букв Юникода.
const word = (w) => new RegExp(`(?<![\\p{L}\\p{N}])${w}(?![\\p{L}\\p{N}])`, "u")

export function timeInQuestion(text, now = new Date()) {
  const t = String(text ?? "").toLowerCase()
  const date = t.match(/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/)
  if (date) return { at: date[0], words: date[0] }
  if (word("послезавтра").test(t)) return { at: iso(addDays(now, 2)), words: "послезавтра" }
  if (word("позавчера").test(t)) return { at: iso(addDays(now, -2)), words: "позавчера" }
  if (word("завтра").test(t) || word("tomorrow").test(t)) return { at: iso(addDays(now, 1)), words: "завтра" }
  if (word("вчера").test(t) || word("yesterday").test(t)) return { at: iso(addDays(now, -1)), words: "вчера" }
  if (word("сегодня").test(t) || word("today").test(t)) return { at: iso(now), words: "сегодня" }
  for (const [stem, day] of WEEKDAYS) {
    const i = t.indexOf(stem)
    if (i < 0) continue
    const past = /прошл|last/.test(t.slice(Math.max(0, i - 12), i))
    const today = now.getUTCDay()
    const diff = past ? -(((today - day + 7) % 7) || 7) : (day - today + 7) % 7
    return { at: iso(addDays(now, diff)), words: t.slice(i, i + stem.length + 2).trim() }
  }
  return null
}

/**
 * Место из вопроса — одно из уже известных памяти мест.
 *
 * @param {string} text
 * @param {string[]} knownPlaces — различные значения `scope_place` из таблицы
 */
export function placeInQuestion(text, knownPlaces) {
  const words = String(text ?? "").toLowerCase().split(/[^\p{L}\p{N}-]+/u).filter((w) => w.length >= 4)
  // 🔒 218-15: МЕСТА ПРИХОДЯТ ОТ СВЕЖЕГО К СТАРОМУ, И «ТО КАФЕ» В ВОПРОСЕ — САМОЕ СВЕЖЕЕ КАФЕ ИСТОРИИ.
  // Сверяется любое слово места, а не только первое: «кафе «Лима» на Гран-Виа» находится и по «кафе»,
  // и по «Лима».
  for (const place of knownPlaces ?? []) {
    const p = String(place ?? "").trim()
    if (!p) continue
    const stems = p.toLowerCase().split(/[^\p{L}\p{N}-]+/u).filter((w) => w.length >= 4)
      // короткое слово теряет последнюю букву на падеже («Лима» → «в Лиме»), поэтому основа на букву короче
      .map((w) => (w.length <= 4 ? w.slice(0, w.length - 1) : w.slice(0, Math.min(5, w.length - 1))))
    if (stems.some((stem) => words.some((w) => w.startsWith(stem)))) return p
  }
  return null
}

/**
 * Сравнить находку с охватом вопроса.
 *
 * @returns {"match"|"other"|"unknown"} — совпадает · про другое время или место · у находки его нет.
 * 🔒 «unknown» НЕ РАВНО «other»: запись без места может быть о Мадриде, и выбросить её — соврать.
 */
export function scopeFit(found, qScope) {
  if (!qScope) return "unknown"
  const checks = []
  if (qScope.place) {
    const fp = String(found?.place ?? "").toLowerCase()
    if (fp) checks.push(fp.startsWith(qScope.place.toLowerCase().slice(0, 5)))
  }
  if (qScope.at) {
    const fa = String(found?.at ?? "")
    if (/^\d{4}-\d{2}-\d{2}$/.test(fa)) checks.push(fa === qScope.at)
  }
  if (!checks.length) return "unknown"
  return checks.every(Boolean) ? "match" : "other"
}

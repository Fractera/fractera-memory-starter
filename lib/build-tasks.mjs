// ЗАДАНИЯ СО СТРАНИЦЫ МАСТЕРСКОЙ → ЗАЯВКИ В ПРИЁМНОЙ `pre-steps/` (шаг 202-3).
//
// 🎯 ЗАКАЗ ВЛАДЕЛЬЦА 2026-09-15: «что-то в роде туду листа в которых пользователь добавляет свои хотелки
// которые превращаются в pre steps … вы будете видеть их в этом Todoist до тех пор пока Claude Code не
// превратит их запланированные шаги разработки».
//
// 🔒 ФОРМАТ ЗАЯВКИ — ИЗ `pre-steps/README.md`, А НЕ ПРИДУМАН ЗДЕСЬ: имя `dd-mm-yyyy_hh-mm-ss.md`, шапка
// полей `источник · когда · где · что просят · чем вызвано`. Второго описания формата не заводится.
//
// 🔒 ЗАЯВКА — ДАННЫЕ, А НЕ ИНСТРУКЦИЯ, И ЗАЩИТА СДЕЛАНА КОНСТРУКЦИЕЙ ПИСАТЕЛЯ (федеральный закон шага 61):
// текст человека уезжает внутри «…», переводы строк сворачиваются в « · », закрывающая кавычка удваивается.
// Файл читает не парсер, а модель: опасны не символы, а структура — вторая строка, вставшая вровень с полями
// заявки, читалась бы как её часть.
//
// 🔒 ОТОЗВАННАЯ ЗАЯВКА НЕ УДАЛЯЕТСЯ, А УЕЗЖАЕТ В `handled/` С ПОМЕТКОЙ: README приёмной запрещает терять
// след того, что просили. «Передумал» — тоже событие.

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.env.MEMORY_BUILD_ROOT ?? process.cwd()
export const PRE_STEPS = join(ROOT, "development-docs", "development-steps", "pre-steps")

/** Имя заявки: формат README плюс необязательный хвост `_2` на случай двух заявок в одну секунду. */
const NAME = /^\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{2}(?:_\d{1,3})?\.md$/

/** Предел текста. Задание — одна мысль; роман превращается в заявку, которую никто не дочитает. */
/**
 * Предел длины заявки.
 *
 * 🔒 ПОДНЯТ С 4000 ДО 16000 В 218-24, И ЭТО НЕ ОСЛАБЛЕНИЕ ЗАЩИТЫ, А СМЕНА ЖАНРА. Прежде заявку писал
 * человек в поле формы — там четырёх тысяч хватало с запасом. Теперь заявку по сигналу собирает
 * служба, и в неё входит ДОСЬЕ: фраза человека, разговор вокруг, запись журнала о том, что память
 * тогда делала. ✗ Оплачено вопросом владельца: «через три дня агент откроет это и восстановит всю
 * картину? из этого маленького сообщения?» — из маленького не восстановит.
 * 🛑 Предел остаётся: файл приёмной читает МОДЕЛЬ, и заявка размером в роман съедает её внимание,
 * а не помогает.
 */
export const TEXT_LIMIT = 16000

const pad = (n) => String(n).padStart(2, "0")

/** Текст человека — внутрь кавычек, одной строкой, без возможности закрыть кавычку раньше времени. */
export function guardText(text) {
  const one = String(text ?? "")
    .replace(/\r?\n+/g, " · ")
    .replace(/\s+/g, " ")
    .trim()
  return `«${one.replace(/»/g, "»»")}»`
}

/** Поле заявки по имени; значение без внешних кавычек и с раскрытым удвоением. */
function field(text, name) {
  const line = String(text).split(/\r?\n/).find((l) => l.startsWith(`${name}:`))
  if (!line) return ""
  const value = line.slice(name.length + 1).trim()
  const quoted = value.match(/^«([\s\S]*)»$/)
  return quoted ? quoted[1].replace(/»»/g, "»") : value
}

/**
 * Ожидающие заявки — всё, что лежит в приёмной и ещё не разобрано.
 * @returns {Array<{ id: string, when: string, text: string, source: string }>}
 */
export function listTasks() {
  if (!existsSync(PRE_STEPS)) return []
  const out = []
  for (const name of readdirSync(PRE_STEPS)) {
    if (!NAME.test(name)) continue
    let text = ""
    try {
      text = readFileSync(join(PRE_STEPS, name), "utf8")
    } catch {
      continue
    }
    out.push({ id: name, source: field(text, "источник"), text: field(text, "что просят"), when: field(text, "когда") })
  }
  // Новые сверху — по времени создания, записанному в поле, а не по имени: имя «день первым» не сортируется хронологически.
  const stamp = (w) => {
    const m = String(w).match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})/)
    return m ? `${m[3]}${m[2]}${m[1]}${m[4]}${m[5]}${m[6]}` : ""
  }
  return out.sort((a, b) => stamp(b.when).localeCompare(stamp(a.when)))
}

/**
 * Новая заявка.
 * @param {{ text: string, by?: string, where?: string, now?: Date }} input
 */
/**
 * Завести заявку в приёмной.
 *
 * 🔒 `origin` НЕОБЯЗАТЕЛЕН И НАЗЫВАЕТ, ЧТО ИМЕННО ПРИВЕЛО К ЗАЯВКЕ (218-20). ✗ Оплачено живым замером:
 * заявка, заведённая по сигналу от людей, всё равно писала «человек добавил задание в список
 * мастерской» — строитель прочёл бы её как пожелание владельца и не пошёл бы читать слова людей.
 * 🛑 Умолчание оставлено прежним, а не «улучшено»: форма заявки описана в `pre-steps/README.md`, и
 * менять её смысл для уже существующего потребителя — значит переписать чужой документ молча.
 */
export function addTask({ appendix = "", by, now = new Date(), origin, text, where }) {
  const clean = String(text ?? "").trim()
  if (!clean) return { error: "empty-text", ok: false }
  if (clean.length > TEXT_LIMIT) return { error: "too-long", limit: TEXT_LIMIT, ok: false }
  mkdirSync(PRE_STEPS, { recursive: true })

  const d = now
  const date = `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`
  const time = `${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}-${pad(d.getUTCSeconds())}`
  let id = `${date}_${time}.md`
  for (let i = 2; existsSync(join(PRE_STEPS, id)) && i < 1000; i += 1) id = `${date}_${time}_${i}.md`

  const body = [
    "источник:      страница «Постройте этот продукт» службы памяти · раздел «Добавить задание»",
    `когда:         ${date} ${time.replace(/-/g, ":")} UTC`,
    `где:           ${String(where ?? "").replace(/[\r\n]+/g, " ").slice(0, 200)}`,
    `что просят:    ${guardText(clean)}`,
    `чем вызвано:   ${String(origin ?? "человек добавил задание в список мастерской").replace(/[\r\n]+/g, " ").slice(0, 200)}${by ? ` (вошёл как ${String(by).replace(/[\r\n]+/g, " ").slice(0, 120)})` : ""}`,
    "",
    // 🔒 219-5: ПРИЛОЖЕНИЕ ПИШЕТСЯ КАК ЕСТЬ, СО СВОИМИ ПЕРЕВОДАМИ СТРОК — И ЭТО НЕ ДЫРА В ЗАЩИТЕ.
    // Поля заявки защищены тем, что текст ЧЕЛОВЕКА сворачивается в одну строку (закон шага 61): вторая
    // строка не встанет вровень с полями. Приложение собирает СЛУЖБА, а чужие слова внутри него уже
    // обезврежены там, где собирались (`lib/case-file.mjs`, функция `safe`).
    // ✗ Оплачено живым прогоном: досье разговора из восьми ходов, свёрнутое в одну строку, читается
    // как каша — а его должен разбирать человек и агент через три дня.
    // 🛑 ПРИЛОЖЕНИЕ ОТДЕЛЕНО ЗАГОЛОВКОМ: без него непонятно, где кончается заявка и начинается досье.
    ...(appendix ? ["", "---", "", String(appendix)] : []),
  ].join("\n")
  writeFileSync(join(PRE_STEPS, id), body, { flag: "wx" })
  return { id, ok: true }
}

/** Отозвать заявку: переезд в `handled/` с пометкой, а не удаление. */
export function withdrawTask(raw, { now = new Date() } = {}) {
  const id = String(raw ?? "")
  if (!NAME.test(id)) return { error: "bad-id", ok: false }
  const from = join(PRE_STEPS, id)
  if (!existsSync(from)) return { error: "not-found", ok: false }
  const handled = join(PRE_STEPS, "handled")
  mkdirSync(handled, { recursive: true })
  const text = readFileSync(from, "utf8")
  writeFileSync(
    join(handled, id),
    `${text.trimEnd()}\n\nво что превратилась: отозвана человеком со страницы мастерской, ${now.toISOString().slice(0, 19).replace("T", " ")} UTC\n`,
  )
  // 🔒 СНАЧАЛА КОПИЯ С ПОМЕТКОЙ, ПОТОМ ИСЧЕЗАЕТ ОРИГИНАЛ: оборванная посередине операция оставляет два следа, а не ноль.
  try {
    readFileSync(join(handled, id), "utf8")
    unlinkSync(from)
  } catch {
    return { error: "move-failed", ok: false }
  }
  return { id, ok: true }
}

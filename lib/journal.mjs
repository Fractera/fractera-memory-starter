// ЖУРНАЛ — ЕДИНСТВЕННЫЙ ВЫХОД ПАМЯТИ НАРУЖУ ДЛЯ ГЛАЗ (177-1).
//
// 🔒 ОДИН ДОКУМЕНТ НА ДВОИХ ЧИТАТЕЛЕЙ — РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-10, ДОСЛОВНО:
// «ты читаешь Markdown документ, я читаю страницу из этого [же] документа. В
// интерфейсе для человека есть кнопка очистить историю, она очищает [этот]
// документ, в итоге ты также видишь пустую историю».
// 🛑 ОТСЮДА ГЛАВНОЕ ТРЕБОВАНИЕ: ВТОРОГО ИСТОЧНИКА НЕ СУЩЕСТВУЕТ. Ни базы «для
// страницы», ни памяти процесса «для скорости» — две копии разошлись бы, и
// человек с агентом обсуждали бы разные события, не зная об этом.
//
// 🔒 ЗАЧЕМ ЖУРНАЛ ВООБЩЕ ЗАВЕДЁН: АГЕНТУ ЗАКРЫТ ВХОД В СЛОИ. Он не может войти
// внутрь и посмотреть — значит слой обязан сам рассказать, что у него внутри.
// ✗ До этого шага память не писала НИЧЕГО: две строки при старте службы, и всё.
// Отброшенные факты, отказы модели, решения о новых родах не оставляли следа
// нигде — снаружи это неотличимо от «память просто не сработала».
//
// 🔒 MARKDOWN, А НЕ JSON, И ЭТО СЛЕДСТВИЕ ДВУХ ЧИТАТЕЛЕЙ. JSON пришлось бы
// превращать в текст для человека — то есть завести правила показа, которые
// сами становятся вторым источником правды. Markdown читается обоими как есть.

import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * 🔒 ДОКУМЕНТ ЛЕЖИТ В ДЕРЕВЕ САМОЙ СЛУЖБЫ, А НЕ В ОБЩЕЙ ПАПКЕ МАШИНЫ.
 * Закон 137: у службы свои файлы в своём дереве. Общий журнал на всех сделал бы
 * одну службу зависимой от дерева другой.
 */
export const JOURNAL_PATH =
  process.env.MEMORY_JOURNAL ?? join(HERE, "..", "logs", "memory-log.md")

/**
 * 🔒 ПРЕДЕЛ РАЗМЕРА ЕСТЬ, И ОН НАЗЫВАЕТСЯ В САМОМ ДОКУМЕНТЕ.
 * Файл, растущий без границы, однажды съедает диск боевой машины — и выглядит
 * это как отказ всех процессов сразу (оплачено ротацией логов pm2 в шаге 115).
 * 🛑 НО ОБРЕЗКА НЕ ПРОИСХОДИТ МОЛЧА: потерянное начало отмечается строкой, иначе
 * пропажа читается как «этого не было».
 */
const LIMIT_BYTES = Number(process.env.MEMORY_JOURNAL_LIMIT ?? 512 * 1024)

/** Сколько оставляем при обрезке — три четверти предела, чтобы не резать каждый раз. */
const KEEP_BYTES = Math.floor(LIMIT_BYTES * 0.75)

const NL = String.fromCharCode(10)

/** Время в виде, который читают глазами, а не разбирают программой. */
function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/**
 * Значение — в строку, пригодную для чтения человеком.
 *
 * 🛑 ДЛИННОЕ ОБРЕЗАЕТСЯ С ПОМЕТКОЙ. Ответ модели бывает на тысячи знаков, и
 * журнал, состоящий из одного такого ответа, перестаёт быть журналом.
 */
function short(v, max = 600) {
  const s = typeof v === "string" ? v : JSON.stringify(v)
  if (s === undefined || s === null) return "—"
  return s.length > max ? `${s.slice(0, max)}… (обрезано, всего ${s.length})` : s
}

/** Список пунктов; пустой список говорит об этом словами, а не исчезает. */
function bullets(items) {
  if (!Array.isArray(items) || items.length === 0) return "  — нет" + NL
  return items.map((i) => `  - ${short(i, 300)}`).join(NL) + NL
}

/**
 * Дописать запись о том, что произошло внутри.
 *
 * 🛑 ЗАПИСЬ НЕ ИМЕЕТ ПРАВА СЛОМАТЬ ОТВЕТ ПАМЯТИ. Диск полон, папки нет, права не
 * те — память отвечает как обычно. Отказ журнала уходит в `console.error`, то
 * есть в лог pm2: у последнего рубежа должен быть свой рубеж.
 */
export async function note(entry) {
  try {
    const { asked, decisions, dropped, method, ms, model, returned, skipped, trouble } = entry ?? {}

    let block = ""
    block += `## ${stamp()} · ${method ?? "?"}${ms === undefined ? "" : ` · ${ms} мс`}${NL}${NL}`
    if (asked !== undefined) block += `**Пришло:** ${short(asked)}${NL}${NL}`
    if (model !== undefined) block += `**Модель вернула:** ${short(model)}${NL}${NL}`
    if (decisions !== undefined) {
      block += `**Что память решила:**${NL}${bullets(decisions)}${NL}`
    }
    // 🔒 ОТБРОШЕННОЕ ПИШЕТСЯ НАРАВНЕ С ЗАПИСАННЫМ, И ЭТО ГЛАВНОЕ В ЖУРНАЛЕ.
    // Именно оно объясняет, почему память «не запомнила»; без него отказ
    // выглядит молчаливым, и виноватой кажется вся способность.
    if (dropped !== undefined) block += `**Отброшено:**${NL}${bullets(dropped)}${NL}`
    if (skipped !== undefined) block += `**Пропущено (не о нём):**${NL}${bullets(skipped)}${NL}`
    if (trouble !== undefined && trouble !== null) block += `**Отказ:** ${short(trouble)}${NL}${NL}`
    if (returned !== undefined) block += `**Ушло наружу:** ${short(returned)}${NL}${NL}`

    await mkdir(dirname(JOURNAL_PATH), { recursive: true })
    await appendFile(JOURNAL_PATH, block, "utf8")
    await trimIfNeeded()
  } catch (e) {
    console.error("журнал не записался:", String(e?.message ?? e))
  }
}

/** Обрезать начало, если документ перерос предел, и сказать об этом в нём же. */
async function trimIfNeeded() {
  let size
  try {
    size = (await stat(JOURNAL_PATH)).size
  } catch {
    return
  }
  if (size <= LIMIT_BYTES) return

  const all = await readFile(JOURNAL_PATH, "utf8")
  const cut = all.slice(all.length - KEEP_BYTES)
  // Режем по границе записи, а не посреди строки: половина заголовка читается
  // как поломка документа.
  const from = cut.indexOf(`${NL}## `)
  const kept = from >= 0 ? cut.slice(from + 1) : cut
  const head =
    `> ⚠️ Начало журнала обрезано ${stamp()}: документ перерос ${LIMIT_BYTES} байт.` +
    ` Осталось последнее.${NL}${NL}`
  await writeFile(JOURNAL_PATH, head + kept, "utf8")
}

/** Прочитать документ целиком. Нет файла — пустая строка, а не отказ. */
export async function readAll() {
  try {
    return await readFile(JOURNAL_PATH, "utf8")
  } catch {
    return ""
  }
}

/**
 * Очистить историю.
 *
 * 🔒 ВОЗВРАЩАЕТ, СКОЛЬКО ЗАПИСЕЙ СТЁРТО. «Готово» и «стёрто 214 записей» —
 * разные ответы; второй доказывает, что стёрли именно то, что было.
 */
export async function clear() {
  const before = await readAll()
  const entries = (before.match(/^## /gm) ?? []).length
  try {
    await mkdir(dirname(JOURNAL_PATH), { recursive: true })
    await writeFile(JOURNAL_PATH, "", "utf8")
    return { cleared: entries, ok: true }
  } catch (e) {
    return { error: String(e?.message ?? e), ok: false }
  }
}

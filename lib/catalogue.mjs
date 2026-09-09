// КАТАЛОГ: ЧТО У ПАМЯТИ ЕСТЬ, В ВИДЕ ИМЁН.
//
// 🔒 ЗАМЫСЕЛ ВЛАДЕЛЬЦА 2026-09-09, ДОСЛОВНО: «модель запросит через API названия
// таблиц и просто уже из названия таблиц поймёт, что и нужно, а если будет
// сомневаться, то для каждой таблицы сделаем API, который вернёт её описание».
//
// 🔒 ОТСЮДА ГЛАВНОЕ ПРАВИЛО ЭТОГО ФАЙЛА: ОПИСАНИЕ — НА СЛУЧАЙ СОМНЕНИЯ, А НЕ НА
// КАЖДЫЙ РАЗ. Если за описанием ходят всегда, значит имена плохи — и это видно
// числом, а не мнением: доля обращений к `/tables/{имя}` от обращений к
// `/tables`. Счётчик ниже существует именно для этого.
//
// 🛑 И ГРАНИЦА, БЕЗ КОТОРОЙ ВЕСЬ КАТАЛОГ ОПАСЕН: имя источника называется в
// ОТВЕТЕ и никогда не принимается в ВОПРОСЕ. Пока `recall` берёт человеческую
// фразу, знание имён у агента ИНЕРТНО — применить его некуда, кроме как
// спросить точнее. Появись параметр «ищи вот в этой таблице» — агент начнёт
// решать за память, где искать, и чёрный ящик перестанет быть ящиком.

import { levelsOf, parentOf, ROOT } from "./naming.mjs"
import { columnsOf, ourTables, REQUIRED_COLUMNS, sql } from "./store.mjs"
import { BASIS_SUFFIX, CLAIM_SUFFIX } from "./store.mjs"

const BOOKKEEPING = new Set(["id", "who", "created_at"])
const isPair = (c) => c.endsWith(CLAIM_SUFFIX) || c.endsWith(BASIS_SUFFIX)

/**
 * 🔒 МЕРА КАЧЕСТВА ИМЁН, А НЕ УКРАШЕНИЕ. Живёт в памяти процесса и обнуляется с
 * перезапуском — этого довольно: нас интересует ОТНОШЕНИЕ, а не история.
 */
const asked = { describe: 0, list: 0 }

export function nameQuality() {
  const ratio = asked.list ? Math.round((asked.describe / asked.list) * 100) / 100 : null
  return {
    asked_for_description: asked.describe,
    asked_for_list: asked.list,
    // Ходят за описанием чаще, чем за списком, — имена не объясняют себя.
    description_per_list: ratio,
  }
}

/** Слова имени, пригодные человеку: путь от человека вниз, через «→». */
function readable(name) {
  return levelsOf(name)
    .map((l) => l.split("_").join(" "))
    .join(" → ")
}

/**
 * Список имён — и часто этого одного довольно.
 *
 * 🔒 ИМЯ ИДЁТ ВМЕСТЕ С ЧИСЛОМ ЗАПИСЕЙ. «Есть таблица друзей» и «есть таблица
 * друзей, и в ней трое» — разные ответы; второй избавляет от похода за описанием.
 */
export async function listTables() {
  asked.list += 1
  const names = await ourTables()
  const out = []
  for (const name of names) {
    const c = await sql(`SELECT COUNT(*) AS n FROM ${name}`)
    out.push({
      name,
      parent: parentOf(name) || null,
      reads_as: readable(name),
      records: c.ok && c.rows.length ? c.rows[0].n : null,
    })
  }
  return { ok: true, tables: out }
}

/**
 * Описание одной таблицы — на случай сомнения.
 *
 * 🔒 ПУСТОЕ ГОВОРИТ «НЕ ОПИСАНО», А НЕ ПОДСТАВЛЯЕТ ВЫДУМАННОЕ. У родов, которые
 * завела модель по речи человека, прозы нет и взяться ей неоткуда — их
 * объясняет собственное имя. Придуманное объяснение было бы ложью о том, что
 * система понимает.
 */
export async function describeTable(name) {
  asked.describe += 1
  const names = await ourTables()
  if (!names.includes(name)) {
    return {
      error: "unknown-table",
      hint: "у памяти нет такой таблицы; список — GET /v1/tables",
      ok: false,
    }
  }

  const cols = await columnsOf(name)
  const kinds = cols
    .filter((c) => !BOOKKEEPING.has(c) && !isPair(c))
    .map((c) => ({
      explained: REQUIRED_COLUMNS[c] ?? null,
      name: c,
      reads_as: c.split("_").join(" "),
    }))

  const c = await sql(`SELECT COUNT(*) AS n FROM ${name}`)

  return {
    kinds,
    name,
    ok: true,
    parent: parentOf(name) || null,
    reads_as: readable(name),
    records: c.ok && c.rows.length ? c.rows[0].n : null,
    // 🔒 ГОВОРИМ ВСЛУХ, ЧТО ИМЯ И ЕСТЬ ОБЪЯСНЕНИЕ. Иначе пустое `explained`
    // читается как «описание потеряли», а не как «его и не должно быть».
    what_explains_the_kinds:
      "имена родов — это фразы: они объясняют себя сами. `explained` заполнен только там, " +
      "где у рода есть отдельная проза; пусто значит «не описано», а не «неизвестно».",
  }
}

export { ROOT }

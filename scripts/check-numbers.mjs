#!/usr/bin/env node
//
// СТОРОЖ ЧИСЕЛ (208-6): рукописное число обязано совпадать с порождённым.
//
// 🔒 ЗАЧЕМ ОН ЕСТЬ. «Список, написанный руками, расходится с кодом молча» — закон, оплаченный в этом
// проекте не менее пяти раз за три дня, причём дважды автором самого закона. Знание закона число не
// двигает; двигает только сторож, роняющий сборку.
//
// 🔒 ЧТО ИМЕННО ОН ДЕЛАЕТ: находит в живых файлах фразы вида «РАЗДЕЛОВ ДЕСЯТЬ», «глаголов три»,
// «навыков восемь» — и сверяет с тем, что печатает код. Число словом, а не цифрой, — потому что так
// их и пишут в этом корпусе.
// 🛑 НАДГРОБИЯ ПРОПУСКАЮТСЯ: строка с 🪦 говорит о прошлом, и требовать от неё сегодняшнего числа
// значит запрещать истории быть историей.

import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { pathToFileURL } from "node:url"
import { contract } from "../contract.mjs"
import { KINDS } from "../lib/messages.mjs"


const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

// 🔒 ЧИСЛО ТОЛЬКО СЛОВОМ, И НЕ «ОДИН». Цифры в этом корпусе почти всегда номер шага («С 195-2 родов
// десять»), и считать их числом значит ловить собственную историю. «Один» же почти всегда значит не
// количество, а единственность: «один навык — только из списка».
const WORDS = {
  два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6,
  семь: 7, восемь: 8, девять: 9, десять: 10, одиннадцать: 11, двенадцать: 12, тринадцать: 13,
}

/**
 * Сколько разделов у консоли. Читается ТЕКСТОМ из TypeScript-файла: node не исполняет .ts, а
 * заводить сборку ради одного числа дороже самой проверки. Считается перечисление, а не комментарий.
 */
function sectionsCount() {
  const src = readFileSync(join(ROOT, "app", "[lang]", "settings", "_lib", "memory-sections.ts"), "utf8")
  const body = /export const MEMORY_SECTIONS = \[([\s\S]*?)\] as const/.exec(src)?.[1] ?? ""
  return (body.match(/^\s*"[a-z-]+",/gm) ?? []).length
}

/** Что и по какому слову считается. Правится вместе с тем, что оно считает. */
export function truths() {
  return {
    глагол: contract().methods.length,
    навык: readdirSync(join(ROOT, ".claude", "skills"), { withFileTypes: true }).filter((d) => d.isDirectory()).length,
    раздел: sectionsCount(),
    род: KINDS.length,
  }
}

// 🔒 ГРАНИЦА СЛОВА ОБЯЗАТЕЛЬНА. ✗ Без неё «ДВА раздельных факта» читалось как «два раздела», и
// сторож требовал править фразу, к разделам не относящуюся вовсе.
// 🛑 И ГРАНИЦА ЗАДАНА ПРОСМОТРОМ ВПЕРЁД, А НЕ `\b`: в JavaScript `\b` — граница ASCII-слова, и после
// кириллицы она НЕ СРАБАТЫВАЕТ НИКОГДА. ✗ Оплачено здесь же: с `\b` сторож нашёл ноль нарушений при
// четырнадцати настоящих и напечатал «числа сходятся». Сторож, чьего отказа никто не видел, зелен по
// причине собственной слепоты — поэтому у него ниже свой негативный контроль.
const STEM = {
  глагол: /глагол(?:ов|а|ы)?(?![а-яё])/i,
  навык: /навык(?:ов|а|и)?(?![а-яё])/i,
  раздел: /раздел(?:ов|а|ы)?(?![а-яё])/i,
  род: /род(?:ов|а|ы)?(?![а-яё])/i,
}

/**
 * ИСКЛЮЧЕНИЯ — «правило сюда не относится», и у каждого названа причина (закон о трёх вердиктах).
 *
 * 🔒 ИСКЛЮЧЕНИЕ НЕ ЕСТЬ ПРОЩЕНИЕ НАРУШЕНИЯ. Здесь стоят места, где слово значит ДРУГОЕ: «два
 * глагола этого файла» — часть из трёх; «пять разделов записки владельца» — не разделы консоли.
 * Сторож, который заставит их «исправить», сделает текст ложью ради зелёного цвета.
 */
const EXCEPTIONS = [
  [/lib[\\/]verbs\.mjs$/, "глагол", "в этом файле живут два глагола из трёх; третий — в feedback.mjs"],
  [/check-contract\.mjs$/, "глагол", "схему ответа описывают два глагола из трёх — у комментария она своя"],
  [/instruction-shape\.mjs$/, "раздел", "пять разделов записки владельца — это не разделы консоли"],
  [/probe[\\/]verbs\.mjs$/, "глагол", "прибор 175-2 проверяет именно два глагола, какими они были тогда"],
  // 🔒 СОБСТВЕННЫЙ НЕГАТИВНЫЙ КОНТРОЛЬ СТОРОЖА ЖИВЁТ ЗАВЕДОМО ЛОЖНЫМИ ЧИСЛАМИ — это его работа.
  // Без исключения сторож ловил бы прибор, который проверяет сторожа, и оба стали бы красными: один
  // за то, что врёт, другой за то, что поймал вранье.
  [/numbers-guard\.mjs$/, "глагол", "прибор ловит сторожа на заведомо ложных числах"],
  [/numbers-guard\.mjs$/, "род", "то же: ложные числа здесь — материал проверки"],
  [/numbers-guard\.mjs$/, "раздел", "то же"],
]

export function problemsIn(text, file, counts) {
  const out = []
  const excused = new Set(EXCEPTIONS.filter(([re]) => re.test(file)).map(([, name]) => name))
  for (const line of text.split("\n")) {
    if (line.includes("🪦")) continue
    for (const [name, re] of Object.entries(STEM)) {
      if (excused.has(name)) continue
      // «РАЗДЕЛОВ ДЕСЯТЬ» или «разделов 10» — в обе стороны от слова
      const m = new RegExp(`${re.source}\\s+([А-Яа-я]+|\\d+)|([А-Яа-я]+|\\d+)\\s+${re.source}`, "i").exec(line)
      if (!m) continue
      const raw = (m[1] ?? m[2] ?? "").toLowerCase()
      const said = /^\d+$/.test(raw) ? Number(raw) : WORDS[raw]
      if (said === undefined) continue
      if (said !== counts[name]) {
        out.push(`${file}: сказано ${name}: ${said}, на самом деле ${counts[name]} — «${line.trim().slice(0, 80)}»`)
      }
    }
  }
  return out
}

function walk(dir, files = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", ".next", "development-docs"].includes(e.name)) continue
    const full = join(dir, e.name)
    if (e.isDirectory()) walk(full, files)
    else if (/\.(ts|tsx|mjs|md)$/.test(e.name)) files.push(full)
  }
  return files
}

function main() {
  const counts = truths()
  const problems = []
  for (const f of walk(ROOT)) {
    if (f.endsWith("check-numbers.mjs")) continue
    problems.push(...problemsIn(readFileSync(f, "utf8"), f.replace(ROOT, ""), counts))
  }
  for (const why of problems) console.log("🛑 " + why)
  if (problems.length === 0) {
    for (const [, name, why] of EXCEPTIONS) console.log(`  · исключение (${name}): ${why}`)
    console.log(`✓ числа сходятся: глаголов ${counts.глагол}, навыков ${counts.навык}, разделов ${counts.раздел}, родов ${counts.род}`)
    process.exit(0)
  }
  process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()

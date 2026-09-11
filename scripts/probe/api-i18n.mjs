#!/usr/bin/env node
//
// ПРИБОР 185-2 — ВКЛАДКА API ГОВОРИТ НА ОДНОМ ЯЗЫКЕ И НИЧЕГО НЕ ТЕРЯЕТ.
//
// 🔒 ЧТО ИЗМЕРЯЕТСЯ. Страница показывает СПИСОК из договора и СЛОВА из словаря.
// Значит есть ровно один способ соврать: договор вырос, а перевода нет — и на
// экране появится текст договора с пометкой «перевода пока нет». Прибор ловит
// это ДО того, как увидит человек, и делает это в каждом языке.
//
// 🛑 ПРИБОР НИЧЕГО НЕ МЕНЯЕТ И НЕ ЗОВЁТ СЛУЖБУ: он читает два файла. Значит его
// можно гонять сколько угодно и на любой машине — в том числе там, где памяти
// нет вовсе.

import { CATALOGUE, METHODS } from "../../contract.mjs"

// 🔒 СЛОВАРЬ ЧИТАЕТСЯ КАК ТЕКСТ, А НЕ ИМПОРТИРУЕТСЯ: он на TypeScript, и узел
// его не исполнит. Нам нужны ключи, а не значения, — для этого чтения хватает.
// 🛑 И ЭТО НАЗВАННОЕ ОГРАНИЧЕНИЕ: прибор проверяет НАЛИЧИЕ ключа, а не то, что
// перевод осмыслен. Осмысленность проверяет человек, и подменять его нельзя.
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const dict = readFileSync(join(here, "..", "..", "app", "[lang]", "settings", "_i18n", "api.i18n.ts"), "utf8")

let bad = 0
const say = (ok, what, extra = "") => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}${extra ? "  — " + extra : ""}`)
}

console.log("=".repeat(72))
console.log("ПРИБОР 185-2 — переводы вкладки API")
console.log("=".repeat(72))
console.log("")

/** Сколько раз ключ встречается в словаре: по разу на язык — значит переведён везде. */
function times(key) {
  const safe = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return (dict.match(new RegExp(`(^|\\s)"?${safe}"?\\s*:`, "g")) ?? []).length
}

// Сколько языков объявлено в словаре — считаем по веткам, а не по памяти.
const langs = (dict.match(/^const (EN|RU): ApiDocWords = \{/gm) ?? []).length
say(langs >= 2, "языков в словаре объявлено", String(langs))

// ── ① У КАЖДОГО МЕТОДА ДОГОВОРА ЕСТЬ СЛОВА В КАЖДОМ ЯЗЫКЕ ────────────────────
for (const m of METHODS) {
  say(times(m.name) >= langs, `метод «${m.name}»: перевод есть в каждом языке`, `${times(m.name)} из ${langs}`)
}

// ── ② У КАЖДОГО ПАРАМЕТРА ТОЖЕ ───────────────────────────────────────────────
const params = [...new Set(METHODS.flatMap((m) => m.params.map((p) => p.name)))]
for (const name of params) {
  say(times(name) >= langs, `параметр «${name}»: перевод есть в каждом языке`, `${times(name)} из ${langs}`)
}

// ── ③ И У КАТАЛОГА ───────────────────────────────────────────────────────────
for (const c of CATALOGUE) {
  say(dict.includes(`"${c.path}"`), `каталог «${c.path}»: перевод есть`, dict.includes(`"${c.path}"`) ? "" : "ключа нет")
}

// ── ④ НЕГАТИВНЫЙ КОНТРОЛЬ: ПРИБОР УМЕЕТ ОТВЕЧАТЬ «НЕТ» ───────────────────────
// 🔒 БЕЗ ЭТОГО ОН ЗЕЛЁН ПО ПРИЧИНЕ СОБСТВЕННОЙ СЛЕПОТЫ: проверка «ключ есть»
// проходит и тогда, когда искать она на самом деле не умеет.
say(times("parameter-that-never-existed") === 0, "НЕГАТИВНЫЙ: выдуманного ключа в словаре нет", "0")

// ── ⑤ НЕГАТИВНЫЙ КОНТРОЛЬ: НА СТРАНИЦЕ НЕТ ВТОРОГО ЯЗЫКА ─────────────────────
// 🛑 ЭТО ПРЯМОЕ ТРЕБОВАНИЕ ВЛАДЕЛЬЦА: «на одной странице не надо делать текст и
// на русском и на английском». Проверяем сам компонент: русские буквы в нём
// допустимы ТОЛЬКО в комментариях, а не в разметке.
const doc = readFileSync(join(here, "..", "..", "app", "[lang]", "settings", "_components", "api-doc.tsx"), "utf8")
const codeOnly = doc
  .split("\n")
  .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
  .join("\n")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
const cyrillicInMarkup = (codeOnly.match(/[а-яё]{3,}/gi) ?? []).length
say(
  cyrillicInMarkup === 0,
  "НЕГАТИВНЫЙ: в разметке вкладки нет зашитых русских слов",
  cyrillicInMarkup ? `найдено ${cyrillicInMarkup}` : "ни одного",
)

console.log("")
console.log("-".repeat(72))
if (bad === 0) {
  console.log("✓ ВСЁ ЗЕЛЁНОЕ: каждый метод и параметр договора переведён в каждом языке")
  process.exit(0)
}
console.log(`🛑 ПРОВАЛОВ: ${bad}`)
process.exit(1)

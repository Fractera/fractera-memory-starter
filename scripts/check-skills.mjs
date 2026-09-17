#!/usr/bin/env node
// СТОРОЖ: КАЖДЫЙ НАВЫК НА ДИСКЕ НАЗВАН В ИНСТРУКЦИИ, И НАОБОРОТ (220).
//
// ✗ ЧЕМ ОПЛАЧЕН. Владелец 2026-09-17 посмотрел инструкцию и спросил, есть ли в ней навыки разработки.
// Они были — а навык `route-beyond-memory`, заведённый в тот же день, в таблицу «Your skills» НЕ
// попал: он упоминался в тексте, но агент, читающий таблицу «когда какой навык открыть», его не
// увидел бы. Способность есть, в списке её нет — тот же класс, что «рукописное число расходится с
// кодом молча».
//
// 🔒 ПОЧЕМУ СТОРОЖ, А НЕ ВНИМАТЕЛЬНОСТЬ. Правка руками лечит сегодняшний случай; одиннадцатый навык
// выпадет точно так же. Список, который никто не порождает, расходится с папкой без предупреждения.
//
// 🔒 ПРОВЕРКА ДВУСТОРОННЯЯ: навык без строки в таблице невидим агенту; строка о навыке, которого нет
// на диске, — обещание, которое агент попытается открыть и не найдёт.
//
// Запуск: node scripts/check-skills.mjs   (входит в `npm run check`)

import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const TABLE_FROM = "## Your skills"
const TABLE_TO = "## What you never do"

const skills = readdirSync(join(ROOT, ".claude", "skills"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

const doc = readFileSync(join(ROOT, "CLAUDE.md"), "utf8")
const from = doc.indexOf(TABLE_FROM)
const to = doc.indexOf(TABLE_TO)
if (from < 0 || to < 0) {
  console.error(`🛑 check:skills — в CLAUDE.md не найден раздел «${TABLE_FROM}»: проверять нечего, и это само по себе дефект`)
  process.exit(1)
}
const table = doc.slice(from, to)

const missing = skills.filter((s) => !table.includes(`\`${s}\``))
// Имена в обратных кавычках внутри таблицы — кандидаты в навыки; лишними считаем те, чьей папки нет.
const named = [...table.matchAll(/`([a-z][a-z0-9-]{3,})`/g)].map((m) => m[1])
const ghosts = [...new Set(named)].filter((n) => skills.includes(n) === false && /^(use-|memory-|describe-|route-)/.test(n))

if (missing.length === 0 && ghosts.length === 0) {
  console.log(`✓ check:skills — навыков ${skills.length}, все названы в инструкции и все названные существуют`)
  process.exit(0)
}
if (missing.length) console.error(`🛑 навык есть на диске, но НЕ названы в таблице инструкции: ${missing.join(", ")}`)
if (ghosts.length) console.error(`🛑 в таблице названы навыки, которых нет на диске: ${ghosts.join(", ")}`)
process.exit(1)

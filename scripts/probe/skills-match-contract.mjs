#!/usr/bin/env node
//
// ПРИБОР 208-2: навыки памяти не описывают снятое как живое.
//
// 🔒 УСТАРЕВШИЙ ЗАКОН В РАБОЧЕМ КОРПУСЕ ОПАСНЕЕ ОТСУТСТВУЮЩЕГО: он лежит там, где строят, и
// заставляет либо обходить работающее, либо обещать человеку то, чего нет. В шаге 206 это оплачено
// трижды за один шаг.
// 🔒 ПРОВЕРЯЕТСЯ ОБЕЩАНИЕ АДРЕСА, А НЕ УПОМИНАНИЕ ИМЕНИ: `find_objects` жив как РУКА агента и мёртв
// как глагол договора. Прибор, не знающий разницы, требует стереть то, чем агент работает.

import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { contract } from "../../contract.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const DIR = join(ROOT, ".claude", "skills")
const names = readdirSync(DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

const GONE_ADDRESSES = ["keep_object", "find_objects", "open_object", "people", "forget_journal"]
const live = contract().methods.map((m) => m.name)

console.log(`навыков ${names.length}: ${names.join(", ")}`)

for (const name of names) {
  const md = readFileSync(join(DIR, name, "SKILL.md"), "utf8")
  for (const gone of GONE_ADDRESSES) {
    check(!md.includes(`/v1/${gone}`), `${name}: не обещает адрес /v1/${gone}`)
  }
  // «кто говорит» перестало быть входом: параметр `who` в схемах вызовов больше не называется
  check(!/\{\s*who\s*[,}]/.test(md), `${name}: не требует «who» на входе`)
}

console.log("— живые адреса, наоборот, должны встречаться хотя бы где-то —")
for (const verb of live) {
  const seen = names.some((n) => readFileSync(join(DIR, n, "SKILL.md"), "utf8").includes(verb))
  check(seen, `глагол ${verb} где-то в навыках назван`)
}

console.log("— негативный контроль счётчика —")
const all = names.map((n) => readFileSync(join(DIR, n, "SKILL.md"), "utf8")).join("\n")
check(all.includes("memory"), "счётчик способен находить живое слово")
check(!all.includes("verb_that_never_existed"), "заведомо ложное имя не находится")

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)

#!/usr/bin/env node
//
// ПРИБОР 211-7: ПРОСЬБА НЕ ПО АДРЕСУ НАЗЫВАЕТСЯ И ПЕРЕАДРЕСУЕТСЯ.
//
// 🎯 СЛУЧАЙ ВЛАДЕЛЬЦА: «запомни что Петя заказал партию чехлов на 100 $ и кстати говоря сделай уже
// нам авторизацию через Google». Две просьбы в одной фразе, и вторая не наша.
//
// 🔒 ГЛАВНОЕ ЗДЕСЬ — ДВА ОТКАЗА СРАЗУ: память не должна ни промолчать о чужой просьбе, ни начать её
// исполнять. Правильный ответ — «записал первое; второе не моё, вот кто этим управляет».

import { elsewhere, elsewhereWords } from "../../lib/elsewhere.mjs"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const verbs = readFileSync(join(ROOT, "lib", "verbs.mjs"), "utf8")

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

const CASE =
  "запомни что Петя заказал у нас партию товара а именно чехлы для телефона на сумму 100 $ и кстати говоря сделай уже нам авторизацию через Google"

console.log("— случай владельца —")
const found = elsewhere(CASE)
check(found.length === 1 && found[0].service === "auth", "чужая просьба узнана и отнесена к службе входа", JSON.stringify(found))
const words = elsewhereWords(found, "ru", "aifa.dev")
check(/не мои полномочия/.test(words), "сказано, что это не наши полномочия")
check(/auth\.aifa\.dev\/ru\/build/.test(words), "назван адрес, где этим управляют", words.slice(-45))
// 🔒 ЧЕЛОВЕКУ ПОКАЗЫВАЕТСЯ ЕГО СЛОВО, А НЕ НАШ КОРЕНЬ: «про авторизац» читается как поломка.
check(/«авторизацию»/.test(words), "показано слово человека целиком")

console.log("— негативный контроль: обычная фраза никуда не переадресуется —")
for (const q of [
  "Петя заказал чехлы для телефона на сто долларов",
  "вчера в Мадриде такси стоило 40 евро",
  "запомни что я говорю по-русски",
]) {
  check(elsewhere(q).length === 0, `«${q.slice(0, 38)}…» — целиком наше дело`)
}

console.log("— о себе память не переадресовывает —")
check(elsewhere("где ты сейчас и на каком порту").every((x) => x.service !== "memory"), "себя в чужие не записывает")

console.log("— домен подставляется из запроса, а не выдумывается —")
const noDomain = elsewhereWords(found, "ru", null)
check(/<domain>/.test(noDomain), "домена не знаем — уезжает честный образец", noDomain.slice(-30))

console.log("— способность ПОДКЛЮЧЕНА к «Сказать», а не просто написана —")
check(verbs.includes("elsewhere(text)"), "глагол зовёт маршрутизатор")
check(verbs.includes("elsewhereWords(notMine"), "и приписка попадает в текст ответа")

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)

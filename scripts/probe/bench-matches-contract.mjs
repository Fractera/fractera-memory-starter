#!/usr/bin/env node
//
// ПРИБОР 211-4: СТЕНД СООТВЕТСТВУЕТ ДОГОВОРУ, А ДОГОВОР — НОВЫМ ТРЕБОВАНИЯМ.
//
// ✗ ЗАЧЕМ ОН ПОЯВИЛСЯ: расхождение стенда с договором нашёл ЖИВОЙ ПРОГОН ВЛАДЕЛЬЦА, а не машина.
// Он спросил стенд «Где ты сейчас» и увидел там прежнюю пару кнопок при трёх глаголах договора,
// а ответ назвал ступень глубже построенного. Всё это было видно из кода — и не было видно никому.
//
// 🔒 ПРОВЕРЯЕТСЯ ТРИ СВЯЗИ, И КАЖДАЯ РВЁТСЯ МОЛЧА:
//   договор → стенд (глаголов столько же, и это те же глаголы);
//   договор → сборка вызова (у каждого глагола свой метод, поля берутся из договора);
//   код → обещание о глубине (нельзя называть ступень, которой нет).

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { buildCall, EMPTY_PARAMS } from "../../lib/bench-call.mjs"
import { BUILT_LEVELS, DEPTH_CEILING } from "../../lib/params.mjs"
import { contract } from "../../contract.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const stand = readFileSync(join(ROOT, "app", "[lang]", "settings", "_components", "memory-test.client.tsx"), "utf8")
const verbs = readFileSync(join(ROOT, "lib", "verbs.mjs"), "utf8")

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

const c = contract()
const names = c.methods.map((m) => m.name)
console.log(`договор ${c.version}: ${names.join(" · ")}`)

console.log("— у стенда столько же глаголов, сколько у договора —")
const buttons = [...stand.matchAll(/modeButton\("([a-z]+)"/g)].map((m) => m[1])
const asVerb = { ask: "recall", comment: "feedback", say: "remember" }
const standVerbs = buttons.map((b) => asVerb[b]).filter(Boolean)
check(standVerbs.length === names.length, `кнопок-глаголов ${standVerbs.length} при ${names.length} в договоре`, buttons.join(", "))
for (const n of names) check(standVerbs.includes(n), `глагол ${n} есть на стенде`)
// 🔒 «Сырой запрос» — не глагол: он не обязан совпадать с договором, но обязан существовать.
check(buttons.includes("raw"), "кнопка неразобранного запроса на месте")

console.log("— сборка вызова знает каждый глагол —")
for (const [mode, verb] of Object.entries(asVerb)) {
  const built = buildCall({ lang: "ru", mode, params: EMPTY_PARAMS, supported: [], text: "проверка" })
  check(built.method === verb, `режим «${mode}» собирает ${verb}`, built.method)
}

console.log("— поля комментария приходят из договора, а не из наших представлений —")
const fb = c.methods.find((m) => m.name === "feedback")
const need = (fb?.params ?? []).filter((p) => p.required).map((p) => p.name).sort()
check(need.join(",") === "about,text", "обязательны about и text", need.join(", "))
const withAbout = buildCall({
  lang: "ru",
  mode: "comment",
  params: { ...EMPTY_PARAMS, about: "ans_90" },
  supported: (fb?.params ?? []).map((p) => p.name),
  text: "коротко бы",
})
check(withAbout.body.about === "ans_90", "имя ответа уезжает в теле", String(withAbout.body.about))
// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ: то же поле у другого глагола ехать не должно.
const atAsk = buildCall({ lang: "ru", mode: "ask", params: { ...EMPTY_PARAMS, about: "ans_90" }, supported: ["text"], text: "?" })
check(atAsk.body.about === undefined, "у «Спросить» поля about нет")

console.log("— глубина: нельзя называть ступень, которой нет —")
check(DEPTH_CEILING.standard === BUILT_LEVELS, `предел standard равен построенному (${BUILT_LEVELS})`, String(DEPTH_CEILING.standard))
const claimed = [...verbs.matchAll(/depth_used:\s*(\d+)/g)].map((m) => Number(m[1]))
console.log(`  уровни, которые печатает код: ${claimed.join(", ") || "только вычисляемые"}`)
check(claimed.every((n) => n <= BUILT_LEVELS), `ни один не выше построенного (${BUILT_LEVELS})`, claimed.join(", "))
// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ СЧЁТЧИКА: он обязан хоть что-то находить, иначе зелен от слепоты.
check(claimed.length > 0, "счётчик уровней вообще что-то нашёл")

console.log("— стенд ловит имя ответа, а не имя снятой нити —")
check(stand.includes("answer_id"), "имя ответа вынимается из ответа")
check(!/\bbody as \{ thread\b/.test(stand), "имя снятой нити больше не ловится")

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)

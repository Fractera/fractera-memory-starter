#!/usr/bin/env node
//
// ПРИБОР 214: ЧЕЛОВЕК ПИШЕТ СЛОВАМИ, ПАМЯТЬ ОТНОСИТ ИХ К ГЛАГОЛУ САМА.
//
// ✗ ЧЕМ ОПЛАЧЕН ШАГ: стенд просил у человека JSON и отвечал `400 bad-json`. Слова владельца: «я же
// не машина, чтобы писать JSON, я пишу тебе обычные слова». «Неразобранный запрос» у него значило
// «я не говорю, какой это глагол», у меня — «тело без разбора парсером». Одно слово, два предмета.
//
// 🔒 ЧТО ЗДЕСЬ ВАЖНЕЕ ТОЧНОСТИ РАЗБОРА: чтобы выбор НАЗЫВАЛСЯ. Промах дёшев, если человек видит, как
// его поняли, и может поправить; молча выбранный глагол он заметит только по неверному ответу.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { contract } from "../../contract.mjs"
import { whichVerb, whichVerbWords } from "../../lib/which-verb.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const stand = readFileSync(join(ROOT, "app", "[lang]", "settings", "_components", "memory-test.client.tsx"), "utf8")
const server = readFileSync(join(ROOT, "server.mjs"), "utf8")

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

console.log("— обычные слова относятся к одному из трёх —")
for (const [text, verb] of [
  ["запомни что Петя заказал чехлы на 100 долларов", "remember"],
  ["Петя вчера забрал заказ", "remember"],
  ["сколько стоило такси", "recall"],
  ["что я говорил про Мадрид?", "recall"],
  ["напомни про аренду", "recall"],
  ["твой ответ мне не понравился", "feedback"],
  ["ответ ans_90 слишком длинный", "feedback"],
]) {
  const got = whichVerb(text)
  check(got.verb === verb, `«${text.slice(0, 38)}…» → ${verb}`, got.verb)
}

console.log("— имя ответа вынимается, чтобы комментарий знал, о чём он —")
check(whichVerb("ответ ans_90 слишком длинный").about === "ans_90", "имя ответа найдено в словах")

console.log("— выбор НАЗЫВАЕТСЯ словами человеку —")
const how = whichVerbWords(whichVerb("Петя забрал заказ"), "ru")
check(/Я понял это как/.test(how), "сказано, как поняли", how.slice(0, 40))
check(/скажите, и я переделаю/.test(how), "и что это можно поправить")

console.log("— умолчание выбрано по цене ошибки, а не по частоте —")
// 🔒 Принять рассказ за вопрос значит НЕ ЗАПОМНИТЬ сказанное — это потеря. Принять вопрос за
// рассказ — лишняя запись, которую видно и легко убрать. Поэтому умолчание — «запомнить».
check(whichVerb("просто какие-то слова без признаков").verb === "remember", "непонятное считается рассказом")

console.log("— это НЕ четвёртый глагол —")
const names = contract().methods.map((m) => m.name)
check(names.length === 3, `глаголов по-прежнему три`, names.join(", "))
const paths = contract().catalogue.map((x) => x.path)
check(paths.includes("POST /v1"), "адрес без имени глагола объявлен", paths.find((p) => p.startsWith("POST")) ?? "нет")
check(server.includes('path === "/v1" || path === "/v1/"'), "сервер отвечает по адресу без глагола")

console.log("— стенд больше не требует JSON от человека —")
check(!stand.includes('placeholder={\'{ "method"'), "поля для JSON нет")
check(!/setRaw\(/.test(stand), "отдельного сырого поля нет")
check(stand.includes("unsorted: true"), "режим шлёт слова как неразобранный запрос")


console.log("— на главной нет сносок-сирот и оборванных схем (214-3) —")
const landing = readFileSync(join(ROOT, "app", "[lang]", "_i18n", "landing.i18n.ts"), "utf8")
// 🛑 ✗ ОПЛАЧЕНО ЗДЕСЬ ЖЕ: метка *⁶ осталась в схеме, а её сноска жила в разделе, который переписали.
// Метка без сноски — обещание объяснения, которого нет; человек ищет его глазами и не находит.
const marks = [...new Set([...landing.matchAll(/\*([¹²³⁴⁵⁶⁷⁸⁹])/g)].map((m) => m[1]))]
const notes = [...new Set([...landing.matchAll(/"mark": "\*([¹²³⁴⁵⁶⁷⁸⁹])"/g)].map((m) => m[1]))]
const orphan = marks.filter((m) => !notes.includes(m))
check(orphan.length === 0, "у каждой метки есть своя сноска", orphan.join(", ") || marks.join(", "))
// 🔒 Негативный контроль: счётчик обязан вообще что-то находить, иначе он зелен от слепоты.
check(marks.length > 0, "счётчик меток вообще что-то нашёл", String(marks.length))

// 🔒 СХЕМА ЗАМКНУТА: ответ не конец пути. Обрываясь на ответе, она учила бы, что на нём всё и
// кончается, — а отзыв человека возвращает цикл к началу.
check(landing.includes("answerBox") && landing.includes("loopBox"), "схема доведена до отзыва и эволюции")

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)

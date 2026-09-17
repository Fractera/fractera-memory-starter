#!/usr/bin/env node
//
// ПРИБОР 207-5/207-6: наружу видны ГЛАГОЛЫ, а не хранилище.
//
// 🔒 ГЛАВНАЯ ПРОВЕРКА ЗДЕСЬ — ОТСУТСТВИЕ СТАРОГО, А НЕ ПРИСУТСТВИЕ НОВОГО (закон 190).
// «Стало три глагола» бывает верным, когда рядом живут ещё шесть; а вот «имени keep_object в
// договоре нет» опровергается одним вхождением.
// 🛑 НАДГРОБИЯ НЕ СЧИТАЮТСЯ ЖИВЫМ КОДОМ: счётчик смотрит на ПОРОЖДЁННЫЙ договор — тот, что уходит
// по HTTP, — а не на текст файла, где снятые имена законно упоминаются в объяснении.

import { contract } from "../../contract.mjs"

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

const c = contract()
const names = c.methods.map((m) => m.name)
const printed = JSON.stringify(c)

console.log(`договор ${c.version}, глаголов ${names.length}: ${names.join(", ")}`)

console.log("— снятые имена не должны встречаться в том, что уходит наружу —")
for (const gone of ["keep_object", "find_objects", "open_object"]) {
  check(!names.includes(gone), `глагола ${gone} нет`, names.includes(gone) ? "ЖИВ" : "нет")
}

console.log("— и то, что осталось —")
for (const alive of ["remember", "recall", "feedback"]) {
  check(names.includes(alive), `глагол ${alive} на месте`)
}

console.log("— вещи достаются адресом —")
const paths = c.catalogue.map((x) => x.path)
check(paths.some((p) => p === "GET /v1/objects/{id}"), "карточка вещи — адрес", paths.join(" · "))
check(paths.some((p) => p === "GET /v1/objects/{id}/file"), "файл вещи — адрес")

console.log("— негативный контроль счётчика —")
check(printed.includes("remember"), "счётчик вообще способен находить имена в договоре")
check(!printed.includes("this_verb_never_existed"), "заведомо ложное имя не находится")

console.log("— вещь кладётся «Сказать», значит текст необязателен —")
const remember = c.methods.find((m) => m.name === "remember")
const required = remember.params.filter((p) => p.required).map((p) => p.name)
check(required.length === 0, "у «Сказать» обязательных параметров нет", required.join(", ") || "нет")


// ── СТОРОЖ ОБЯЗАН ЛОВИТЬ ЧЕТВЁРТЫЙ ГЛАГОЛ ──────────────────────────────────────────────────────
//
// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ САМОГО СТОРОЖА (закон 143): сторож, чьего отказа никто не видел, зелен по
// причине собственной слепоты. Самый дешёвый способ вернуть прежнюю архитектуру — «заведу ещё один
// маленький глагол», и ловиться это должно кодом, а не памятью автора.
const { problemsOf } = await import("../check-contract.mjs")
const fourth = [...c.methods, { name: "keep_object", about: "…", onMiss: "…", params: [], returns: "…" }]
const caught = problemsOf(fourth, c.version)
console.log(
  caught.length > 0
    ? `✓ сторож ловит четвёртый глагол → ${caught[0]}`
    : "🛑 сторож НЕ заметил четвёртый глагол",
)
if (caught.length === 0) failed++
const healthy = problemsOf(c.methods, c.version)
if (healthy.length) failed++
console.log(healthy.length === 0 ? "✓ на здоровом договоре сторож молчит" : `🛑 сторож ругается на здоровый: ${healthy[0]}`)


console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)
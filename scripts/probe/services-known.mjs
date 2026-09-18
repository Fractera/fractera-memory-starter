#!/usr/bin/env node
//
// ПРИБОР 227-3: КОГО ПАМЯТЬ ЗНАЕТ — И, ГЛАВНОЕ, ЧЕГО ОНА ПРО ЭТО НЕ ВЫДУМЫВАЕТ.
//
// 🪦 ДО 227-3 ЭТОТ ПРИБОР ПРОВЕРЯЛ ЗНАНИЕ ВСЕХ ДЕСЯТИ СЛУЖБ ПО ОБЩЕМУ РЕЕСТРУ, лежавшему внутри
// памяти. Реестр оттуда удалён: служба описывает только себя, карту соседей собирает панель.
// 🔒 ЭТО ПЕРЕНАЦЕЛИВАНИЕ, А НЕ ПОДГОНКА ПОД РЕЗУЛЬТАТ, И ПРИЗНАК ОТЛИЧИЯ НАЗВАН: изменилось
// УТВЕРЖДЕНИЕ О СОСТОЯНИИ («знаю всех» → «знаю себя, про соседей не знаю»), а правило осталось тем
// же — имя сверяется точно, промах не выдаётся за попадание.
//
// 🔒 ПОЛОВИНА СЛУЧАЕВ НЕГАТИВНЫЕ, И ЭТО НЕ УКРАШЕНИЕ. Проверка, отвечающая «да» на всё, выглядит
// точно так же, как работающая.

import { isKnownService, NEIGHBOURS_KNOWN, OWN_ID, serviceIds } from "../../lib/services.mjs"
import { problemsOfOwn } from "../check-own-props.mjs"
import { problemsOfProps } from "../../core-vendor/service-props/service-props.decl.mjs"

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

console.log("— себя знаю всегда —")
check(OWN_ID === "memory", "описание себя прочитано с диска", String(OWN_ID))
check(isKnownService("memory"), "своё имя — знакомое")
check(serviceIds().length === 1, "знакомых имён ровно одно: соседи ещё не приходили", serviceIds().join(" "))

console.log("— промахи по имени отвергаются точно, без похожести —")
for (const bad of ["memoryy", "Memory", "memory ", "память", ""]) {
  check(!isKnownService(bad), `«${bad}» — не знакомое имя`)
}

console.log("— «не знаю» и «их нет» РАЗЛИЧАЮТСЯ —")
// 🛑 ГЛАВНЫЙ СЛУЧАЙ ЭТОГО ПРИБОРА. Пока карта не приходит, соседи неизвестны. Плоский ответ
// «таких служб нет» был бы уверенным неверным утверждением — тем самым, что дороже пустого.
check(NEIGHBOURS_KNOWN === false, "флаг говорит: про соседей мы НЕ знаем", String(NEIGHBOURS_KNOWN))
check(!isKnownService("data"), "чужое имя незнакомо — но это «не знаю», а не «нет такой службы»")

console.log("— сторож описания себя умеет отказывать —")
const good = {
  about: "A service of this probe, long enough to pass the check.",
  api: "https://x.<domain>",
  auth: "own",
  author: "fractera",
  channels: {},
  for_sale: false,
  id: "probe",
  manage: null,
  port: 3700,
  price: null,
  subdomain: "probe",
  topics: [],
}
check(problemsOfProps(good).length === 0, "правильное описание проблем не вызывает", JSON.stringify(problemsOfProps(good)))
for (const [what, spoil, expect] of [
  ["нет порта", (o) => delete o.port, /нет поля port/],
  ["имя с заглавной", (o) => (o.id = "Probe"), /id не годится/],
  ["чужой род входа", (o) => (o.auth = "half"), /auth —/],
  ["канал без ссылки", (o) => (o.channels = { telegram: { bot: "@x" } }), /без прямой ссылки/],
]) {
  const o = structuredClone(good)
  spoil(o)
  check(problemsOfProps(o).some((p) => expect.test(p)), `отвергнуто: ${what}`, problemsOfProps(o)[0] ?? "НИЧЕГО НЕ СКАЗАЛ")
}
check(problemsOfOwn(null, "файл не читается").length > 0, "нечитаемое описание себя — названо проблемой")

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)

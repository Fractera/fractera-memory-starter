#!/usr/bin/env node
import { readFileSync } from "node:fs"
//
// ПРИБОР 210-2: служба знает, где она стоит и каким потоком её зовут.
//
// 🔒 ГЛАВНОЕ ЗДЕСЬ — НЕ «ОТВЕЧАЕТ ЛИ», А «ГОВОРИТ ЛИ ПРАВДУ ПРИ РАСХОЖДЕНИИ». Реестр говорит, как
// задумано; запрос — как есть. Служба, молча подправившая одно под другое, даёт уверенный неверный
// ответ, а это дороже пустого (закон 144).

import { state, streamOf } from "../../lib/state.mjs"

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

console.log("— поток измеряется по тому, КАК пришёл запрос —")
check(streamOf({ host: "memory.aifa.dev", proto: "https" }).secured === true, "домен и https — защищённый")
check(streamOf({ host: "memory.aifa.dev", proto: "http" }).secured === false, "домен без https — незащищённый")
// 🛑 Голый адрес незащищён ДАЖЕ по https: сертификат на IP — редкое исключение, и обещать по одному
// лишь протоколу значит обещать то, что человек проверит в свой худший день.
check(streamOf({ host: "213.199.61.7", proto: "https" }).secured === false, "голый адрес — незащищённый даже по https")
check(streamOf({ host: "127.0.0.1:3700", proto: "http" }).secured === false, "петля — незащищённый")
check(streamOf({ host: "", proto: "https" }).secured === false, "хост не назван — не притворяемся защищёнными")

console.log("— состояние отвечает на вопрос «кто я и где я» —")
const live = state({ host: "memory.aifa.dev", proto: "https" })
check(live.service === "memory", "имя службы", live.service)
check(live.planned.port === 3700, "порт из реестра", String(live.planned.port))
check(live.planned.subdomain === "memory", "субдомен из реестра", String(live.planned.subdomain))
check(live.auth === "global", "род входа", String(live.auth))
check(live.seen.domain === "aifa.dev", "домен выведен из имени хоста", String(live.seen.domain))
check(live.seen.secured === true, "поток назван защищённым")
check(live.mismatch.length === 0, "расхождений нет", live.mismatch.join("; "))

console.log("— расхождение НАЗЫВАЕТСЯ, а не сглаживается —")
const wrong = state({ host: "chat.aifa.dev", proto: "https" })
check(wrong.mismatch.length === 1, "чужой субдомен замечен", wrong.mismatch.join("; "))
check(/РАСХОЖДЕНИЕ/.test(wrong.what_happened), "и сказан словами, которые можно произнести человеку")

console.log("— негативный контроль: по голому адресу расхождения НЕТ —")
// 🔒 Иначе всякий внутренний вызов по петле выглядел бы поломкой: субдомена там нет по устройству,
// а не по ошибке. Прибор, кричащий на законное, приучает не читать его вывод.
const byIp = state({ host: "213.199.61.7:3700", proto: "http" })
check(byIp.mismatch.length === 0, "адрес машины — законное состояние, а не расхождение", byIp.mismatch.join("; "))
check(byIp.seen.secured === false, "и поток при этом назван незащищённым")


console.log("— вопрос о себе УЗНАЁТСЯ, и это подключено к глаголу (211-2) —")
// 🛑 ✗ Я построил ответ о себе и НЕ подключил его к «Спросить» — поймал себя на том самом дефекте,
// который мы ловим весь день. Поэтому здесь проверяется не наличие функции, а «кто её зовёт».
const { asksAboutSelf, aboutSelf } = await import("../../lib/about-self.mjs")
const verbsSrc = readFileSync(new URL("../../lib/verbs.mjs", import.meta.url), "utf8")
for (const q of ["Где ты сейчас", "кто ты", "на каком порту ты работаешь", "where are you", "защищённое ли соединение"]) {
  check(asksAboutSelf(q), `«${q}» — вопрос о самой памяти`)
}
// 🔒 Негативный контроль: обычные вопросы НЕ должны уходить в этот путь, иначе память перестанет
// искать в том, что ей рассказывали.
for (const q of ["сколько стоило такси", "что я говорил про Мадрид", "где я был в среду"]) {
  check(!asksAboutSelf(q), `«${q}» — обычный вопрос, идёт лестницей`)
}
check(verbsSrc.includes("asksAboutSelf(text)"), "«Спросить» ЗОВЁТ распознавание — способность подключена")
check(aboutSelf({ lang: "ru", seen: { host: "memory.aifa.dev", proto: "https" } }).depth_used === 1, "ответ о себе — первая ступень, мгновенно")
check(aboutSelf({ lang: "ru", seen: { host: "memory.aifa.dev", proto: "https" } }).used_model === false, "и без хода модели")


console.log("— корень домена: право одной службы (211-5) —")
const { ROOT_SERVICE, isRoot } = await import("../../lib/services.mjs")
check(typeof ROOT_SERVICE === "string" && ROOT_SERVICE.length > 0, "корневая служба названа", String(ROOT_SERVICE))
check(live.root.holder === ROOT_SERVICE, "состояние называет держателя корня", String(live.root.holder))
check(live.root.mine === false, "память корнем не владеет — и знает об этом", String(live.root.mine))
check(isRoot(ROOT_SERVICE) === true, "держатель корня узнаётся")
// 🔒 Негативный контроль: никакая другая служба корнем себя назвать не может.
check(isRoot("memory") === false && isRoot("") === false, "чужое имя и пустое корнем не становятся")

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)

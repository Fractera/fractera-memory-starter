#!/usr/bin/env node
//
// ПРИБОР 208-1: главная инструкция памяти — по структуре владельца, на английском, с навыками.
//
// 🔒 ПРОВЕРЯЕТСЯ СТРУКТУРА, А НЕ КРАСОТА. Владелец потребовал сохранить структуру своей записки «на
// 100%»: пять разделов в его порядке. Пропущенный раздел не всплывает ошибкой — он всплывает тем,
// что следующий агент не знает, чего от него ждут.
// 🔒 И ЧИСЛО НАВЫКОВ НЕ ПИШЕТСЯ РУКАМИ: оно считается по папке. Рукописное число не двигается само —
// в проекте это оплачено пять раз за три дня.

import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const md = readFileSync(join(ROOT, "CLAUDE.md"), "utf8")
const skills = readdirSync(join(ROOT, ".claude", "skills"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

console.log("— пять разделов записки владельца, в его порядке —")
// 🔒 210-3: НУЛЕВОЙ РАЗДЕЛ ИДЁТ ПЕРВЫМ — требование владельца: инструкция обязана во вводной части
// сказать, в каком состоянии проект и КАК агент это состояние получает.
const SECTIONS = ["## 0. Where you are right now", "## 1. Purpose", "## 2. How it works", "## 3. Tools", "## 4. Philosophy", "## 5. Evolution", "## 6. Memory as one block of an AGI architecture"]
let at = -1
for (const s of SECTIONS) {
  const i = md.indexOf(s)
  check(i > at, `${s} на месте и после предыдущего`, i < 0 ? "НЕТ" : String(i))
  if (i > at) at = i
}

console.log("— каждый навык папки назван в инструкции —")
for (const name of skills) {
  check(md.includes(name), `навык ${name} назван`)
}
check(skills.length === 9, `навыков в папке ${skills.length}`, skills.join(", "))

console.log("— машинный слой одноязычен —")
const cyr = (md.match(/[А-Яа-яЁё]/g) ?? []).length
check(cyr === 0, "кириллицы в инструкции нет", String(cyr))

console.log("— обещания сверены с договором —")
const { contract } = await import("../../contract.mjs")
const c = contract()
for (const m of c.methods) check(md.includes(`/v1/${m.name}`), `глагол ${m.name} назван адресом`)
// 🔒 ТОНКОСТЬ, НАЙДЕННАЯ ПРИБОРОМ: три этих имени ЖИВЫ как внутренние руки агента и МЕРТВЫ как
// адреса договора. Проверять надо не упоминание, а обещание адреса — иначе прибор запрещает
// инструкции называть то, чем агент работает каждый день.
// 🛑 `journal` В ЭТОТ СПИСОК НЕ ВХОДИТ: он снят как ГЛАГОЛ и жив как АДРЕС — прибор, не знающий
// разницы, требует убрать из инструкции работающую способность.
for (const gone of ["keep_object", "find_objects", "open_object", "people"]) {
  check(!md.includes(`/v1/${gone}`), `снятый глагол ${gone} не обещан адресом договора`)
}
check(!/people/.test(md.replace(/people and things/g, "")), "о людях как о предмете счёта речи нет")

console.log("— негативный контроль счётчика —")
check(md.includes("remember"), "счётчик способен находить живое имя")
check(!md.includes("verb_that_never_existed"), "заведомо ложное имя не находится")

console.log("— граница сплит-тестирования названа —")
check(/optional/i.test(md) && /subagents/i.test(md), "опция продукта отделена от запрета в разработке")


console.log("— инструкция годится для РАБОТЫ, а не только для понимания (208-7) —")
// 🔒 ✗ Оплачено оценкой: документ был связен и при этом не давал сесть и работать. Внешний
// рецензент поставил ему 92 за стройность и не мог увидеть, что часть описанного НЕ ПОСТРОЕНА —
// он читал документ, а не службу. Эти пять проверок держат то, чего оценка со стороны не ловит.
check(/x-memory-key/.test(md), "названо, чем предъявиться")
check(/curl /.test(md), "есть живой пример вызова")
check(md.includes("GET /v1/contract"), "первым шагом назван договор — источник формы запроса")
check(/tool-unavailable/.test(md) && /unknown-service/.test(md), "каталог отказов на месте")
check(/not built/.test(md), "недостроенное названо, а не обещано как работающее")
check(/200 MB/.test(md), "предел файла назван")
check(md.includes("GET /v1/state"), "сказано, как узнать своё состояние")
check(/LightRAG/.test(md), "инструменты названы по имени, а не абстрактно")
check(/bare address is unsecured/.test(md), "голый адрес назван незащищённым")
// 🔒 211-8: память — сменный блок, и просьба не по адресу переадресуется с адресом.
check(/building block, not the building/.test(md), "память названа сменным блоком архитектуры")
check(md.includes("manage") && md.includes("topics"), "сказано, откуда берутся адрес управления и слова темы")
check(/silence and obedience/.test(md), "названы оба неверных ответа на чужую просьбу")

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)

#!/usr/bin/env node
//
// ПРИБОР 207-1: знает ли память имя службы — и, главное, НЕ знает ли она то,
// чего знать не должна.
//
// 🔒 ПОЛОВИНА СЛУЧАЕВ НЕГАТИВНЫЕ, И ЭТО НЕ УКРАШЕНИЕ. Проверка, отвечающая
// «да» на всё, выглядит точно так же, как работающая: зелёный цвет здесь
// доказывает ровно ничего, пока рядом не показано, что она умеет говорить «нет».
// Опечатка (`dataa`), чужой регистр (`Data`), пустое имя и кириллица обязаны
// давать `false` — именно ими одна служба разводится на две.
//
// Второй блок — негативный контроль САМОГО СТОРОЖА: испорченный реестр обязан
// быть пойман, иначе сторож зелен по причине собственной слепоты.

import { isKnownService, serviceIds } from "../../lib/services.mjs"
import { problemsOf } from "../check-services.mjs"

const CASES = [
  // знакомые — из самого реестра
  ["data", true],
  ["memory", true],
  ["telegram", true],
  ["ai-browser", true],
  ["panel", true],
  ["rag", true],
  // незнакомые — близкие промахи, а не заведомо чужие слова
  ["dataa", false],
  ["Data", false],
  ["chat", false],
  ["memory ", false],
  ["дата", false],
  ["", false],
]

const BROKEN = [
  ["пустой реестр", [], null],
  ["имя дважды", [rec("data"), rec("data")], null],
  ["имя с пробелом", [rec("ai browser")], null],
  ["кириллица в описании", [{ ...rec("geo"), about: "Служба географии сервера" }], null],
  ["файл не читается", [], "Unexpected token"],
  // 211-5: корень назван в никуда или не назван вовсе
  ["корень указывает на несуществующую службу", [{ ...rec("auth"), auth: "provider" }], null, "chat"],
  ["корень не назван", [{ ...rec("auth"), auth: "provider" }], null, ""],
  // 210-1: три новых рода порчи — их ловит тот же сторож
  ["две раздающие авторизацию", [{ ...rec("auth"), auth: "provider" }, { ...rec("data"), auth: "provider" }], null],
  ["ни одной раздающей авторизацию", [rec("data")], null],
  ["порт строкой", [{ ...rec("auth"), auth: "provider", port: "3700" }], null],
  ["выдуманный род входа", [{ ...rec("auth"), auth: "provider" }, { ...rec("data"), auth: "magic" }], null],
]

function rec(id) {
  // 🔒 Образец записи правится ВМЕСТЕ с обязательными полями сторожа: иначе прибор проверяет форму,
  // которой в реестре уже нет, и падает не на дефекте, а на собственной устарелости.
  return { about: "A service of this server used by probes.", api: "internal", auth: "own", author: "fractera", for_sale: false, id, port: 1234, price: null, subdomain: null }
}

let failed = 0

console.log(`реестр знает ${serviceIds().length} служб: ${serviceIds().join(", ")}`)
console.log("— знакомство с именем —")
for (const [name, want] of CASES) {
  const got = isKnownService(name)
  const ok = got === want
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${JSON.stringify(name)} → ${got} (ожидалось ${want})`)
}

console.log("— сторож обязан ловить испорченный реестр —")
for (const [why, services, error, root] of BROKEN) {
  const problems = problemsOf(services, error, root)
  const ok = problems.length > 0
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${why} → ${problems.length ? problems[0] : "НИЧЕГО НЕ ЗАМЕЧЕНО"}`)
}

console.log("— и НЕ обязан ругаться на здоровый —")
// 🔒 ЗДОРОВЫЙ РЕЕСТР ОБЯЗАН СОДЕРЖАТЬ РОВНО ОДНУ РАЗДАЮЩУЮ АВТОРИЗАЦИЮ (210-1): без неё на сервере
// нет входа вовсе, и такой реестр здоровым не является.
const healthy = problemsOf([rec("data"), { ...rec("auth"), auth: "provider" }], null, "data")
if (healthy.length) {
  failed++
  console.log(`🛑 здоровый реестр объявлен негодным: ${healthy[0]}`)
} else {
  console.log("✓ здоровый реестр принят молча")
}

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)

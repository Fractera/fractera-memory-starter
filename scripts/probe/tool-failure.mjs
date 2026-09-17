#!/usr/bin/env node
//
// ПРИБОР 207-7: отказ обязательного инструмента называет свой род — и только род.
//
// 🔒 ДВЕ ПОЛОВИНЫ, И ВТОРАЯ ВАЖНЕЕ. Первая: известный код отказа опознаётся как род зависимости.
// Вторая: наружу НЕ уходит ничего, кроме рода, — ни порта, ни имени таблицы, ни схемы. Чёрный ящик
// ломается не громко, а незаметно: одной подробностью, которую «удобно было показать».

import { toolFailure, toolOfError, TOOLS } from "../../lib/tools.mjs"
import { feedback } from "../../lib/feedback.mjs"

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

console.log("— код отказа опознаётся как род зависимости —")
for (const [code, tool] of [
  ["data-unreachable", TOOLS.RELATIONAL],
  ["sql-rejected", TOOLS.RELATIONAL],
  ["data-http-502", TOOLS.RELATIONAL],
  ["ensure: alter-refused", TOOLS.RELATIONAL],
  ["store-unreachable", TOOLS.OBJECTS],
  ["describe-kind-unsupported", TOOLS.OBJECTS],
  ["vector-store-down", TOOLS.VECTOR],
  ["rag-timeout", TOOLS.GRAPH],
]) {
  check(toolOfError(code) === tool, `${code} → ${tool}`, String(toolOfError(code)))
}

console.log("— неизвестный код НЕ получает выдуманного рода —")
// 🔒 Выдуманный род хуже отсутствующего: он пошлёт чинить не то, и отладка уйдёт в сторону.
for (const code of ["", null, "кто-то-сломался", "unknown-answer"]) {
  check(toolOfError(code) === null, `${JSON.stringify(code)} — рода нет`, String(toolOfError(code)))
}

console.log("— форма отказа —")
const f = toolFailure({ error: "store-unreachable", lang: "ru", stage: "сохранение вещи" })
check(f.ok === false && f.error === "tool-unavailable", "код отказа общий для всех инструментов", f.error)
check(f.tool === TOOLS.OBJECTS, "род назван", f.tool)
check(typeof f.stage === "string" && f.stage.length > 0, "ступень названа", f.stage)
check(typeof f.text === "string" && Array.isArray(f.objects), "форма ответа та же, что у успеха")

console.log("— наружу не уходит устройство —")
const printed = JSON.stringify(toolFailure({ error: "data-http-500", lang: "ru", stage: "чтение сообщений", why: "connect ECONNREFUSED 127.0.0.1:3300" }))
// 🛑 Причина приходит от чужой службы и может нести адрес; в ответ она едет полем `why` — это
// отладочный хвост, а не описание устройства. Проверяем, что имён наших таблиц и портов НЕ печатаем
// мы сами: ни в словах человеку, ни в роде.
const human = toolFailure({ error: "data-http-500", lang: "ru", stage: "чтение сообщений" })
check(!/3300|3700|messages_that_came_into_memory|CREATE TABLE/.test(JSON.stringify(human)), "в отказе нет портов, имён таблиц и схемы")
check(printed.includes("why"), "отладочный хвост чужой службы сохраняется отдельным полем")

console.log("— негативный контроль: исправный путь отказа не печатает —")
const fine = await feedback({ about: "ans_0", text: "проверка" })
check(fine.error !== "tool-unavailable", "разбор имени ответа не притворяется отказом инструмента", String(fine.error))

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)

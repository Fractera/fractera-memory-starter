#!/usr/bin/env node
//
// ПРИБОР 207-3: у ответа есть имя и твёрдость, а у вызова больше нет обязательного человека.
//
// 🔒 ЧТО ЗДЕСЬ ПРОВЕРИТЬ НЕЛЬЗЯ, НАЗВАНО ВСЛУХ: живую запись строки вопроса и живой `answer_id`
// доказывает 207-9 на сервере — слоя данных на машине разработчика нет, и изображать его запрещено.
// Здесь проверяется то, что от базы не зависит: правило твёрдости и то, что договор обещает.

import { certaintyOf } from "../../lib/certainty.mjs"
import { contract } from "../../contract.mjs"
import { RecallOutput } from "../../lib/output-schema.mjs"

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

console.log("— твёрдость ответа считается по данным —")
const oneCity = [{ at_scope: null, where: "Севилья" }, { at_scope: null, where: "Севилья" }]
const twoCities = [{ where: "Мадрид" }, { where: "Лондон" }]
const twoTimes = [{ at_scope: "2026-01-01" }, { at_scope: "2026-09-01" }]

check(certaintyOf({ known: oneCity }).certainty === "affirmative", "одно место, без модели — утвердительный", certaintyOf({ known: oneCity }).certainty)
check(certaintyOf({ known: oneCity, used_model: true }).certainty === "presumed", "модель отвечала — предположительный", certaintyOf({ known: oneCity, used_model: true }).certainty)

const dep = certaintyOf({ known: twoCities })
check(dep.certainty === "depends" && dep.depends_on.includes("place"), "два города — зависит от места, и место названо", `${dep.certainty} ${JSON.stringify(dep.depends_on)}`)

const dept = certaintyOf({ known: twoTimes })
check(dept.certainty === "depends" && dept.depends_on.includes("time"), "два срока — зависит от времени", `${dept.certainty} ${JSON.stringify(dept.depends_on)}`)

// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ: пустое знание НЕ получает уверенного «нет». Уверенное умолчание дороже
// отсутствующего значения — оно останавливает поиск, а пустое поле заставляет спросить ещё раз.
check(Object.keys(certaintyOf({ known: [] })).length === 0, "нечего сказать — атрибута нет вовсе", JSON.stringify(certaintyOf({ known: [] })))
check(certaintyOf({ certainty: "affirmative", known: twoCities }).certainty === "affirmative", "названное вызывающим не переписывается")

console.log("— договор больше не требует человека —")
const methods = Object.fromEntries(contract().methods.map((m) => [m.name, m]))
for (const name of ["remember", "recall"]) {
  const required = (methods[name]?.params ?? []).filter((p) => p.required).map((p) => p.name)
  check(!required.includes("who"), `${name}: who не обязателен`, required.join(", ") || "обязательных нет")
}
check((methods.remember?.params ?? []).some((p) => p.name === "from"), "remember объявляет from — путь источника")
check(contract().version === "5.0.0", "версия договора", contract().version)

console.log("— схема ответа знает об имени и твёрдости —")
const shape = RecallOutput.parse({
  answer_id: "ans_42",
  certainty: "depends",
  depends_on: ["place"],
  objects: [],
  ok: true,
  text: "…",
  what_happened: "…",
})
check(shape.answer_id === "ans_42" && shape.certainty === "depends", "ответ с именем и твёрдостью проходит схему")
let refusedByShape = false
try {
  RecallOutput.parse({ certainty: "maybe", objects: [], ok: true, text: "…", what_happened: "…" })
} catch {
  refusedByShape = true
}
check(refusedByShape, "выдуманное значение твёрдости схема отвергает")

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)

#!/usr/bin/env node
//
// ПРИБОР 207-4: третий глагол — что он отвергает и что обещает.
//
// 🔒 ЖИВАЯ ЗАПИСЬ ДОКАЗЫВАЕТСЯ НА СЕРВЕРЕ (207-9): слоя данных на машине разработчика нет.
// Здесь — то, что от базы не зависит: разбор имени ответа, отказы до единой записи, объявление
// глагола в договоре и его место в исполнителях сервера.
// 🛑 ПОСЛЕДНЕЕ ВАЖНЕЕ, ЧЕМ КАЖЕТСЯ: способность, написанная и не подключённая, снаружи неотличима
// от отсутствующей. Поэтому проверяется не «есть ли функция», а «кто её зовёт».

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { contract } from "../../contract.mjs"
import { feedback, messageIdOf } from "../../lib/feedback.mjs"
import { DIRECTION } from "../../lib/messages.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const serverSrc = readFileSync(join(ROOT, "server.mjs"), "utf8")

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

console.log("— имя ответа разбирается, а не угадывается —")
check(messageIdOf("ans_42") === 42, "ans_42 — это строка 42", String(messageIdOf("ans_42")))
for (const bad of ["42", "ans_", "ans_x", "", null, "ANS_42"]) {
  check(messageIdOf(bad) === null, `${JSON.stringify(bad)} — не имя ответа`, String(messageIdOf(bad)))
}

// 🔒 КРАЯ ОБРЕЗАЮТСЯ НАМЕРЕННО: имя ответа человек и агент копируют, и хвостовой пробел не должен
// ронять вызов. Отвергается то, что именем не является, а не то, что записано неаккуратно.
check(messageIdOf("ans_42 ") === 42, "хвостовой пробел обрезается, а не отвергается", String(messageIdOf("ans_42 ")))

console.log("— отказы приходят ДО единой записи —")
const noArgs = await feedback({})
check(!noArgs.ok && noArgs.error === "need-about-and-text", "без имени ответа и текста — отказ", noArgs.error)

const badId = await feedback({ about: "42", text: "ответ мимо" })
check(!badId.ok && badId.error === "bad-answer-id", "имя не той формы — отказ", badId.error)

// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ ФОРМЫ ОТВЕТА: у отказа те же обязательные поля, что у успеха, —
// зовущий разбирает один и тот же объект, а не два разных.
check(typeof badId.text === "string" && Array.isArray(badId.objects), "у отказа есть text и objects")

console.log("— глагол объявлен и подключён —")
const names = contract().methods.map((m) => m.name)
check(names.includes("feedback"), "feedback есть в договоре", names.join(", "))
const declared = contract().methods.find((m) => m.name === "feedback")
check(declared.params.filter((p) => p.required).map((p) => p.name).join(",") === "about,text", "обязательны about и text")
check(/const RUN = \{[^}]*\bfeedback\b/.test(serverSrc), "сервер зовёт feedback — способность подключена, а не просто написана")

console.log("— комментарий отличим от знания —")
check(DIRECTION.FEEDBACK === "feedback", "у направления есть своё имя", DIRECTION.FEEDBACK)
check(
  /direction IS NULL OR direction <> '\$\{DIRECTION.RECALL\}'|direction IS NULL OR direction = /.test(
    readFileSync(join(ROOT, "lib", "verbs.mjs"), "utf8"),
  ),
  "чтение знания отбирает строки по направлению, а не берёт всё подряд",
)

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)

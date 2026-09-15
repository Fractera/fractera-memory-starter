#!/usr/bin/env node
// ПРИБОР 206-10: ФОРМА ОТВЕТА ЧЕЛОВЕКУ.
//
// 🔒 ЧТО ДОКАЗЫВАЕТСЯ: три случая — сказал · прислал вещь · спросил — отвечают своим лидом, и КАЖДЫЙ
// ответ заканчивается приглашением поправить. Требование владельца 2026-09-16.
//
// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ: ответ, в котором НЕ НАШЛОСЬ НИЧЕГО, обязан кончаться тем же приглашением —
// именно там его проще всего потерять, и именно там оно нужнее всего. И второй: выдуманного лида
// («Вы прислали телепатему») в ответе быть не должно — иначе счётчик зелен от собственной слепоты.
//
// 🛑 СЕТИ И МОДЕЛИ НЕ ТРЕБУЕТ: это чистые функции. Запускается где угодно, стоит ноль.
// Запуск: node scripts/probe/answer-shape-206-10.mjs

import { recallText, rememberText } from "../../lib/answer-text.mjs"
import { say } from "../../lib/words.mjs"

let failed = 0
const check = (ok, what, extra = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${what}${extra ? `  — ${extra}` : ""}`)
}

console.log("===PROBE_206_10===")

for (const lang of ["ru", "en"]) {
  const tail = say("answer-feedback", lang)

  const said = rememberText({
    kept: lang === "ru" ? "сказанное целиком — в связях." : "everything said — in the knowledge graph.",
    lang,
    noted: [{ became: "Аркадий", what: "people_he_calls_his_friends" }],
    objects: [],
    what_happened: "x",
  })
  check(said.includes(say("answer-understood", lang)), `${lang}: у сказанного есть лид «если я правильно понял»`)
  check(said.includes(say("answer-kept", lang)), `${lang}: сказано, что именно сохранено`)
  check(said.trim().endsWith(tail), `${lang}: ответ о сказанном кончается приглашением поправить`)

  const thing = rememberText({
    kept: "",
    lang,
    noted: [],
    objects: [{ id: "abc", kind: "image", messageId: 7, ok: true, summary: "Набережная на закате." }],
    what_happened: "x",
  })
  check(thing.includes(say("answer-object-kept", lang)), `${lang}: у вещи сказано, что она в истории памяти`)
  check(thing.includes("Набережная на закате."), `${lang}: саммари вещи попало в ответ`)
  check(thing.trim().endsWith(tail), `${lang}: ответ о вещи кончается приглашением поправить`)

  const asked = recallText({ known: [{ value: "евро", what: "currency" }], lang, objects: [] })
  check(asked.includes(say("answer-found", lang)), `${lang}: у найденного есть свой лид`)
  check(asked.trim().endsWith(tail), `${lang}: ответ на вопрос кончается приглашением поправить`)

  // ── НЕГАТИВ ПЕРВЫЙ: пустой ответ тоже кончается приглашением ──────────────
  const empty = recallText({ known: [], lang, objects: [], what_happened: "этого я не знаю" })
  check(empty.trim().endsWith(tail), `${lang}: НЕГАТИВ — пустой ответ тоже кончается приглашением`, empty.split("\n")[0])

  // ── НЕГАТИВ ВТОРОЙ: счётчик не слеп ───────────────────────────────────────
  check(!said.includes("телепатему"), `${lang}: НЕГАТИВ — выдуманного лида в ответе нет`)
}

console.log("")
if (failed === 0) {
  console.log("✓ ВСЁ СОШЛОСЬ: три случая, свой лид у каждого, приглашение поправить в конце всегда")
  process.exit(0)
}
console.log(`🛑 ПРОВАЛОВ: ${failed}`)
process.exit(1)

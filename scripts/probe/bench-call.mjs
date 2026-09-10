#!/usr/bin/env node
//
// ПРИБОР 183-1 — СТЕНД ПОСЫЛАЕТ РОВНО ТО, ЧТО ДОГОВОР ПРИНИМАЕТ, И НАЗЫВАЕТ
// ОСТАЛЬНОЕ ВСЛУХ.
//
// 🔒 ЗАЧЕМ ОН НУЖЕН, ЕСЛИ ОРГАНЫ ВИДНЫ ГЛАЗАМИ. Глаза отвечают на вопрос «что
// нарисовано», и молчат о том, что уедет по проводу. Здесь проверяется второе:
// выставленный параметр либо в теле запроса, либо в списке «не доезжает».
// Третьего исхода — исчезнуть молча — у значения быть не должно.
//
// 🛑 ПРИБОР НИЧЕГО НЕ ПИШЕТ И НИЧЕГО НЕ УДАЛЯЕТ: он зовёт чистую функцию.
// Спрашивать у прибора надо не «что он проверяет», а «что он удаляет и чьё
// это» — здесь ответ «ничего», и это тоже измерение.

import { buildCall, EMPTY_PARAMS } from "../../lib/bench-call.mjs"
import { METHODS } from "../../contract.mjs"

let bad = 0
const say = (ok, what, extra = "") => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}${extra ? "  — " + extra : ""}`)
}

/** Что договор принимает у метода — порождено, а не переписано сюда руками. */
const paramsOf = (name) => (METHODS.find((m) => m.name === name)?.params ?? []).map((p) => p.name)

// Все органы выставлены разом: так стенд выглядит в худшем случае.
const FULL = {
  ...EMPTY_PARAMS,
  at: "2026-09-11",
  deny: "это неверно, потому что я говорил другое",
  depth: "extreme",
  history: "до этого мы говорили о Денисе",
  historyOn: true,
  needTable: true,
  place: "Мадрид",
  prior: "нашли только имя",
  priorOn: true,
  wantChain: true,
  who: "bench-1",
}

console.log("=".repeat(72))
console.log("ПРИБОР 183-1 — что уедет со стенда")
console.log("=".repeat(72))
console.log("")

// ── 1. ВОПРОС ────────────────────────────────────────────────────────────────
const ask = buildCall({
  lang: "ru",
  mode: "ask",
  params: FULL,
  supported: paramsOf("recall"),
  text: "что ты знаешь обо мне",
})
say(ask.method === "recall", "режим «спросить» зовёт recall", ask.method)
say(ask.body.who === "bench-1" && ask.body.text === "что ты знаешь обо мне", "имя и вопрос в теле")
say(ask.body.lang === "ru", "язык называет зовущий, а не угадывает служба")

// ── 2. ГЛАВНОЕ: ЛИБО В ТЕЛЕ, ЛИБО В «НЕ ДОЕЗЖАЕТ» ────────────────────────────
const declaredRecall = paramsOf("recall")
const wantedByAsk = ["depth", "history", "prior", "want_chain", "at", "place"]
for (const name of wantedByAsk) {
  const inBody = name in ask.body
  const inDropped = ask.dropped.includes(name)
  say(
    inBody !== inDropped,
    `«${name}»: ровно один исход — ${inBody ? "уехал" : "назван непринятым"}`,
    declaredRecall.includes(name) ? "договор его принимает" : "договор его не объявляет",
  )
  say(
    inBody === declaredRecall.includes(name),
    `«${name}» уезжает ТОЛЬКО если объявлен договором`,
  )
}

// ── 3. ЗАПИСЬ ────────────────────────────────────────────────────────────────
const say_ = buildCall({
  lang: "ru",
  mode: "say",
  params: FULL,
  supported: paramsOf("remember"),
  text: "меня зовут Роман",
})
say(say_.method === "remember", "режим «сказать» зовёт remember", say_.method)
say(!("depth" in say_.body), "глубины у записи нет: запись не ищет", JSON.stringify(Object.keys(say_.body)))
for (const name of ["deny", "need_table"]) {
  say(
    (name in say_.body) === paramsOf("remember").includes(name),
    `«${name}» у записи следует договору`,
  )
}

// ── 4. НЕГАТИВНЫЙ КОНТРОЛЬ: ПУСТОЙ ДОГОВОР ───────────────────────────────────
// 🔒 ЭТО И ЕСТЬ ПРОВЕРКА САМОГО ПРИБОРА: скажи мы, что договор не принимает
// ничего, — ни один орган не имеет права оказаться в теле. Прибор, не умеющий
// ответить «ничего не уехало», зелен по причине собственной слепоты.
const none = buildCall({ lang: "ru", mode: "ask", params: FULL, supported: [], text: "вопрос" })
const leaked = wantedByAsk.filter((n) => n in none.body)
say(leaked.length === 0, "НЕГАТИВНЫЙ: пустой договор — ни один орган не уехал", leaked.join(", ") || "утечек нет")
say(
  none.dropped.length === wantedByAsk.length,
  "НЕГАТИВНЫЙ: всё выставленное названо непринятым",
  `${none.dropped.length} из ${wantedByAsk.length}`,
)

// ── 5. НЕГАТИВНЫЙ КОНТРОЛЬ: НИЧЕГО НЕ ВЫСТАВЛЕНО ─────────────────────────────
const empty = buildCall({
  lang: "ru",
  mode: "ask",
  params: EMPTY_PARAMS,
  supported: declaredRecall,
  text: "",
})
// 🔒 «ПУСТО» ЗДЕСЬ НЕ ЗНАЧИТ «НИ ОДНОГО ПАРАМЕТРА»: глубина выставлена ВСЕГДА,
// у неё нет незаполненного состояния — стандарт и есть её умолчание. Поэтому
// проверяем ровно то, что должно быть верно: пустое поле вопроса не рождает
// `text`, а прочие семь органов молчат.
const emptyNames = [...Object.keys(empty.body), ...empty.dropped].filter(
  (n) => n !== "lang" && n !== "who" && n !== "depth",
)
say(
  emptyNames.length === 0 && !("text" in empty.body),
  "НЕГАТИВНЫЙ: пустые органы ничего не досочиняют",
  emptyNames.join(", ") || JSON.stringify(empty.body),
)

console.log("")
console.log("-".repeat(72))
if (bad === 0) {
  console.log("✓ ВСЁ ЗЕЛЁНОЕ: стенд посылает объявленное и называет непринятое")
  process.exit(0)
}
console.log(`🛑 ПРОВАЛОВ: ${bad}`)
process.exit(1)

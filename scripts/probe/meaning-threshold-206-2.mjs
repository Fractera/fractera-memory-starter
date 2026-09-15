#!/usr/bin/env node
// ПРИБОР 206-2 и 206-9: ПОРОГ 2000 СЛОВ, ВЕКТОР У СКАЗАННОГО, УРЕЗАННЫЙ ВХОД.
//
// 🔒 ЧТО ДОКАЗЫВАЕТСЯ: короткая фраза ложится в связи И в вектор (прежде вектор не получал ни одной
// фразы человека — измерено разведкой 206-2); длиннее 2000 слов — целиком в объектное хранилище, без
// вызова модели; снятые параметры (`thread`, `deny`, `need_table`, `history`, `prior`) больше не
// ожидаются и судьбы не получают.
//
// 🔒 ГРАНИЦА ПРОВЕРЯЕТСЯ ЧИСЛОМ, А НЕ НА ГЛАЗ: 2000 слов — коротко, 2001 — длинно. Порог, проверенный
// «примерно длинным» текстом, ловит любое число и потому не ловит ничего.
//
// 🛑 ЧТО ПРИБОР УДАЛЯЕТ И ЧЬЁ ЭТО: только свои документы графа по префиксу `memory/probe-206-2/`.
// Ни объектов, ни строк живой памяти он не трогает — объект длинного текста остаётся, и это сказано.
//
// 🛑 СТОИТ ОДИН ВЫЗОВ МОДЕЛИ (короткая фраза). Длинная — ноль вызовов, это и проверяется.
// Запуск на сервере: node scripts/probe/meaning-threshold-206-2.mjs

import { forgetBySource } from "../../lib/graph.mjs"
import { MAX_WORDS_FOR_MEANING, meaningVerdict, wordsIn } from "../../lib/said-vector.mjs"
import { remember } from "../../lib/verbs.mjs"

const WHO = "probe-206-2"
let failed = 0
const say = (ok, text, extra = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}${extra ? `  — ${extra}` : ""}`)
}

console.log("===PROBE_206_2===")
console.log(`порог: ${MAX_WORDS_FOR_MEANING} слов`)

// ── ГРАНИЦА СЧИТАЕТСЯ ЧИСЛОМ ────────────────────────────────────────────────
const word = "слово"
const exact = Array(MAX_WORDS_FOR_MEANING).fill(word).join(" ")
const over = Array(MAX_WORDS_FOR_MEANING + 1).fill(word).join(" ")
say(wordsIn(exact) === MAX_WORDS_FOR_MEANING, `счёт слов точен: ${wordsIn(exact)}`)
say(meaningVerdict(exact).long === false, "ровно 2000 слов — ещё короткое")
say(meaningVerdict(over).long === true, "2001 слово — уже длинное", meaningVerdict(over).why)

// ── КОРОТКАЯ ФРАЗА: СВЯЗИ И ВЕКТОР ──────────────────────────────────────────
const short = await remember({
  lang: "ru",
  text: "Я держу деньги в евро и считаю расходы по неделям.",
  via: "прибор",
  who: WHO,
})
say(short?.ok === true, `короткая фраза принята: ${short?.what_happened ?? short?.error}`)
say(
  short?.kept_whole?.where === "graph+vector",
  `короткая фраза легла в связи и в вектор: ${short?.kept_whole?.where}`,
  short?.kept_whole?.vector ? JSON.stringify(short.kept_whole.vector) : "",
)
say(short?.used_model === true, "короткая фраза разобрана моделью — так и задумано")

// ── ДЛИННЫЙ ТЕКСТ: ТОЛЬКО ОБЪЕКТ, БЕЗ МОДЕЛИ ────────────────────────────────
const long = await remember({ lang: "ru", text: over, via: "прибор", who: WHO })
say(long?.kept_whole?.where === "objects", `длинный текст ушёл в объекты: ${long?.kept_whole?.where}`)
say(Boolean(long?.kept_whole?.id), `у объекта есть идентификатор: ${long?.kept_whole?.id ?? "нет"}`)
say(long?.used_model === false, "модель на длинном тексте не звалась — ход сэкономлен")
say(
  Array.isArray(long?.noted) && long.noted.length === 0,
  "фактов из длинного текста не вынималось: разбирать его мы не обещали",
)

// ── ВХОД УРЕЗАН: СНЯТЫЕ ПАРАМЕТРЫ БОЛЬШЕ НЕ ОЖИДАЮТСЯ ───────────────────────
const cut = await remember({
  deny: "нет, не так",
  lang: "ru",
  need_table: true,
  text: "Мой брат живёт в Гранаде.",
  thread: "выдуманная-нить",
  via: "прибор",
  who: WHO,
})
const names = (cut?.params ?? []).map((p) => p.name)
say(
  !names.includes("thread") && !names.includes("deny") && !names.includes("need_table"),
  `снятые параметры судьбы не получают: ${names.length ? names.join(", ") : "ни одной строки params"}`,
)
say(cut?.thread === undefined, "нить в ответе не обещается")
say(
  (cut?.params ?? []).some((p) => p.name === "via" && p.state === "accepted"),
  "канал по-прежнему принят — вход урезан, а не выпотрошен",
)

// ── УБОРКА ПО СВОЕЙ МЕТКЕ ───────────────────────────────────────────────────
const forgotten = await forgetBySource(`memory/${WHO}/`)
console.log(`документов графа прибора убрано: ${forgotten.deleted ?? 0}`)
console.log(`🛑 объект длинного текста ОСТАЁТСЯ в хранилище: ${long?.kept_whole?.id ?? "—"} (это рабочая форма памяти, а не мусор)`)

console.log("")
if (failed === 0) {
  console.log("✓ ВСЁ СОШЛОСЬ: порог держит, вектор получает сказанное, вход — текст и объекты")
  process.exit(0)
}
console.log(`🛑 ПРОВАЛОВ: ${failed}`)
process.exit(1)

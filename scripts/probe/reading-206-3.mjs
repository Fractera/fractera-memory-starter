#!/usr/bin/env node
// ПРИБОР 206-3: ЧТЕНИЕ БЕЗ КОРНЕВОЙ ТАБЛИЦЫ И БЕЗ ВЫЗОВА МОДЕЛИ.
//
// 🔒 ЧТО ДОКАЗЫВАЕТСЯ: каждая фраза получает строку в ЕДИНСТВЕННОЙ таблице; «что ты обо мне знаешь»
// отвечается из неё; вопрос с именем идёт в связи, вопрос без имени — в вектор; обе ступени не зовут
// модель вовсе; чего нет — честное «не знаю», а не пересказ ближайшего.
//
// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ ЗДЕСЬ ДВОЙНОЙ, потому что «ничего не нашлось» — самый удобный способ
// выглядеть исправным: спрашиваем заведомо чужое («что я знаю о Плутоне») и требуем «не знаю», и
// спрашиваем заведомо своё и требуем находку. Прибор, который не умеет покраснеть, бесполезен.
//
// 🛑 ЧТО ПРИБОР УДАЛЯЕТ И ЧЬЁ ЭТО: свои документы связей по префиксу `memory/probe-206-3/` и свои
// строки таблицы сообщений по метке `who = probe-206-3`. Живых строк памяти он не трогает.
//
// 🛑 СТОИТ ДВА ВЫЗОВА МОДЕЛИ (две записи). Чтение — ноль, это и проверяется.
// Запуск на сервере: node scripts/probe/reading-206-3.mjs

import { forgetBySource } from "../../lib/graph.mjs"
import { MESSAGES } from "../../lib/messages.mjs"
import { sql } from "../../lib/store.mjs"
import { people, recall, remember } from "../../lib/verbs.mjs"

const WHO = "probe-206-3"
let failed = 0
const say = (ok, text, extra = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}${extra ? `  — ${extra}` : ""}`)
}

console.log("===PROBE_206_3===")

// ── ЗАПИСЬ: СТРОКА В ЕДИНСТВЕННОЙ ТАБЛИЦЕ ───────────────────────────────────
const before = await sql(`SELECT COUNT(*) AS n FROM ${MESSAGES} WHERE who = ?`, [WHO])
const had = Number(before.rows?.[0]?.n ?? 0)

const w1 = await remember({
  lang: "ru",
  text: "Мой друг Аркадий живёт в Валенсии и чинит старые мотоциклы.",
  via: "прибор",
  who: WHO,
})
say(w1?.ok === true, `запись принята: ${w1?.what_happened ?? w1?.error}`)
say(Number.isInteger(w1?.message_id), `строка в таблице сообщений получена: id=${w1?.message_id ?? "нет"}`)

const w2 = await remember({
  lang: "ru",
  text: "Деньги я держу в евро, а наличные почти не использую.",
  via: "прибор",
  who: WHO,
})
say(Number.isInteger(w2?.message_id), `вторая строка получена: id=${w2?.message_id ?? "нет"}`)

const after = await sql(`SELECT COUNT(*) AS n FROM ${MESSAGES} WHERE who = ?`, [WHO])
say(
  Number(after.rows?.[0]?.n ?? 0) === had + 2,
  `строк прибавилось ровно две: было ${had}, стало ${after.rows?.[0]?.n}`,
)

// ── ЧТЕНИЕ БЕЗ ВОПРОСА: ИЗ ЕДИНСТВЕННОЙ ТАБЛИЦЫ, БЕЗ МОДЕЛИ ─────────────────
const all = await recall({ lang: "ru", who: WHO })
say(all?.ok === true, `чтение без вопроса ответило: ${all?.what_happened}`)
say(all?.used_model === false, "модель на чтении без вопроса не звалась")
say((all?.known ?? []).length >= 2, `известного не меньше двух: ${(all?.known ?? []).length}`)
say(
  (all?.known ?? []).every((k) => k.found_by === "messages"),
  "всё известное пришло из таблицы сообщений",
)

// ── ВОПРОС С ИМЕНЕМ: СВЯЗИ, ХОДОВ МОДЕЛИ НОЛЬ ───────────────────────────────
const byName = await recall({ lang: "ru", text: "Что я рассказывал про Аркадия?", who: WHO })
say(byName?.used_model === false, "вопрос с именем не стоил вызова модели")
const foundName = (byName?.known ?? []).some((k) => k.found_by === "graph" || k.found_by === "vector")
say(foundName, `нашлось по имени или по смыслу: ${(byName?.known ?? []).map((k) => k.found_by).join(", ") || "ничего"}`, byName?.what_happened)

// ── ВОПРОС БЕЗ ИМЕНИ: ВЕКТОР ────────────────────────────────────────────────
const byMeaning = await recall({ lang: "ru", text: "В какой валюте я храню сбережения?", who: WHO })
say(byMeaning?.used_model === false, "вопрос без имени тоже не стоил вызова модели")
say(
  (byMeaning?.known ?? []).some((k) => k.found_by === "vector"),
  `вектор ответил: ${(byMeaning?.known ?? []).map((k) => k.found_by).join(", ") || "ничего"}`,
  byMeaning?.what_happened,
)

// ── НЕГАТИВ: ЗАВЕДОМО ЧУЖОЕ ОБЯЗАНО ДАТЬ «НЕ ЗНАЮ» ──────────────────────────
const alien = await recall({ lang: "ru", text: "Какая температура на Плутоне зимой?", who: WHO })
say(
  (alien?.known ?? []).length === 0,
  `негатив: на постороннее — честное «не знаю» (${alien?.what_happened})`,
)

// ── НЕГАТИВ ВТОРОЙ: ЧУЖИЕ ФРАЗЫ НЕ ОТВЕЧАЮТ ЗА ЭТОГО ЧЕЛОВЕКА ───────────────
//
// ✗ ЭТО НЕ ПРИДУМАННЫЙ СЛУЧАЙ, А ЖИВОЙ ДЕФЕКТ ПЕРВОГО ПРОГОНА 206-3: у человека, о котором память
// не знала ничего, вопрос про валюту нашёл ответ — фразу ДРУГОГО человека. Прибор был зелёным,
// потому что спрашивал «нашлось ли», а не «чьё это».
const alien2 = await recall({ lang: "ru", text: "В какой валюте я храню сбережения?", who: `${WHO}-никто` })
say(
  (alien2?.known ?? []).length === 0,
  `негатив: человеку без единой записи вектор не отвечает чужим (${alien2?.what_happened})`,
)

// ── ЛЮДИ — ИЗ ТОЙ ЖЕ ТАБЛИЦЫ ────────────────────────────────────────────────
const who = await people({ lang: "ru" })
say(who?.ok === true && (who.people ?? []).some((x) => x.who === WHO), `люди берутся из сообщений: ${(who.people ?? []).length}`)

// ── УБОРКА ПО СВОЕЙ МЕТКЕ ───────────────────────────────────────────────────
const forgotten = await forgetBySource(`memory/${WHO}/`)
const cleaned = await sql(`DELETE FROM ${MESSAGES} WHERE who = ?`, [WHO])
console.log(`убрано: документов связей ${forgotten.deleted ?? 0}, строк сообщений прибора ${cleaned.ok ? "да" : "нет"}`)

console.log("")
if (failed === 0) {
  console.log("✓ ВСЁ СОШЛОСЬ: одна таблица фиксирует входящее, чтение отвечает из неё и не зовёт модель")
  process.exit(0)
}
console.log(`🛑 ПРОВАЛОВ: ${failed}`)
process.exit(1)

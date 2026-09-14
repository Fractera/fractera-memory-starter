#!/usr/bin/env node
//
// ПРИБОР 200-7, ЧАСТЬ «ПОИСК ФАКТОВ» — ТЕ ЖЕ ВОПРОСЫ ПО-АНГЛИЙСКИ.
//
// 🎯 Слово владельца 2026-09-14: «Я тебе сказал запусти эту часть Тестов на английском языке дай результат на русском».
// 🔒 ЗАЧЕМ: матрица 200-7 показала, что русский вопрос не совпадает с английскими именами родов никогда. Этот прогон отвечает, работает ли
// механический поиск без ИИ, когда язык вопроса совпадает с языком имён, — и не ловит ли он ложные совпадения по служебным словам имени рода.
// 🔒 СУДЬЯ СТРОГИЙ (урок 200-7): правильно — в `known` ровно нужный факт; неправильно — нужное утонуло в «вот всё» или не найдено;
// абсолютно неправильно — уверенно отдан один ЧУЖОЙ факт.
// 🛑 ЦЕНА: ни одного хода модели; одно встраивание на вопрос с текстом (поиск объектов). Ничего не пишет и не удаляет.

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_PUBLIC_URL ?? "https://memory.aifa.dev"
const KEY = readFileSync(process.env.MEMORY_API_KEY_FILE ?? "/etc/fractera/memory-api-key", "utf8").trim()
const WHO = "probe-200-7"

const OK = "правильно"
const BAD = "неправильно"
const WORST = "абсолютно неправильно"

async function ask(body) {
  const started = Date.now()
  const r = await fetch(`${BASE}/v1/recall`, {
    body: JSON.stringify({ lang: "en", who: WHO, ...body }),
    headers: { "content-type": "application/json", "x-memory-key": KEY },
    method: "POST",
  })
  return { json: await r.json().catch(() => ({})), ms: Date.now() - started, status: r.status }
}

const lower = (v) => String(v ?? "").toLowerCase()

/** [id, вопрос, доп. параметры, какой факт нужен (часть значения) или null для «не знаю»] */
const CASES = [
  ["E1", "where do I live?", {}, "севиль"],
  ["E2", "what city do I live in?", {}, "севиль"],
  ["E3", "what is my job?", { depth: "deep" }, "архитект"],
  ["E4", "what is my favorite color?", { want_chain: true }, "син"],
  ["E5", "where did I move to?", { history: "we talked about moving" }, "севиль"],
  ["E6", "what is my name?", { prior: "found so far: name Proba" }, "проба"],
  ["E7", "who did I meet?", { scope: [{ place: "Madrid" }] }, "серге"],
  ["E8", "what language do I speak with you?", {}, "русск"],
  ["E9", "what breed is my dog?", {}, null],
  ["E10", "passport scan", {}, null],
]

console.log("=".repeat(96))
console.log(`ПРИБОР 200-7 EN — поиск фактов по-английски · ${BASE} · человек ${WHO} · ${new Date().toISOString()}`)
console.log("=".repeat(96))

const tally = { [OK]: 0, [BAD]: 0, [WORST]: 0 }
for (const [id, text, extra, needle] of CASES) {
  const r = await ask({ text, ...extra })
  const known = r.json?.known ?? []
  const dump = /everything|всё, что известно/i.test(String(r.json?.what_happened ?? ""))
  const values = known.map((k) => `${k.what}=${k.value}`)
  let verdict
  let why
  if (needle === null) {
    if (known.length === 0) [verdict, why] = [OK, "честно: фактов нет"]
    else if (dump) [verdict, why] = [BAD, `вместо «не знаю» отдано всё (${known.length})`]
    else [verdict, why] = [WORST, `уверенно отдан несвязанный факт: ${values.join("; ")}`]
  } else if (known.length === 1 && lower(known[0].value).includes(needle)) {
    [verdict, why] = [OK, `ровно нужный факт: ${values[0]}`]
  } else if (known.length === 1) {
    [verdict, why] = [WORST, `уверенно отдан чужой факт: ${values[0]}`]
  } else if (known.some((k) => lower(k.value).includes(needle))) {
    [verdict, why] = [BAD, `нужное утонуло: отдано ${known.length} фактов${dump ? " («вот всё»)" : ""}`]
  } else {
    [verdict, why] = [BAD, `нужного факта нет среди ${known.length}`]
  }
  tally[verdict] += 1
  const objs = (r.json?.objects ?? []).map((o) => `${o.title} (${Number(o.score).toFixed(3)})`).join(" | ")
  const params = (r.json?.params ?? []).map((p) => `${p.name}:${p.state}`).join(", ")
  const mark = verdict === OK ? "✓" : verdict === BAD ? "≈" : "✗"
  console.log(`${mark} ${id.padEnd(4)} «${text}»${params ? ` [${params}]` : ""} · ${r.status} · ${r.ms} мс · факты: ${r.json?.used_model ? "ход модели" : "SQL без ИИ"} · ${verdict} · ${why}${objs ? ` · объекты (встраивание): ${objs}` : ""}`)
}
console.log("-".repeat(96))
console.log(`ИТОГО EN: ${JSON.stringify(tally)}`)
console.log("===EN_DONE===")

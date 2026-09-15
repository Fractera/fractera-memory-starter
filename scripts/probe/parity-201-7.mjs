#!/usr/bin/env node
//
// ПРИБОР 201-7 — ПАРИТЕТ ПОТРЕБИТЕЛЕЙ: ОДНА МАТРИЦА, ДВА ЗОВУЩИХ.
//
// 🔒 ЗАКОН ШЕСТОЙ (`LAWS.md`), СЛОВО ВЛАДЕЛЬЦА: «внешние потребители должны найти пользу в памяти и
// получить её в том же самом качестве пусть дольше, пусть при большем количестве запросов». Значит
// проверяется РАВЕНСТВО ОЦЕНОК, а разница допускается только во времени и числе ходов модели.
//
// Два зовущих, одна и та же матрица:
//   • «бот» — у него своя сильная модель, он присылает `features` и канал `via`;
//   • «сайт» — обычная программа: те же фразы без признаков.
// Потом обоим задаются одни и те же вопросы, и каждая строка получает оценку по трём ступеням
// (закон пятый): правильно · неправильно · абсолютно неправильно.
//
// 🔒 ЗОВЁМ ЧЕРЕЗ ПУБЛИЧНЫЙ API И КЛЮЧ ПАМЯТИ — так, как это делает чужая программа. Внутренние
// импорты доказывали бы работу кода, а не доступность памяти снаружи.
//
// 🛑 ЧТО ПРИБОР ПИШЕТ И УДАЛЯЕТ: двух пробных людей `parity-201-7-bot` и `parity-201-7-site`, и
// убирает их строки по этим ключам, а документы графа — по их именам. Памяти владельца не касается.
//
// 💰 ЦЕНА ДО ПРОГОНА: у «сайта» 5 ходов модели на запись, у «бота» 0 (признаки пропускают разбор),
// плюс 10 ходов на вопросы (по одному на вопрос) и один ход на проверку подмены ключа — итого ~16
// ходов подписки, 2–4 минуты. Остаток окна проверяется до прогона (урок 201-4).
//
// Запуск на сервере из корня службы:  node scripts/probe/parity-201-7.mjs [keep]

import { readFileSync, writeFileSync } from "node:fs"
import { dataCall } from "../../lib/data-call.mjs"
import { forgetBySource } from "../../lib/graph.mjs"
import { ROOT } from "../../lib/naming.mjs"

const MARK = "===PROBE_201_7==="
const BASE = process.env.MEMORY_PUBLIC_URL ?? "https://memory.aifa.dev"
const KEY = readFileSync(process.env.MEMORY_API_KEY_FILE ?? "/etc/fractera/memory-api-key", "utf8").trim()
const BOT = "parity-201-7-bot"
const SITE = "parity-201-7-site"
const KEEP = process.argv[2] === "keep"
const OUT = process.env.PARITY_OUT ?? "/tmp/parity-201-7.json"

const OK = "правильно"
const BAD = "неправильно"
const WORST = "абсолютно неправильно"

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}

async function call(verb, body) {
  const started = Date.now()
  const r = await fetch(`${BASE}/v1/${verb}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-memory-key": KEY },
    method: "POST",
  })
  const json = await r.json().catch(() => ({ raw: "not json" }))
  return { json, ms: Date.now() - started, status: r.status }
}

// ── матрица: что говорим и что потом спрашиваем ──────────────────────────────
const SAID = [
  {
    features: [{ key: "person.name-he-is-called", value: "Рома Армстронг" }],
    text: "меня зовут Рома Армстронг",
  },
  {
    features: [{ key: "person.city-where-he-lives-now", value: "Севилья" }],
    text: "я живу в Севилье",
  },
  {
    features: [
      { key: "money.spent-on-a-purchase", value: { amount: 200, currency: "руб", what: "молоко" } },
      { key: "money.spent-on-a-purchase", value: { amount: 300, currency: "руб", what: "колбаса" } },
      { key: "money.spent-on-a-purchase", value: { amount: 400, currency: "руб", what: "вода" } },
    ],
    text: "мои расходы на молоко колбасу и воду сегодня были 200 300 и 400 руб",
  },
  {
    features: [{ key: "person.people-he-calls-his-friends", value: "Денис" }],
    text: "Мой друг Денис служил в президентском полку с 1994 по 1996 год",
  },
  {
    features: [{ key: "person.language-he-speaks-with-us", value: "русский" }],
    text: "отвечай мне по-русски",
  },
]

const ASKED = [
  { ask: "сколько я потратил сегодня?", judge: (j) => (j.known ?? []).some((k) => Number(k.value) === 900), want: "900 одной суммой" },
  { ask: "где я живу?", judge: (j) => hasValue(j, /севиль/i), want: "Севилья" },
  { ask: "where do I live?", judge: (j) => hasValue(j, /севиль/i), want: "Севилья по-английски" },
  { ask: "как меня зовут?", judge: (j) => hasValue(j, /армстронг|рома/i), want: "имя" },
  { ask: "какая порода у моей собаки?", judge: (j) => (j.known ?? []).length === 0, want: "честное «не знаю»" },
]
const hasValue = (j, re) => (j.known ?? []).some((k) => re.test(String(k.value)))

async function run(who, { withFeatures }) {
  const writes = []
  for (const s of SAID) {
    const body = { lang: "ru", text: s.text, who }
    if (withFeatures) {
      body.features = s.features
      body.via = "Telegram"
    }
    const r = await call("remember", body)
    writes.push({ ms: r.ms, noted: (r.json.noted ?? []).length, status: r.status, text: s.text, used_model: r.json.used_model !== false })
  }
  // Связи строятся в фоне (2,3–6,2 с, измерено 201-2): ждём по факту, а не паузой.
  for (let i = 0; i < 30; i++) {
    const l = await dataCall(`/service/rag/graph/label/search?q=${encodeURIComponent("Денис")}&limit=5`, undefined, "GET")
    if (Array.isArray(l.body) && l.body.length) break
    await new Promise((r) => setTimeout(r, 3000))
  }
  const reads = []
  for (const a of ASKED) {
    const r = await call("recall", { lang: "ru", text: a.ask, who })
    const verdict = !r.json.ok ? WORST : a.judge(r.json) ? OK : BAD
    reads.push({
      ask: a.ask,
      depth: r.json.depth_used ?? null,
      means: [...new Set((r.json.known ?? []).map((k) => k.found_by ?? "—"))].join(",") || "—",
      ms: r.ms,
      used_model: r.json.used_model === true,
      verdict,
      want: a.want,
      answer: String(r.json.what_happened ?? "").slice(0, 90),
    })
  }
  return { reads, who, writes }
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : null
}

console.log(`${MARK} start ${new Date().toISOString()}`)
console.log(`— «бот» (${BOT}): с признаками и каналом · «сайт» (${SITE}): те же фразы без признаков —`)

const bot = await run(BOT, { withFeatures: true })
const site = await run(SITE, { withFeatures: false })

// ── A: оценки построчно ──────────────────────────────────────────────────────
console.log("\nвопрос                                   | бот          | сайт         | чем достали (бот/сайт)")
let mismatch = 0
for (let i = 0; i < ASKED.length; i++) {
  const b = bot.reads[i]
  const s = site.reads[i]
  if (b.verdict !== s.verdict) mismatch += 1
  console.log(
    `${b.ask.padEnd(40)} | ${b.verdict.padEnd(12)} | ${s.verdict.padEnd(12)} | ${b.means}/${s.means} · ${b.ms}/${s.ms} мс · глубина ${b.depth}/${s.depth}`,
  )
}
say(mismatch === 0, `оценки совпали построчно: расхождений ${mismatch} из ${ASKED.length}`)
say(
  bot.reads.every((r) => r.verdict === OK) && site.reads.every((r) => r.verdict === OK),
  `все строки «правильно»: бот ${bot.reads.filter((r) => r.verdict === OK).length}/${ASKED.length}, сайт ${site.reads.filter((r) => r.verdict === OK).length}/${ASKED.length}`,
)

// ── цена: где именно разница ─────────────────────────────────────────────────
const botTurns = bot.writes.filter((w) => w.used_model).length + bot.reads.filter((r) => r.used_model).length
const siteTurns = site.writes.filter((w) => w.used_model).length + site.reads.filter((r) => r.used_model).length
const botWriteMs = median(bot.writes.map((w) => w.ms))
const siteWriteMs = median(site.writes.map((w) => w.ms))
console.log(
  `\nцена: ходов модели бот ${botTurns} · сайт ${siteTurns} (разница ${siteTurns - botTurns}) · медиана записи ${botWriteMs}/${siteWriteMs} мс · медиана чтения ${median(bot.reads.map((r) => r.ms))}/${median(site.reads.map((r) => r.ms))} мс`,
)
say(siteTurns > botTurns, `разница именно в ходах модели: сайт тратит на ${siteTurns - botTurns} больше`)
say(botWriteMs < siteWriteMs, `и во времени записи: ${botWriteMs} мс против ${siteWriteMs} мс`)

// ── B: подмена ключа «ботом» ─────────────────────────────────────────────────
//
// 🔒 ЗДЕСЬ ИЗМЕРЯЕТСЯ ГРАНИЦА ДОВЕРИЯ, А НЕ ЖЕЛАЕМОЕ. Память проверяет ТИП значения, а не смысл:
// значение годного типа под чужим ключом она примет. Проверяем оба случая и называем правду.
const wrongType = await call("remember", {
  features: [{ key: "money.spent-on-a-purchase", value: "много" }],
  lang: "ru",
  text: "потратил много",
  who: BOT,
})
say(
  (wrongType.json.dropped ?? []).some((d) => /не принят/.test(d)),
  `НЕГАТИВ: значение не того типа отвергнуто: ${(wrongType.json.dropped ?? []).join("; ") || "МОЛЧА"}`,
)

const wrongKey = await call("remember", {
  features: [{ key: "person.color-he-calls-his-favorite", value: "Лиссабон" }],
  lang: "ru",
  text: "я переехал в Лиссабон",
  who: BOT,
})
const wrote = (wrongKey.json.noted ?? []).map((n) => `${n.what}=${n.became ?? n.added ?? n.value}`)
const cityAfter = await call("recall", { lang: "ru", text: "где я живу?", who: BOT })
const cityStill = hasValue(cityAfter.json, /севиль/i)
console.log(
  `\nГРАНИЦА ДОВЕРИЯ: «бот» прислал верный по типу, но чужой по смыслу ключ (город под «любимым цветом»).`,
)
console.log(`   память записала: ${wrote.join(", ") || "ничего"}`)
console.log(`   «где я живу?» после этого: ${cityStill ? "прежний ответ цел (Севилья)" : "ОТВЕТ ИСПОРЧЕН"} · ${String(cityAfter.json.what_happened).slice(0, 80)}`)
say(
  cityStill,
  `прежнее знание не испорчено подменой ключа (проверка типа не ловит подмену СМЫСЛА — это названная граница, решение о ней за владельцем)`,
)

writeFileSync(OUT, JSON.stringify({ bot, site, wrongKey: wrote, at: new Date().toISOString() }, null, 2))
console.log(`\nполная таблица: ${OUT}`)

// ── уборка ───────────────────────────────────────────────────────────────────
if (!KEEP) {
  console.log("── уборка по своей метке ──")
  let rows = 0
  const tables = await dataCall("/db/migrate", { params: ["table", `${ROOT}%`], sql: "SELECT name FROM sqlite_master WHERE type = ? AND name LIKE ?" })
  for (const row of tables.ok ? (tables.body?.rows ?? []) : []) {
    const r = await dataCall("/db/migrate", { params: [BOT, SITE], sql: `DELETE FROM ${row.name} WHERE who IN (?, ?)` })
    if (r.ok) rows += Number(r.body?.changes ?? 0)
  }
  const left = await dataCall("/db/migrate", { params: [BOT, SITE], sql: `SELECT COUNT(*) AS n FROM ${ROOT} WHERE who IN (?, ?)` })
  say(Number(left.body?.rows?.[0]?.n ?? 0) === 0, `строк прибора удалено ${rows}, осталось ${left.body?.rows?.[0]?.n ?? "?"}`)
  for (const w of [BOT, SITE]) {
    const g = await forgetBySource(`memory/${w.replace(/[^\w.@-]/g, "_")}`)
    console.log(`   документы графа ${w}: удалено ${g.deleted ?? 0}`)
  }
}

console.log(`${MARK} ${bad ? `ПРОВАЛОВ: ${bad}` : "всё сошлось"} ${new Date().toISOString()}`)
process.exit(bad ? 1 : 0)

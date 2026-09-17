#!/usr/bin/env node
// ПРИБОР 219: РАЗГОВОР ХРАНИТСЯ ЦЕЛИКОМ И ДОЕЗЖАЕТ ДО ЗАЯВКИ СТРОИТЕЛЮ.
//
// 🎯 ВОПРОС ВЛАДЕЛЬЦА 2026-09-17, РАДИ КОТОРОГО ЗАВЕДЁН ВЕСЬ ШАГ: «через три дня агент откроет эту
// информацию и восстановит всю цепочку сообщений между пользователем и машиной? из этого маленького
// сообщения?» Прибор отвечает на это измерением, а не обещанием.
//
// 🔒 ПРОВЕРЯЕТСЯ НАСТОЯЩИЙ ПУТЬ ЧЕРЕЗ `/v1`, А НЕ ВНУТРЕННИЕ ФУНКЦИИ: так ходит Telegram-служба и так
// ходит стенд. Внутрь смотрим только там, где снаружи не видно, — в строки и связи.
// 🛑 УБОРКА ПО СВОЕЙ МЕТКЕ `telegram/probe-219`: в этих же таблицах лежит живая память архитектора, и
// прибор, стирающий таблицу, стирает её (закон 160). Убираются строки, их связи и векторы отзывов.
//
// Запуск на сервере: node scripts/probe/conversation-case-file.mjs

import { readFileSync, readdirSync, renameSync } from "node:fs"
import { conversationOf } from "/opt/fractera/memory/lib/conversation.mjs"
import { dataCall } from "/opt/fractera/memory/lib/data-call.mjs"
import { LINKS, MESSAGES } from "/opt/fractera/memory/lib/messages.mjs"
import { sql } from "/opt/fractera/memory/lib/store.mjs"

const B = "http://127.0.0.1:3700"
const MARK = "telegram/probe-219"
const ALIEN = "telegram/probe-219-alien"
const PRE = "/opt/fractera/memory/development-docs/development-steps/pre-steps"
const KEY = readFileSync("/etc/fractera/memory-api-key", "utf8").trim()
const SEC = (readFileSync("/etc/fractera/secrets.env", "utf8").split("\n").find((l) => l.startsWith("DATA_SECRET=")) ?? "").slice(12).trim()

const hdr = { "Content-Type": "application/json", "x-memory-key": KEY }
const post = (path, body) => fetch(`${B}/v1/${path}`, { body: JSON.stringify(body), headers: hdr, method: "POST" }).then((r) => r.json())
const tasks = () => readdirSync(PRE).filter((f) => f.endsWith(".md") && f !== "README.md")

async function cleanup() {
  let rows = 0
  for (const mark of [MARK, ALIEN]) {
    const r = await sql(`SELECT id, direction FROM ${MESSAGES} WHERE source_path = '${mark}'`)
    for (const row of r.rows ?? []) {
      if (row.direction === "feedback") await dataCall(`/vectors/feedback-${row.id}`, undefined, "DELETE")
      await sql(`DELETE FROM ${LINKS} WHERE message_id = ${row.id} OR previous_message_id = ${row.id}`)
      await sql(`DELETE FROM ${MESSAGES} WHERE id = ${row.id}`)
      rows += 1
    }
  }
  return rows
}

async function main() {
  console.log("=== ПРИБОР 219 · разговор целиком · метка", MARK, "===\n")
  await cleanup()

  // ── 1. РАЗГОВОР С УТОЧНЕНИЯМИ, И РЯДОМ — ЧУЖОЙ РАЗГОВОР ─────────────────────────────────────
  // 🔒 Чужой идёт ВПЕРЕМЕЖКУ намеренно: негативный контроль обязан проверять то, что реально мешает.
  await post("remember", { from: MARK, lang: "ru", text: "Родион готовит стенд к выставке в Лионе, монтаж 5 ноября" })
  await post("remember", { from: ALIEN, lang: "ru", text: "Зоя закрывает смету по типографии" })
  await post("recall", { from: MARK, lang: "ru", text: "кто готовит стенд" })
  await post("recall", { from: ALIEN, lang: "ru", text: "что у Зои со сметой" })
  const last = await post("recall", { from: MARK, lang: "ru", text: "а когда монтаж" })
  console.log("ответ, который комментируем:", last.answer_id)

  // ── 2. ДВА КОММЕНТАРИЯ ОДНИМ ПОЖЕЛАНИЕМ, РАЗНЫМИ СЛОВАМИ ────────────────────────────────────
  for (const t of ["ответ слишком длинный, хочется покороче", "пиши компактнее, слишком многословно"]) {
    await post("feedback", { about: last.answer_id, from: MARK, lang: "ru", text: t })
  }

  // ── 3. РАЗГОВОР СОБИРАЕТСЯ ЦЕЛИКОМ И БЕЗ ЧУЖОГО ─────────────────────────────────────────────
  const id = Number(String(last.answer_id).replace("ans_", ""))
  const talk = await conversationOf(id)
  const kinds = talk.turns.reduce((m, t) => ({ ...m, [t.direction]: (m[t.direction] ?? 0) + 1 }), {})
  const alien = talk.turns.filter((t) => t.from === ALIEN)
  const withChain = talk.turns.filter((t) => t.direction === "answer" && (t.chain ?? []).length)
  console.log(`\nразговор: ходов ${talk.turns.length} ·`, JSON.stringify(kinds))
  console.log(`  ответов памяти с сохранённым ходом мыслей: ${withChain.length} из ${kinds.answer ?? 0}`)
  console.log(`  ходов чужого разговора внутри: ${alien.length} ${alien.length ? "🛑 ПРОТЕКЛО" : "— верно"}`)

  // ── 4. ЗАЯВКА СТРОИТЕЛЮ НЕСЁТ ВЕСЬ РАЗГОВОР ─────────────────────────────────────────────────
  const j = await (await fetch(`${B}/v1/signals?lang=ru`, { headers: { "x-memory-key": KEY } })).json()
  const group = [...(j.signals ?? []), ...(j.single ?? [])].find((g) => g.grounds.some((x) => talk.turns.some((t) => t.id === x.id)))
  if (!group) {
    console.log("\n🛑 сигнал не собрался — заявку проверить не на чем")
    console.log("\nубрано строк:", await cleanup())
    return
  }
  const before = tasks().length
  const res = await fetch(`${B}/api/fractera/evolution`, {
    body: JSON.stringify({ action: "approve", ids: group.grounds.map((g) => g.id), lang: "ru" }),
    headers: { "Content-Type": "application/json", "x-data-secret": SEC },
    method: "POST",
  })
  const out = await res.json()
  const file = out.task?.id
  console.log(`\nзаявка: ${file} · заявок было ${before}, стало ${tasks().length}`)

  const text = file ? readFileSync(`${PRE}/${file}`, "utf8") : ""
  const has = (what, re) => console.log(`  ${re.test(text) ? "✓" : "🛑"} ${what}`)
  has("вопрос человека дословно", /кто готовит стенд/)
  has("ответ памяти дословно", /ПАМЯТЬ/)
  has("ход мыслей ответа", /Что память при этом делала/)
  has("даты у каждого хода", /2026-09-\d\dT\d\d:\d\d:\d\dZ/)
  has("ссылки на строки памяти", /Ссылки: строки памяти #\d+/)
  // 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ ЗАЯВКИ: чужого разговора в ней быть не должно.
  console.log(`  ${/Зоя|типографи/.test(text) ? "🛑 чужой разговор ПОПАЛ в заявку" : "✓ чужого разговора в заявке нет"}`)
  console.log(`  размер заявки: ${text.length} знаков`)

  if (file) renameSync(`${PRE}/${file}`, `${PRE}/handled/${file}`)
  console.log("\nубрано строк:", await cleanup(), "· заявка прибора уехала в handled")
}

main().catch(async (e) => {
  await cleanup()
  console.error("ОТКАЗ:", e.message)
  process.exit(1)
})

#!/usr/bin/env node
// ПРИБОР 194-13: ОДИН ОБЪЕКТ — ЧЕТЫРЕ ХРАНИЛИЩА, И ИЗ СТРОКИ ТАБЛИЦЫ ДОХОДЯТ ДО КАЖДОГО.
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13: «полное описание отправлять в граф… информации о том, откуда поступил этот
// объект… должна быть написана дата… созданной связи между всеми четырьмя базами, что должна отображаться в
// таблице. Замечательным образом проверь эту часть работы архитектуры… критически важно».
//
// 🔒 ПУТЬ ВЛАДЕЛЬЦА: сохранение идёт через публичный `https://memory.aifa.dev`; хранилища читаются мимо кода
// памяти, прямо у слоя данных — прибор не верит двери на слово.
// 🔒 ГРАФ ПРОВЕРЯЕТСЯ НЕ «ПРИНЯТ», А «РАЗОБРАН И НАХОДИТСЯ»: ждём `processed`, затем вопрос по уникальному слову
// возвращает контекст с полным описанием и происхождением. ✗ Прибор 194-4 мерил только «принят».
// 🔒 НЕГАТИВЫ: вопрос о слове, которого нет нигде, не приносит уникального слова объекта; якоря из пробелов —
// откат и строка `failed`.
// 🛑 ЦЕНА: разбор документа моделью графа и одно встраивание; Claude не зовётся. УБОРКА ПО МЕТКЕ `probe-194`,
// документ графа удаляется ПОСЛЕ разбора — свежий документ движок не удаляет (находка 194-4).
//
// Запуск на сервере: node scripts/probe/object-four-stores.mjs

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "https://memory.aifa.dev"
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const WHO = "probe-194"

function machineEnv(name) {
  try {
    for (const line of readFileSync("/etc/fractera/secrets.env", "utf8").split("\n")) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    }
  } catch { /* вне сервера — пусто */ }
  return ""
}
const KEY = process.env.DATA_SECRET || machineEnv("DATA_SECRET")
const H = { "Content-Type": "application/json", "X-Data-Secret": KEY }
const G = { "x-data-secret": KEY }
const sql = async (text, params = []) =>
  (await fetch(`${DATA}/db/migrate`, { body: JSON.stringify({ params, sql: text }), headers: H, method: "POST" })).json()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}

const graphDocs = async () => {
  const d = await (await fetch(`${DATA}/service/rag/documents`, { headers: { "X-Data-Secret": KEY } })).json().catch(() => ({}))
  return Object.entries(d.statuses ?? {}).flatMap(([status, list]) => (list ?? []).map((x) => ({ ...x, status })))
}

console.log("===PROBE_FOUR_STORES===")
const UNIQUE = "Зимородокквазар"
const TITLE = `Схема скворечника ${UNIQUE}`
const FULL =
  `Полное описание объекта «${TITLE}». Чертёж скворечника из сосновой доски толщиной 20 мм: передняя стенка ` +
  `с летком диаметром 45 мм на высоте 15 см от дна, съёмная крыша на двух петлях, вентиляционные щели под крышей. ` +
  `Размеры корпуса 15 на 15 на 30 см. Слово-метка ${UNIQUE} стоит здесь, чтобы найти документ в графе однозначно.`
const bytes = Buffer.from(`# ${TITLE}\n\nЛеток 45 мм, доска 20 мм, крыша на петлях.\n`, "utf8")

// ── сохранение через публичный адрес ────────────────────────────────────────
const form = new FormData()
form.append("file", new Blob([bytes], { type: "text/markdown" }), "probe-194-13-birdhouse.md")
form.append("about", `Чертёж скворечника ${UNIQUE}: сосновая доска 20 мм, леток 45 мм, съёмная крыша на петлях.`)
form.append("full", FULL)
form.append("title", TITLE)
form.append("tags", JSON.stringify(["скворечник", "чертёж"]))
form.append("who", WHO)
const t0 = Date.now()
const saved = await (await fetch(`${BASE}/api/fractera/object-test`, { body: form, headers: G, method: "POST" })).json()
say(saved.ok === true, `сохранено за ${Date.now() - t0} мс: messageId ${saved.messageId} ${saved.ok ? "" : JSON.stringify(saved)}`)

const row = saved.messageId
  ? (await sql("SELECT id, status, source, author, object_id, vector_id, rag_source, title FROM messages_that_came_into_memory WHERE id = ?", [saved.messageId])).rows?.[0]
  : null
console.log(`строка: ${JSON.stringify(row)}`)
say(row?.source === "stand" && Boolean(row?.author), `происхождение в строке: source=${row?.source}, author=${row?.author}`)

if (row) {
  // ── 1. объектное хранилище ─────────────────────────────────────────────────
  const media = ((await (await fetch(`${DATA}/media`, { headers: { "X-Data-Secret": KEY } })).json()).items ?? []).find((m) => String(m.id) === String(row.object_id))
  say(Boolean(media) && media.description === FULL, `1 объект: файл ${row.object_id} есть, полное описание рядом (${String(media?.description ?? "").length} знаков)`)

  // ── 2. векторное хранилище ─────────────────────────────────────────────────
  const vec = (await sql("SELECT id, ref_id, ref_table FROM vectors WHERE id = ?", [row.vector_id])).rows?.[0]
  say(vec?.ref_id === String(row.object_id) && vec?.ref_table === "media", `2 вектор: карточка ${row.vector_id} → media ${vec?.ref_id}`)

  // ── 3. граф: разобран ──────────────────────────────────────────────────────
  let doc = null
  const tg = Date.now()
  for (let i = 0; i < 36; i++) {
    doc = (await graphDocs()).find((d) => String(d.file_path ?? "").startsWith(row.rag_source))
    if (doc && ["processed", "failed"].includes(doc.status)) break
    await sleep(5000)
  }
  say(doc?.status === "processed", `3 граф: документ ${doc?.id} по ${row.rag_source} → ${doc?.status ?? "не найден"} за ${Math.round((Date.now() - tg) / 1000)} с`)

  // ── 4. граф находит объект, и в контексте полное описание и происхождение ─
  const q = async (word) => {
    const r = await fetch(`${DATA}/service/rag/query`, {
      body: JSON.stringify({ enable_rerank: false, hl_keywords: [], ll_keywords: [word], mode: "local", only_need_context: true, query: `Что известно о ${word}?` }),
      headers: H,
      method: "POST",
    })
    const j = await r.json().catch(() => ({}))
    return String(j.response ?? j.result ?? "")
  }
  if (doc?.status === "processed") {
    const ctx = await q(UNIQUE)
    say(ctx.includes(UNIQUE), `4 граф находит: контекст ${ctx.length} знаков содержит «${UNIQUE}»`)
    say(/леток|летком|45 мм/i.test(ctx), "в контексте полное описание (леток 45 мм), а не только саммари")
    say(/Откуда это известно: тестовый стенд памяти/.test(ctx) && ctx.includes(String(row.author)), `в контексте происхождение: стенд, автор ${row.author}, дата`)
    const stamp = ctx.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC/)
    say(Boolean(stamp), `в контексте дата: ${stamp?.[0] ?? "нет"}`)
    const neg = await q("Несуществующийпеликанноль")
    say(!neg.includes(UNIQUE), "негатив: вопрос о несуществующем слове не приносит уникального слова объекта")
  }
}

// ── негатив: якоря из пробелов — откат ──────────────────────────────────────
const bad = new FormData()
bad.append("file", new Blob([bytes], { type: "text/markdown" }), "probe-194-13-bad.md")
bad.append("about", "проба отката 194-13 с пустыми якорями, достаточно слов для карточки поиска")
bad.append("title", "проба отката 194-13")
bad.append("anchors", JSON.stringify(["   "]))
bad.append("who", WHO)
const b = await (await fetch(`${BASE}/api/fractera/object-test`, { body: bad, headers: G, method: "POST" })).json()
const bRow = b.messageId ? (await sql("SELECT status, error, object_id FROM messages_that_came_into_memory WHERE id = ?", [b.messageId])).rows?.[0] : null
say(b.ok === false && bRow?.status === "failed" && !bRow?.object_id, `негатив: пустые якоря → ${b.error}, строка ${JSON.stringify(bRow)}`)

// ── уборка по метке ─────────────────────────────────────────────────────────
const mine = (await sql("SELECT object_id, vector_id, rag_source FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows ?? []
const docIds = (await graphDocs()).filter((d) => mine.some((m) => m.rag_source && String(d.file_path ?? "").startsWith(m.rag_source))).map((d) => String(d.id))
if (docIds.length) {
  const del = await fetch(`${DATA}/service/rag/documents/delete_document`, { body: JSON.stringify({ delete_file: false, doc_ids: docIds }), headers: H, method: "DELETE" })
  console.log(`удаление документов графа: ${del.status} ${(await del.text()).slice(0, 90)}`)
}
for (const m of mine) {
  if (m.object_id) await fetch(`${DATA}/media/${m.object_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
  if (m.vector_id) await fetch(`${DATA}/vectors/${m.vector_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
}
await sql("DELETE FROM messages_that_came_into_memory WHERE who = ?", [WHO])
await sleep(20000)
const left = (await graphDocs()).filter((d) => docIds.includes(String(d.id))).length
say(left === 0, `уборка: строк убрано ${mine.length}, документов графа осталось ${left}`)

console.log(failed ? `\n✗ ПРОВАЛ: ${failed}` : "\n✓ OK")
console.log("===PROBE_FOUR_STORES_END===")

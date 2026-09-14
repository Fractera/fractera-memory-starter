#!/usr/bin/env node
// ПРИБОР 195-2: ОДНА ССЫЛКА — ЧЕТЫРЕ ХРАНИЛИЩА ТЕМ ЖЕ ПРИЁМОМ, ЧТО ОБЪЕКТ; ПОВТОР — «НИЧЕГО НЕ ДЕЛАЕМ».
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-14: «абсолютно одинаковое решение что для объекта что для ссылки».
// 🔒 ПУТЬ ВЛАДЕЛЬЦА: описание и сохранение идут через публичный `https://memory.aifa.dev`; хранилища читаются прямо у слоя данных —
// прибор не верит двери на слово. Форма проверок — прибор объектов 194-13.
// 🔒 ЭТАЛОН НЕЙТРАЛЬНЫЙ — `https://example.com/` (закон 196: боевые сайты владельца с адреса сервера не трогаем).
// 🔒 НЕГАТИВЫ: адрес слоя данных — отказ браузера и ни одной строки; якоря из пробелов — откат, строка `failed`, файла нет;
// повтор описания — `existing` без браузера и модели.
// 🛑 ЦЕНА: одно открытие страницы и ОДИН ход Claude по подписке (описание), разбор документа графом и одно встраивание.
// УБОРКА ПО МЕТКЕ `probe-195-2`: документ графа удаляется после разбора.
//
// Запуск на сервере: node scripts/probe/link-four-stores.mjs

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "https://memory.aifa.dev"
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const WHO = "probe-195-2"
const URL_OK = "https://example.com/"

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
const graphDocs = async () => {
  const d = await (await fetch(`${DATA}/service/rag/documents`, { headers: { "X-Data-Secret": KEY } })).json().catch(() => ({}))
  return Object.entries(d.statuses ?? {}).flatMap(([status, list]) => (list ?? []).map((x) => ({ ...x, status })))
}

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}
const describeLink = async (url) => {
  const t = Date.now()
  const r = await fetch(`${BASE}/api/fractera/link-test/describe`, { body: JSON.stringify({ url }), headers: H, method: "POST" })
  return { j: await r.json().catch(() => ({})), ms: Date.now() - t, status: r.status }
}
const save = async (d, extra = {}) => {
  const form = new FormData()
  form.append("file", new Blob([d.snapshot], { type: "text/markdown" }), d.name)
  form.append("url", extra.url ?? URL_OK)
  form.append("about", d.summary)
  form.append("full", d.full)
  form.append("title", d.title)
  form.append("tags", JSON.stringify(d.tags))
  form.append("anchors", JSON.stringify(extra.anchors ?? d.anchors))
  form.append("described_by", d.described_by)
  form.append("describe_ms", String(d.ms))
  form.append("language", d.language)
  form.append("who", WHO)
  const r = await fetch(`${BASE}/api/fractera/link-ingest`, { body: form, headers: G, method: "POST" })
  return { j: await r.json().catch(() => ({})), status: r.status }
}

console.log("===PROBE_LINK_FOUR_STORES===")
const rowsBefore = Number((await sql("SELECT COUNT(*) AS n FROM messages_that_came_into_memory")).rows?.[0]?.n ?? -1)

// ── негатив: запрещённый адрес — отказ браузера, записи нет ─────────────────
const bad = await describeLink("http://127.0.0.1:3300/")
say(bad.j.ok === false && bad.j.error === "url-forbidden", `негатив: адрес слоя данных → ${bad.status} ${bad.j.error ?? ""}`)

// ── описание ────────────────────────────────────────────────────────────────
const d1 = await describeLink(URL_OK)
const d = d1.j
say(d1.status === 200 && d.ok === true && typeof d.full === "string" && typeof d.snapshot === "string",
  `описание ${d1.status} за ${d1.ms} мс: «${String(d.title ?? "").slice(0, 60)}», полное ${String(d.full ?? "").length}, саммари ${String(d.summary ?? "").split(/\s+/).length} слов, снимок ${d.snapshotChars}, род ${d.kind} ${d.ok ? "" : JSON.stringify(d).slice(0, 200)}`)
say(String(d.snapshot ?? "").includes(URL_OK) && d.name?.startsWith("web-"), `снимок несёт адрес, имя ${d.name}`)

let row = null
if (d.ok && !d.existing) {
  // ── сохранение ─────────────────────────────────────────────────────────────
  const s = await save(d)
  say(s.status === 200 && s.j.ok === true && Number(s.j.messageId) > 0, `сохранено: messageId ${s.j.messageId} ${s.j.ok ? "" : JSON.stringify(s.j)}`)
  row = s.j.messageId
    ? (await sql("SELECT id, kind, url, status, source, author, object_id, vector_id, rag_source, summary FROM messages_that_came_into_memory WHERE id = ?", [s.j.messageId])).rows?.[0]
    : null
  console.log(`строка: ${JSON.stringify(row)?.slice(0, 400)}`)
  say(row?.kind === "web" && row?.url === URL_OK && row?.status === "saved", `таблица: kind=${row?.kind}, url=${row?.url}, status=${row?.status}`)
  say(row?.summary === d.summary, "таблица: саммари = саммари описания")

  if (row) {
    const media = ((await (await fetch(`${DATA}/media`, { headers: { "X-Data-Secret": KEY } })).json()).items ?? []).find((m) => String(m.id) === String(row.object_id))
    say(Boolean(media) && media.description === d.full, `1 объект: снимок ${row.object_id} есть, рядом полное описание (${String(media?.description ?? "").length} знаков)`)
    const vec = (await sql("SELECT id, ref_id, ref_table, text FROM vectors WHERE id = ?", [row.vector_id])).rows?.[0]
    say(vec?.ref_id === String(row.object_id) && String(vec?.text ?? "").includes(d.summary.slice(0, 40)), `2 вектор: карточка ${row.vector_id} → media ${vec?.ref_id}, в ней саммари`)

    let doc = null
    const tg = Date.now()
    for (let i = 0; i < 36; i++) {
      doc = (await graphDocs()).find((x) => String(x.file_path ?? "").startsWith(row.rag_source))
      if (doc && ["processed", "failed"].includes(doc.status)) break
      await sleep(5000)
    }
    say(doc?.status === "processed", `3 граф: документ по ${row.rag_source} → ${doc?.status ?? "не найден"} за ${Math.round((Date.now() - tg) / 1000)} с`)
    if (doc?.status === "processed") {
      const r = await fetch(`${DATA}/service/rag/query`, {
        body: JSON.stringify({ enable_rerank: false, hl_keywords: [], ll_keywords: [String(d.anchors?.[0] ?? d.title)], mode: "local", only_need_context: true, query: `Что известно о ${d.anchors?.[0] ?? d.title}?` }),
        headers: H,
        method: "POST",
      })
      const ctx = String((await r.json().catch(() => ({}))).response ?? "")
      say(ctx.includes(`страница «${URL_OK}»`), `4 граф: в контексте происхождение со страницей «${URL_OK}» (${ctx.length} знаков)`)
      say(ctx.includes(d.full.slice(0, 60)), "4 граф: в контексте полное описание, а не только саммари")
    }
  }

  // ── повтор: ничего не делаем ──────────────────────────────────────────────
  const again = await describeLink(URL_OK)
  say(again.j.ok === true && Number(again.j.existing) === Number(row?.id) && again.ms < 5000, `повтор: existing=${again.j.existing} за ${again.ms} мс — без браузера и модели`)

  // ── негатив: пустые якоря — откат ──────────────────────────────────────────
  const rollback = await save(d, { anchors: ["   "], url: "https://example.com/probe-195-2-rollback" })
  const rb = rollback.j.messageId ? (await sql("SELECT status, error, object_id, kind FROM messages_that_came_into_memory WHERE id = ?", [rollback.j.messageId])).rows?.[0] : null
  say(rollback.j.ok === false && rb?.status === "failed" && !rb?.object_id, `негатив: пустые якоря → ${rollback.j.error}, строка ${JSON.stringify(rb)}`)
}

// ── уборка по метке ─────────────────────────────────────────────────────────
const mine = (await sql("SELECT object_id, vector_id, rag_source FROM messages_that_came_into_memory WHERE who = ?", [WHO])).rows ?? []
const docIds = (await graphDocs()).filter((x) => mine.some((m) => m.rag_source && String(x.file_path ?? "").startsWith(m.rag_source))).map((x) => String(x.id))
if (docIds.length) {
  const del = await fetch(`${DATA}/service/rag/documents/delete_document`, { body: JSON.stringify({ delete_file: false, doc_ids: docIds }), headers: H, method: "DELETE" })
  console.log(`удаление документов графа: ${del.status}`)
}
for (const m of mine) {
  if (m.object_id) await fetch(`${DATA}/media/${m.object_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
  if (m.vector_id) await fetch(`${DATA}/vectors/${m.vector_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
}
await sql("DELETE FROM messages_that_came_into_memory WHERE who = ?", [WHO])
await sleep(20000)
const left = (await graphDocs()).filter((x) => docIds.includes(String(x.id))).length
const rowsAfter = Number((await sql("SELECT COUNT(*) AS n FROM messages_that_came_into_memory")).rows?.[0]?.n ?? -1)
say(left === 0 && rowsAfter === rowsBefore, `уборка: своих строк ${mine.length}, документов графа осталось ${left}, строк до ${rowsBefore} = после ${rowsAfter}`)

console.log(failed ? `✗ ПРОВАЛ: ${failed}` : "✓ OK")
console.log("===PROBE_LINK_FOUR_STORES_DONE===")
process.exit(failed ? 1 : 0)

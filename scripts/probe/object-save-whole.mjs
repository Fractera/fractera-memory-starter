#!/usr/bin/env node
// ПРИБОР 194-4: «СОХРАНИТЬ ОБЪЕКТ» КЛАДЁТ ЧЕТЫРЕ СВЯЗАННЫЕ ЗАПИСИ ИЛИ НИ ОДНОЙ.
//
// 🔒 МОДЕЛЬ ОПИСАНИЯ НЕ ЗОВЁТСЯ: полное описание и саммари прибор приносит сам. Квота подписки не
// тратится; цена — встраивание карточки и разбор документа графом (OpenAI).
// 🔒 ПРОВЕРКА ИДЁТ МИМО КОДА ПАМЯТИ: медиатека, вектор, граф и строка таблицы читаются прямо у слоя данных.
// 🔒 НЕГАТИВ: якоря из одних пробелов — граф отказывает, и уже положенные файл и карточка обязаны
// исчезнуть, а строка лечь со `status = failed`.
// 🛑 УБОРКА ПО СВОЕЙ МЕТКЕ: строки `who = probe-194`, свои медиа id, свои документы графа `object/<id>`.
//
// Запуск на сервере: node scripts/probe/object-save-whole.mjs

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
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

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}
const sql = async (text, params = []) =>
  (await fetch(`${DATA}/db/migrate`, { body: JSON.stringify({ params, sql: text }), headers: H, method: "POST" })).json()
const mediaIds = async () =>
  new Set(((await (await fetch(`${DATA}/media`, { headers: { "X-Data-Secret": KEY } })).json()).items ?? []).map((m) => String(m.id)))
const graphPaths = async () => {
  const d = await (await fetch(`${DATA}/service/rag/documents`, { headers: { "X-Data-Secret": KEY } })).json().catch(() => ({}))
  return Object.values(d.statuses ?? {}).flat().map((x) => String(x.file_path ?? ""))
}

async function save(fields) {
  const form = new FormData()
  form.append("file", new Blob([readFileSync("/tmp/obj-corpus/mac_mini.png")], { type: "image/png" }), "mac_mini.png")
  for (const [k, v] of Object.entries(fields)) form.append(k, typeof v === "string" ? v : JSON.stringify(v))
  const res = await fetch(`${BASE}/api/fractera/object-test`, { body: form, headers: { "x-data-secret": KEY }, method: "POST" })
  return { body: await res.json().catch(() => ({})), status: res.status }
}

const FULL =
  "Рекламное фото компьютера Apple Mac mini M4 на белом фоне, вид спереди. Корпус серебристый алюминиевый, " +
  "углы скруглены, слева два порта USB-C, справа разъём 3,5 мм, белый индикатор питания, снизу чёрная решётка."
const SUMMARY =
  "Изображение Mac mini M4 спереди на белом фоне: серебристый корпус, два порта USB-C, разъём для наушников и индикатор питания. Проба прибора 194-4."

console.log("===PROBE_SAVE===")
say(Boolean(KEY), "секрет машины найден")
const mediaBefore = await mediaIds()

// ── положительный случай ────────────────────────────────────────────────────
const ok = await save({
  about: SUMMARY, anchors: ["Apple", "Mac mini"], described_by: "probe", describe_ms: "0", full: FULL,
  language: "und", tags: ["mac mini", "apple"], title: "Mac mini M4 спереди", who: WHO,
})
console.log(`сохранение: ${ok.status} ${JSON.stringify(ok.body).slice(0, 220)}`)
const id = ok.body.messageId
const row = id ? (await sql(`SELECT id, status, kind, title, summary, object_id, vector_id, rag_source, full_chars, who FROM messages_that_came_into_memory WHERE id = ?`, [id])).rows?.[0] : null
say(ok.status === 200 && Boolean(row), `строка таблицы есть: ${JSON.stringify(row)}`)
if (row) {
  say(row.status === "saved" && row.kind === "image", `status=${row.status}, kind=${row.kind}`)
  say(row.summary === SUMMARY && row.full_chars === FULL.length, `саммари в строке, full_chars=${row.full_chars} (${FULL.length})`)
  const media = (await (await fetch(`${DATA}/media`, { headers: { "X-Data-Secret": KEY } })).json()).items?.find((m) => String(m.id) === String(row.object_id))
  say(Boolean(media) && media.description === FULL, `полное описание лежит рядом с файлом в медиатеке (${String(media?.description ?? "").length} знаков)`)
  const vec = await sql(`SELECT id, ref_id FROM vectors WHERE id = ?`, [row.vector_id])
  say(vec.rows?.[0]?.ref_id === String(row.object_id), `карточка вектора ${row.vector_id} ссылается на объект`)
  say((await graphPaths()).some((p) => p.startsWith(row.rag_source)), `документ графа ${row.rag_source} принят`)
}

// ── негатив: граф отказывает — откат ────────────────────────────────────────
const mediaMid = await mediaIds()
const bad = await save({ about: SUMMARY, anchors: ["   "], full: FULL, title: "проба отката", who: WHO })
console.log(`негатив: ${bad.status} ${JSON.stringify(bad.body).slice(0, 220)}`)
say(bad.status >= 400 && bad.body.ok === false, "сохранение с пустыми якорями отвергнуто")
const mediaAfterBad = await mediaIds()
say([...mediaAfterBad].filter((x) => !mediaMid.has(x)).length === 0, "файл отката не остался в медиатеке")
const failedRow = (await sql(`SELECT status, error, object_id FROM messages_that_came_into_memory WHERE who = ? AND title = ?`, [WHO, "проба отката"])).rows?.[0]
say(failedRow?.status === "failed" && !failedRow?.object_id, `строка отката: ${JSON.stringify(failedRow)}`)

// ── уборка по метке ─────────────────────────────────────────────────────────
const mine = (await sql(`SELECT object_id, vector_id, rag_source FROM messages_that_came_into_memory WHERE who = ?`, [WHO])).rows ?? []
for (const m of mine) {
  if (m.object_id) await fetch(`${DATA}/media/${m.object_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
  if (m.vector_id) await fetch(`${DATA}/vectors/${m.vector_id}`, { headers: { "X-Data-Secret": KEY }, method: "DELETE" })
}
const docs = Object.values((await (await fetch(`${DATA}/service/rag/documents`, { headers: { "X-Data-Secret": KEY } })).json()).statuses ?? {})
  .flat()
  .filter((d) => mine.some((m) => m.rag_source && String(d.file_path ?? "").startsWith(m.rag_source)))
  .map((d) => String(d.id))
if (docs.length) {
  await fetch(`${DATA}/service/rag/documents/delete_document`, { body: JSON.stringify({ delete_file: false, doc_ids: docs }), headers: H, method: "DELETE" })
}
await sql(`DELETE FROM messages_that_came_into_memory WHERE who = ?`, [WHO])
const mediaEnd = await mediaIds()
say([...mediaEnd].filter((x) => !mediaBefore.has(x)).length === 0, `медиатека вернулась к составу до прогона (${mediaBefore.size} → ${mediaEnd.size})`)
say(((await sql(`SELECT COUNT(*) AS n FROM messages_that_came_into_memory WHERE who = ?`, [WHO])).rows?.[0]?.n ?? -1) === 0, "строки probe-194 убраны")
console.log(`документов графа к удалению: ${docs.length} (удаление фоновое)`)

console.log(failed ? `\n✗ ПРОВАЛ: ${failed}` : "\n✓ OK")
console.log("===PROBE_SAVE_END===")

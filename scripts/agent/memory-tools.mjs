#!/usr/bin/env node
//
// ИНСТРУМЕНТЫ АГЕНТА ПАМЯТИ — MCP-сервер по stdio.
//
// 🔒 ЭТО ВНУТРЕННОСТИ ЯЩИКА, А НЕ ЕГО ДОГОВОР. Наружу память показывает три
// метода (`remember`, `recall`, `people`); здесь — то, чем работает её
// собственный агент. Смешать одно с другим значило бы вывести устройство наружу.
//
// 🔒 БЕЗ ЕДИНОЙ ЗАВИСИМОСТИ. MCP по stdio — построчный JSON-RPC; трёх методов
// (`initialize`, `tools/list`, `tools/call`) достаточно. Пакет ради пяти
// инструментов — ещё один способ не запуститься на чистой машине.
//
// 🛑 СЧЁТЧИК ЖИВЫХ ВЫЗОВОВ ОБЯЗАТЕЛЕН И ПОДНИМАЕТСЯ ДО ПЕРВОГО `await`.
// ✗ Оплачено дважды за один час 2026-09-09 в соседнем MCP-сервере: обработчик
// стал асинхронным, счётчик остался под другой веткой — и ответы терялись по
// закрытию stdin молча, без ошибки и без строки в журнале.

import { readFileSync } from "node:fs"
import { addColumn, columnsOfChecked, ensureRoot, REQUIRED_COLUMNS, rowOf, sql } from "../../lib/store.mjs"
import { BASIS_SUFFIX, CLAIM_SUFFIX } from "../../lib/store.mjs"
import { ROOT, ROOT_HISTORY, normalizeName } from "../../lib/naming.mjs"
import { appendToTable, promote, tableExists, tableForKind, valuesFromTable } from "../../lib/promote.mjs"

const BOOKKEEPING = new Set(["id", "who", "created_at"])
const isPair = (c) => c.endsWith(CLAIM_SUFFIX) || c.endsWith(BASIS_SUFFIX)

let inFlight = 0
let stdinClosed = false
const maybeExit = () => { if (stdinClosed && inFlight === 0) process.exit(0) }

const send = (m) => process.stdout.write(`${JSON.stringify(m)}\n`)
const ok = (id, result) => send({ id, jsonrpc: "2.0", result })
const fail = (id, message) => send({ error: { code: -32000, message }, id, jsonrpc: "2.0" })
const text = (s) => ({ content: [{ text: String(s), type: "text" }] })

// ── ОБЪЯВЛЕНИЕ ИНСТРУМЕНТОВ ──────────────────────────────────────────────────
//
// 🔒 ОПИСАНИЕ ГОВОРИТ, КОГДА ЗВАТЬ, А НЕ ЧТО ЭТО ТАКОЕ. Описание читается
// агентом В МОМЕНТ РЕШЕНИЯ, инструкция — в начале сессии; первое сильнее.
const TOOLS = [
  {
    description:
      "ПЕРВЫМ ДЕЛОМ на каждую фразу: что о человеке уже известно и какие рода значений заведены. " +
      "Без этого ты заведёшь второе место под то же понятие, и они разойдутся навсегда.",
    inputSchema: {
      properties: { who: { description: "Ключ человека — приходит вместе с фразой", type: "string" } },
      required: ["who"],
      type: "object",
    },
    name: "what_i_already_know",
  },
  {
    description:
      "Записать значение в СУЩЕСТВУЮЩИЙ род. Если у рода уже есть другое значение и человек его " +
      "ИСПРАВЛЯЕТ — зови это; прежнее уйдёт в историю. Если ДОБАВЛЯЕТ ещё одно — зови promote_to_list.",
    inputSchema: {
      properties: {
        basis: { description: "Если вывел сам — из чего. Для выведенного ОБЯЗАТЕЛЬНО", type: "string" },
        claim: { description: "said — сказал прямо; guess — ты вывел", type: "string" },
        kind: { description: "Имя рода, буква в букву из what_i_already_know", type: "string" },
        value: { description: "Значение словами человека, кратко", type: "string" },
        who: { description: "Ключ человека", type: "string" },
      },
      required: ["kind", "value", "who"],
      type: "object",
    },
    name: "write_value",
  },
  {
    description:
      "Завести НОВЫЙ род значения и сразу положить в него значение. Только когда в " +
      "what_i_already_know ничего подходящего нет. Имя вечное: английские слова, НЕ МЕНЬШЕ ЧЕТЫРЁХ, " +
      "фраза, а не ярлык.",
    inputSchema: {
      properties: {
        basis: { description: "Если вывел сам — из чего", type: "string" },
        claim: { description: "said или guess", type: "string" },
        kind: { description: "Новое имя рода: фраза из четырёх слов и больше", type: "string" },
        value: { description: "Значение словами человека", type: "string" },
        who: { description: "Ключ человека", type: "string" },
      },
      required: ["kind", "value", "who"],
      type: "object",
    },
    name: "make_new_kind",
  },
  {
    description:
      "Человек ДОБАВИЛ ещё одно значение к тому же роду («ещё друг Дима», «и Аня»). Поле перестаёт " +
      "быть подходящей формой: рождается список, прежнее значение переезжает в него первой строкой " +
      "со своим временем. Зови и тогда, когда список уже есть — просто добавит строку.",
    inputSchema: {
      properties: {
        basis: { description: "Если вывел сам — из чего", type: "string" },
        claim: { description: "said или guess", type: "string" },
        kind: { description: "Имя рода", type: "string" },
        value: { description: "Новое значение", type: "string" },
        who: { description: "Ключ человека", type: "string" },
        words: { description: "Фраза человека как есть — попадёт в историю", type: "string" },
      },
      required: ["kind", "value", "who"],
      type: "object",
    },
    name: "promote_to_list",
  },
  {
    description:
      "ПОСЛЕДНИМ и ВСЕГДА, даже если не записал ничего. Скажи, что сделал и чего НЕ сделал. " +
      "Наружу уходит только это. Промолчав, ты оставишь впечатление, что записано всё.",
    inputSchema: {
      properties: {
        heard: {
          description: "ВСЁ, что ты услышал во фразе, по пунктам — с судьбой каждого: записал, не записал и почему, не понял",
          items: { type: "string" },
          type: "array",
        },
        said: { description: "Одной фразой для человека: что запомнено", type: "string" },
      },
      required: ["said", "heard"],
      type: "object",
    },
    name: "answer",
  },
]

// ── ИСПОЛНИТЕЛИ ──────────────────────────────────────────────────────────────

async function whatIKnow({ who }) {
  await ensureRoot()
  const row = await rowOf(who)
  const cols = await columnsOfChecked(ROOT)
  if (!cols.ok) return "Не удалось прочитать, что уже заведено: " + cols.error

  const lines = []
  for (const c of cols.columns) {
    if (BOOKKEEPING.has(c) || isPair(c)) continue
    const asList = await tableExists(tableForKind(c))
    if (asList) {
      const rows = await valuesFromTable({ table: tableForKind(c), who })
      lines.push(`- ${c} — СПИСОК, в нём: ${rows.map((r) => r.value).join(", ") || "пока пусто"}`)
      continue
    }
    const v = row ? row[c] : null
    lines.push(`- ${c}${v ? ` = ${v}` : " (пока пусто)"}${REQUIRED_COLUMNS[c] ? ` — ${REQUIRED_COLUMNS[c]}` : ""}`)
  }
  return lines.length
    ? "Уже заведено у этого человека:\n" + lines.join("\n")
    : "О человеке не заведено ещё ничего."
}

/** Проверка рода значения — общая для записи и заведения. */
function checkClaim(claim, basis) {
  const c = claim === "said" || claim === "guess" ? claim : ""
  const b = typeof basis === "string" ? basis.trim() : ""
  // 🛑 ДОГАДКА БЕЗ ОСНОВАНИЯ ОТБРАСЫВАЕТСЯ ЦЕЛИКОМ, а не записывается наполовину.
  if (c === "guess" && !b) return { error: "догадка без основания: скажи, из чего вывел", ok: false }
  return { basis: b, claim: c, ok: true }
}

async function writeValue({ basis, claim, kind, value, who }) {
  await ensureRoot()
  const k = normalizeName(kind)
  if (!k) return `Имя рода не годится: «${kind}»`
  const cl = checkClaim(claim, basis)
  if (!cl.ok) return cl.error

  const cols = await columnsOfChecked(ROOT)
  if (!cols.ok) return "Не удалось прочитать, что уже заведено"
  if (!cols.columns.includes(k)) return `Рода «${k}» ещё нет — заведи его через make_new_kind`

  await rowOf(who)
  const cur = await sql(`SELECT ${k} AS v FROM ${ROOT} WHERE who = ?`, [who])
  const was = cur.ok && cur.rows.length ? cur.rows[0].v : null
  if (was === value) return `Это уже записано: ${k} = ${value}`

  await sql(
    `UPDATE ${ROOT} SET ${k} = ?, ${k}${CLAIM_SUFFIX} = ?, ${k}${BASIS_SUFFIX} = ? WHERE who = ?`,
    [value, cl.claim || null, cl.basis || null, who],
  )
  if (was) {
    await sql(
      `INSERT INTO ${ROOT_HISTORY} (who, what_changed, was, became, his_words) VALUES (?, ?, ?, ?, ?)`,
      [who, k, was, value, ""],
    )
    return `Было «${was}», стало «${value}» — прежнее сохранено в истории.`
  }
  return `Записано: ${k} = ${value}`
}

async function makeNewKind({ basis, claim, kind, value, who }) {
  await ensureRoot()
  const k = normalizeName(kind)
  if (!k) return `Имя рода не годится: «${kind}»`
  // 🔒 ЧЕТЫРЕ СЛОВА ПРОВЕРЯЕТ КОД, А НЕ ТОЛЬКО ПРОСЬБА В ИНСТРУКЦИИ.
  // ✗ Оплачено: правило стояло словами, и модель завела `friend_name`, в который
  // потом лёг кот. Правило без проверки исполняется настолько, насколько его
  // помнят в этот ход.
  if (k.split("_").length < 4) {
    return `Имя «${k}» — ярлык, а не фраза: нужно не меньше четырёх слов, и в имени сказано, чьё это и что это. Плохое имя притягивает не своё.`
  }
  const cl = checkClaim(claim, basis)
  if (!cl.ok) return cl.error

  const made = await addColumn(ROOT, k)
  if (!made.ok) return `Не удалось завести «${k}»: ${made.error}`
  await rowOf(who)
  await sql(
    `UPDATE ${ROOT} SET ${k} = ?, ${k}${CLAIM_SUFFIX} = ?, ${k}${BASIS_SUFFIX} = ? WHERE who = ?`,
    [value, cl.claim || null, cl.basis || null, who],
  )
  return `Заведён новый род «${k}» и записано: ${value}`
}

async function promoteToList({ basis, claim, kind, value, who, words }) {
  await ensureRoot()
  const k = normalizeName(kind)
  if (!k) return `Имя рода не годится: «${kind}»`
  const cl = checkClaim(claim, basis)
  if (!cl.ok) return cl.error

  const table = tableForKind(k)
  if (await tableExists(table)) {
    const put = await appendToTable({ basis: cl.basis, claim: cl.claim, kind: k, value, who })
    if (!put.ok) return `Не удалось добавить: ${put.error}`
    return put.already ? `Это уже есть в списке «${k}»: ${value}` : `Добавлено в список «${k}»: ${value}`
  }

  const up = await promote({ basis: cl.basis, claim: cl.claim, kind: k, newValue: value, who, words })
  if (!up.ok) {
    if (up.error === "nothing-to-promote") {
      return `У рода «${k}» пока нет первого значения — запиши его через write_value или make_new_kind.`
    }
    return `Не удалось завести список: ${up.error}`
  }
  return `Теперь «${k}» — список: в нём «${up.moved}» и «${up.added}». Первое переехало со своим временем.`
}

/** Ответ наружу. Ничего не пишет — только собирает то, что уйдёт из ящика. */
function answer({ heard, said }) {
  const lines = Array.isArray(heard) ? heard : []
  return JSON.stringify({ heard: lines, said: String(said ?? "") })
}

const RUN = {
  answer,
  make_new_kind: makeNewKind,
  promote_to_list: promoteToList,
  what_i_already_know: whatIKnow,
  write_value: writeValue,
}

// ── ПРОТОКОЛ ─────────────────────────────────────────────────────────────────

async function handle(m) {
  if (m.id === undefined || m.id === null) return
  if (m.method === "initialize") {
    return ok(m.id, {
      capabilities: { tools: {} },
      protocolVersion: m.params?.protocolVersion || "2024-11-05",
      serverInfo: { name: "memory-tools", version: "1.0.0" },
    })
  }
  if (m.method === "tools/list") return ok(m.id, { tools: TOOLS })
  if (m.method === "tools/call") {
    const p = m.params || {}
    const run = RUN[p.name]
    if (!run) return fail(m.id, `unknown tool: ${p.name}`)
    inFlight += 1
    try {
      return ok(m.id, text(await run(p.arguments || {})))
    } catch (e) {
      // 🛑 ОТКАЗ НАЗЫВАЕТСЯ ОТКАЗОМ, А НЕ ПАДАЕТ МОЛЧА.
      return ok(m.id, text("Внутри памяти сломалось: " + String(e.message).slice(0, 200)))
    } finally {
      inFlight -= 1
      maybeExit()
    }
  }
  return fail(m.id, `unknown method: ${m.method}`)
}

let buf = ""
process.stdin.setEncoding("utf8")
process.stdin.on("data", (chunk) => {
  buf += chunk
  let i
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim()
    buf = buf.slice(i + 1)
    if (!line) continue
    try {
      handle(JSON.parse(line))
    } catch {
      // Кривая строка — не повод падать: следующая может быть годной.
    }
  }
})
process.stdin.on("end", () => { stdinClosed = true; maybeExit() })

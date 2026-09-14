#!/usr/bin/env node
//
// ПРИБОР 200-7 — МАТРИЦА «ОРГАН × ГЛАГОЛ» И ДИАЛОГ «СКАЗАЛ → СПРОСИЛ → НАШЁЛ» ЧЕРЕЗ ПУБЛИЧНЫЙ API.
//
// 🔒 ЗОВЁТ КАК ВНЕШНЯЯ ПРОГРАММА: публичный адрес, ключ памяти, `/v1/remember` и `/v1/recall`. Путь «экран → дверь стенда → /v1» доказан в
// 200-1…200-6; соответствие органа телу запроса — прибором `bench-call` (54/54). Здесь проверяется, что делает с запросом сама память.
// 🔒 ОТДЕЛЬНЫЙ ЧЕЛОВЕК `probe-200-7`: данные архитектора у `bench-1` и в Telegram не трогаются.
// 🔒 ЗАКОН ПЯТЫЙ (`LAWS.md`): у каждой строки — ЧЕМ ДОСТАЛИ и ОЦЕНКА по трём ступеням: правильно · неправильно · абсолютно неправильно.
//
// 🛑 ЦЕНА НАЗВАНА ДО ПРОГОНА: ~14 ходов модели по подписке сервера (общей с ботом), 1 единица квоты YouTube, 1 страница ИИ-браузером, ~8 встраиваний.
// 🛑 ЧТО ПРИБОР УДАЛЯЕТ И ЧЬЁ ЭТО: только объекты, положенные этим прогоном (id из ответов). Факты человека `probe-200-7`, строки таблицы
// сообщений и документы графа остаются — называются в конце.

import { readFileSync, writeFileSync } from "node:fs"
import { getMessageByObject } from "../../lib/messages.mjs"
import { OUTPUTS } from "../../lib/output-schema.mjs"
import { machineEnv } from "../../lib/store.mjs"

const BASE = process.env.MEMORY_PUBLIC_URL ?? "https://memory.aifa.dev"
const KEY = readFileSync(process.env.MEMORY_API_KEY_FILE ?? "/etc/fractera/memory-api-key", "utf8").trim()
const SECRET = process.env.DATA_SECRET || machineEnv("DATA_SECRET")
const WHO = "probe-200-7"
const OUT = process.env.MATRIX_OUT ?? "/tmp/bench-matrix-200-7.json"

const OK = "правильно"
const BAD = "неправильно"
const WORST = "абсолютно неправильно"

const rows = []
const created = []

async function post(verb, body, form) {
  const started = Date.now()
  const init = form
    ? { body: form, headers: { "x-memory-key": KEY }, method: "POST" }
    : { body: JSON.stringify(body), headers: { "content-type": "application/json", "x-memory-key": KEY }, method: "POST" }
  const r = await fetch(`${BASE}/v1/${verb}`, init)
  const json = await r.json().catch(() => ({ raw: "not json" }))
  return { json, ms: Date.now() - started, status: r.status }
}

const fits = (verb, json) => OUTPUTS[verb].safeParse(json).success
const fate = (json, name) => (json?.params ?? []).find((p) => p.name === name)?.state ?? null
const lower = (v) => String(v ?? "").toLowerCase()
const knownHas = (json, needle) => (json?.known ?? []).some((k) => lower(k.value).includes(lower(needle)))
const notedHas = (json, needle) => (json?.noted ?? []).some((n) => lower(n.became ?? n.added ?? n.value).includes(lower(needle)))

function record(row) {
  const line = `${row.verdict === OK ? "✓" : row.verdict === BAD ? "≈" : "✗"} ${row.id.padEnd(4)} ${row.verb.padEnd(8)} ${row.organ.padEnd(22)} ${String(row.status).padEnd(3)} ${String(row.ms).padStart(6)} мс · ${row.means} · ${row.verdict} · схема ${row.schema ? "да" : "НЕТ"} · ${row.note}`
  console.log(line)
  rows.push(row)
}

function trackCreated(json) {
  for (const o of json?.objects ?? []) if (o.ok && !o.existing && o.id) created.push(o.id)
}

async function saying(id, organ, body, judge, means) {
  const r = await post("remember", { lang: "ru", who: WHO, ...body })
  trackCreated(r.json)
  const [verdict, note] = judge(r)
  record({ id, verb: "remember", organ, status: r.status, ms: r.ms, means, verdict, note, schema: fits("remember", r.json), sent: body, answer: r.json })
  return r
}

async function asking(id, organ, body, judge, means) {
  const r = await post("recall", { lang: "ru", who: WHO, ...body })
  const [verdict, note] = judge(r)
  const factsMeans = r.json?.used_model ? "факты: ход модели" : "факты: SQL без ИИ"
  const objMeans = body.text ? " · объекты: встраивание" : ""
  record({ id, verb: "recall", organ, status: r.status, ms: r.ms, means: means ?? `${factsMeans}${objMeans}`, verdict, note, schema: fits("recall", r.json), sent: body, answer: r.json })
  return r
}

console.log("=".repeat(96))
console.log(`ПРИБОР 200-7 — ${BASE} · человек ${WHO} · ${new Date().toISOString()}`)
console.log("=".repeat(96))

// ── «СКАЗАТЬ»: ОРГАНЫ ──────────────────────────────────────────────────────────────────────────
const r1 = await saying("R1", "фраза", { text: "Меня зовут Проба Тестовый, я живу в городе Толедо." },
  (r) => r.status === 200 && notedHas(r.json, "толедо") ? [OK, "Толедо записан"] : r.status === 200 ? [BAD, `noted: ${JSON.stringify(r.json?.noted ?? []).slice(0, 120)}`] : [WORST, r.json?.error ?? "отказ"],
  "разбор фразы: ход модели")

// Диалог 1: сказал → спросил
await asking("D1", "диалог: факт", { text: "где я живу?" },
  (r) => knownHas(r.json, "толедо") ? [OK, "Толедо найден"] : r.status === 200 ? [BAD, "Толедо не найден в known"] : [WORST, r.json?.error ?? "отказ"])

await saying("R2", "scope (охват)", { scope: [{ at: "2026-09-14", place: "Мадрид" }], text: "Сегодня у меня была встреча с Сергеем." },
  (r) => fate(r.json, "scope") === "accepted" ? [OK, "scope accepted"] : [BAD, `scope: ${fate(r.json, "scope")}`], "разбор фразы: ход модели")
await saying("R3", "need_table", { need_table: true, text: "Мой любимый цвет — синий." },
  (r) => fate(r.json, "need_table") === "accepted" ? [OK, "need_table accepted"] : [BAD, `need_table: ${fate(r.json, "need_table")}`], "разбор фразы: ход модели")
const thread = typeof r1.json?.thread === "string" ? r1.json.thread : null
await saying("R4", "thread (нить)", { ...(thread ? { thread } : {}), text: "И ещё: я работаю архитектором." },
  (r) => !thread ? [BAD, "у R1 не было нити — продолжать нечего"] : fate(r.json, "thread") === "accepted" ? [OK, "thread accepted"] : [BAD, `thread: ${fate(r.json, "thread")}`], "разбор фразы: ход модели в нити")
await saying("R5", "deny + thread", { deny: "это неверно: я живу не в Толедо, а в Севилье", ...(thread ? { thread } : {}), text: "Поправка о городе." },
  (r) => !thread ? [BAD, "без нити"] : fate(r.json, "deny") === "accepted" ? [OK, "deny accepted в нити"] : [BAD, `deny: ${fate(r.json, "deny")}`], "разбор фразы: ход модели в нити")

// Диалог 1б: опровержение
await asking("D1b", "диалог: опровержение", { text: "в каком городе я живу?" },
  (r) => knownHas(r.json, "севиль") ? [OK, "Севилья после опровержения"] : knownHas(r.json, "толедо") ? [BAD, "осталось Толедо — опровержение не легло"] : [WORST, "города нет вовсе"])

await saying("R6", "deny без нити (негатив)", { deny: "это неверно", text: "Поправка без нити." },
  (r) => fate(r.json, "deny") === "not_supported" ? [OK, "deny назван not_supported: без нити опровергать нечего"] : [BAD, `deny: ${fate(r.json, "deny")}`], "разбор фразы: ход модели")
await saying("R7", "media (адрес файла)", { media: [{ url: "https://www.rfc-editor.org/rfc/rfc2606.txt" }], text: "Сохрани этот документ о зарезервированных доменах." },
  (r) => (r.json?.objects ?? []).some((o) => o.ok && o.id) ? [OK, "файл по адресу лёг"] : [BAD, JSON.stringify(r.json?.objects ?? []).slice(0, 140)], "скачивание + описание: ход модели")
await saying("R8", "links (страница)", { links: ["https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404"], text: "Сохрани страницу про ошибку 404." },
  (r) => (r.json?.objects ?? []).some((o) => o.ok) ? [OK, "страница легла"] : [BAD, JSON.stringify(r.json?.objects ?? []).slice(0, 140)], "ИИ-браузер + описание: ход модели")
const r9 = await saying("R9", "youtube (ролик)", { text: "Сохрани клип Рика Эстли.", youtube: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"] },
  (r) => (r.json?.objects ?? []).some((o) => o.ok) ? [OK, "ролик лёг"] : [BAD, JSON.stringify(r.json?.objects ?? []).slice(0, 140)], "YouTube Data API + описание: ход модели")

// «Сказать» с файлом — форма
{
  const form = new FormData()
  form.append("payload", JSON.stringify({ lang: "ru", text: "Сохрани инструкцию по уходу за кактусом.", who: WHO }))
  form.append("files", new Blob(["# Уход за кактусом Эхинопсис\n\nПоливать раз в три недели. Зимой не поливать совсем. Ставить на южное окно."], { type: "text/markdown" }), "kaktus-ekhinopsis-200-7.md")
  const r = await post("remember", null, form)
  trackCreated(r.json)
  const ok = (r.json?.objects ?? []).some((o) => o.ok && o.id && o.name === "kaktus-ekhinopsis-200-7.md")
  record({ id: "R10", verb: "remember", organ: "files (форма)", status: r.status, ms: r.ms, means: "описание файла: ход модели", verdict: ok ? OK : BAD, note: ok ? "файл лёг" : JSON.stringify(r.json?.objects ?? []).slice(0, 140), schema: fits("remember", r.json), sent: { files: ["kaktus-ekhinopsis-200-7.md"] }, answer: r.json })
}

await saying("R11", "без text (негатив)", { text: undefined },
  (r) => r.status === 400 && r.json?.error === "missing-params" ? [OK, "400 missing-params"] : [WORST, `код ${r.status}`], "проверка договора без ИИ")
await saying("R12", "ролик в links (негатив)", { links: ["https://www.youtube.com/watch?v=jNQXAC9IVRw"], text: "Проверка рода ссылки." },
  (r) => (r.json?.objects ?? [])[0]?.error === "link-is-youtube" ? [OK, "link-is-youtube"] : [WORST, JSON.stringify(r.json?.objects ?? []).slice(0, 120)], "проверка рода без ИИ + разбор фразы: ход модели")
await saying("R13", "страница в youtube (негатив)", { text: "Проверка рода ссылки два.", youtube: ["https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/200"] },
  (r) => (r.json?.objects ?? [])[0]?.error === "youtube-not-youtube" ? [OK, "youtube-not-youtube"] : [WORST, JSON.stringify(r.json?.objects ?? []).slice(0, 120)], "проверка рода без ИИ + разбор фразы: ход модели")
await saying("R14", "scope не той формы (негатив)", { scope: "Мадрид", text: "Проверка формы охвата." },
  (r) => fate(r.json, "scope") === "bad_form" ? [OK, "scope bad_form"] : [BAD, `scope: ${fate(r.json, "scope")}`], "проверка формы без ИИ + разбор фразы: ход модели")

// ── «СПРОСИТЬ»: ОРГАНЫ ─────────────────────────────────────────────────────────────────────────
await asking("Q1", "без вопроса", {},
  (r) => r.status === 200 && (r.json?.known ?? []).length > 0 && r.json?.used_model === false ? [OK, `known ${(r.json?.known ?? []).length}, без модели`] : [BAD, `known ${(r.json?.known ?? []).length}, used_model ${r.json?.used_model}`])
await asking("Q2", "depth deep", { depth: "deep", text: "кем я работаю?" },
  (r) => fate(r.json, "depth") === "accepted" ? (knownHas(r.json, "архитект") ? [OK, `depth accepted, depth_used ${r.json?.depth_used}, профессия найдена`] : [BAD, `depth accepted, профессия не найдена`]) : [BAD, `depth: ${fate(r.json, "depth")}`])
await asking("Q3", "want_chain", { text: "мой любимый цвет", want_chain: true },
  (r) => Array.isArray(r.json?.chain) && r.json.chain.length > 0 ? (knownHas(r.json, "син") ? [OK, `chain ${r.json.chain.length} шагов, цвет найден`] : [BAD, "chain есть, цвет не найден"]) : [BAD, "chain нет"])
await asking("Q4", "history", { history: "до этого мы говорили о переезде", text: "куда я переехал?" },
  (r) => fate(r.json, "history") === "accepted" ? [OK, "history accepted"] : [BAD, `history: ${fate(r.json, "history")}`])
await asking("Q5", "prior", { prior: "уже нашли: имя Проба", text: "как меня зовут?" },
  (r) => fate(r.json, "prior") === "accepted" ? (knownHas(r.json, "проба") ? [OK, "prior accepted, имя найдено"] : [BAD, "prior accepted, имя не найдено"]) : [BAD, `prior: ${fate(r.json, "prior")}`])
await asking("Q6", "scope", { scope: [{ place: "Мадрид" }], text: "с кем я встречался?" },
  (r) => fate(r.json, "scope") === "accepted" ? (knownHas(r.json, "серге") ? [OK, "scope accepted, Сергей найден"] : [BAD, "scope accepted, Сергей не найден"]) : [BAD, `scope: ${fate(r.json, "scope")}`])
await asking("Q7", "без who (негатив)", { who: undefined },
  (r) => r.status === 400 && r.json?.error === "missing-params" ? [OK, "400 missing-params"] : [WORST, `код ${r.status}`], "проверка договора без ИИ")
await asking("Q8", "depth не той формы (негатив)", { depth: "ultra", text: "где я живу?" },
  (r) => fate(r.json, "depth") === "bad_form" ? [OK, "depth bad_form"] : [BAD, `depth: ${fate(r.json, "depth")}`])

// ── ДИАЛОГ: ОБЪЕКТЫ И «НЕ ЗНАЮ» ────────────────────────────────────────────────────────────────
const cactusId = rows.find((x) => x.id === "R10")?.answer?.objects?.find((o) => o.ok && o.id)?.id ?? null
await asking("D2", "диалог: документ", { text: "как поливать кактус?" },
  (r) => (r.json?.objects ?? []).some((o) => o.id === cactusId) ? [OK, "документ о кактусе найден по id"] : [BAD, `id ${cactusId} нет; найдено: ${(r.json?.objects ?? []).map((o) => o.title).join(" | ").slice(0, 120)}`])
const videoRow = (r9.json?.objects ?? []).find((o) => o.ok)
const videoMessage = videoRow?.messageId ?? null
await asking("D3", "диалог: ролик", { text: "о чём клип Рика Эстли Never Gonna Give You Up?" },
  (r) => (r.json?.objects ?? []).some((o) => o.messageId === videoMessage) ? [OK, "ролик найден"] : [BAD, `messageId ${videoMessage} нет; найдено: ${(r.json?.objects ?? []).map((o) => o.title).join(" | ").slice(0, 120)}`])
await asking("D4", "диалог: «не знаю» (негатив)", { text: "какая порода у моей собаки?" },
  (r) => {
    const invented = (r.json?.known ?? []).some((k) => /собак|пород|dog/i.test(`${k.what} ${k.value}`))
    if (invented) return [WORST, "выдуман факт о собаке"]
    return (r.json?.objects ?? []).length ? [BAD, `фактов не выдумал, но пришли объекты: ${(r.json.objects).map((o) => o.title).join(" | ").slice(0, 120)}`] : [OK, "честно: ни факта, ни объекта"]
  })

// Чужой объект: чей объект пришёл
{
  const r = await post("recall", { lang: "ru", text: "скан паспорта", who: WHO })
  const foreign = []
  for (const o of r.json?.objects ?? []) {
    const row = o.id ? await getMessageByObject(o.id) : null
    if (row && row.who !== WHO) foreign.push(`${o.title} (who ${row.who})`)
  }
  record({ id: "D5", verb: "recall", organ: "чужой объект (негатив)", status: r.status, ms: r.ms, means: "объекты: встраивание, без фильтра who", verdict: foreign.length ? BAD : OK, note: foreign.length ? `пришли объекты других who: ${foreign.join(" | ").slice(0, 160)}` : "чужих объектов нет", schema: fits("recall", r.json), sent: { text: "скан паспорта" }, answer: r.json })
}

// ── УБОРКА ─────────────────────────────────────────────────────────────────────────────────────
let cleanup = "нечего снимать"
if (created.length && SECRET) {
  const r = await fetch("http://127.0.0.1:3700/api/fractera/object-test", {
    body: JSON.stringify({ ids: created }),
    headers: { "content-type": "application/json", "x-data-secret": SECRET },
    method: "DELETE",
  })
  const j = await r.json().catch(() => ({}))
  cleanup = `снято объектов ${j.removed ?? "?"} из ${created.length}, чужих ${JSON.stringify(j.refused ?? [])}`
}

const count = (v) => rows.filter((x) => x.verdict === v).length
const summary = { at: new Date().toISOString(), base: BASE, cleanup, rows: rows.length, verdicts: { [OK]: count(OK), [BAD]: count(BAD), [WORST]: count(WORST) }, schema_fail: rows.filter((x) => !x.schema).map((x) => x.id), who: WHO }
writeFileSync(OUT, JSON.stringify({ rows: rows.map(({ answer, ...rest }) => ({ ...rest, answer_text: answer?.text ?? null, answer_error: answer?.error ?? null, objects: answer?.objects ?? null, params: answer?.params ?? null, depth_used: answer?.depth_used ?? null, used_model: answer?.used_model ?? null })), summary }, null, 2))
console.log("-".repeat(96))
console.log(`ИТОГО: ${JSON.stringify(summary.verdicts)} · схема не пройдена: ${summary.schema_fail.join(", ") || "нет"} · уборка: ${cleanup}`)
console.log(`остаются: факты человека ${WHO}, строки таблицы сообщений и документы графа положенного`)
console.log(`===MATRIX_DONE=== ${OUT}`)

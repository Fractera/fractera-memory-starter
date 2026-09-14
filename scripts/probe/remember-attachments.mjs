#!/usr/bin/env node
//
// ПРИБОР 200-5 — ВЛОЖЕНИЯ ВНУТРИ «СКАЗАТЬ» ЧЕРЕЗ ПУБЛИЧНЫЙ API.
//
// 🔒 ЗОВЁТ ТАК ЖЕ, КАК ВНЕШНЯЯ ПРОГРАММА: публичный адрес памяти, ключ памяти, `POST /v1/remember`. Запускается на
// сервере из `/opt/fractera/memory`: там лежат ключ памяти и секрет машины (секрет нужен только уборке).
//
// 🛑 ЦЕНА НАЗВАНА ДО ПРОГОНА: до 5 ходов модели по подписке владельца (две фразы, описания файла, страницы и ролика),
// 1 единица квоты YouTube Data API, одно открытие страницы ИИ-браузером. Уже сохранённая ссылка не описывается заново.
//
// 🛑 ЧТО ПРИБОР УДАЛЯЕТ И ЧЬЁ ЭТО: только объекты, которые положил сам этот прогон (по id из ответа), дверью
// `object-test` DELETE со списком. Ссылки, которые память уже знала (`existing`), не трогаются. Документ графа и строка
// таблицы сообщений `forget(ids)` не снимает — остаток называется в конце.

import { readFileSync } from "node:fs"
import { machineEnv } from "../../lib/store.mjs"

const BASE = process.env.MEMORY_PUBLIC_URL ?? "https://memory.aifa.dev"
const KEY = readFileSync(process.env.MEMORY_API_KEY_FILE ?? "/etc/fractera/memory-api-key", "utf8").trim()
const SECRET = process.env.DATA_SECRET || machineEnv("DATA_SECRET")
const MARK = `probe-200-5-${Date.now()}`

const PAGE = "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/200"
const VIDEO = "https://www.youtube.com/watch?v=jNQXAC9IVRw"

let bad = 0
const check = (ok, what, extra = "") => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}${extra ? "  — " + extra : ""}`)
}

async function formCall(payload, files) {
  const form = new FormData()
  form.append("payload", JSON.stringify(payload))
  for (const [name, text] of files) form.append("files", new Blob([text], { type: "text/markdown" }), name)
  const started = Date.now()
  const r = await fetch(`${BASE}/v1/remember`, { body: form, headers: { "x-memory-key": KEY }, method: "POST" })
  const json = await r.json().catch(() => ({ raw: "not json" }))
  return { json, ms: Date.now() - started, status: r.status }
}

async function jsonCall(payload) {
  const started = Date.now()
  const r = await fetch(`${BASE}/v1/remember`, {
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json", "x-memory-key": KEY },
    method: "POST",
  })
  const json = await r.json().catch(() => ({ raw: "not json" }))
  return { json, ms: Date.now() - started, status: r.status }
}

console.log("=".repeat(72))
console.log(`ПРИБОР 200-5 — вложения в «Сказать» через ${BASE}/v1/remember · метка ${MARK}`)
console.log("=".repeat(72))

// ── 1. НЕГАТИВ: форма без фразы — отказ договора, файлы не ложатся ───────────────
const noText = await formCall({ lang: "ru", who: "bench-1" }, [[`${MARK}-no-text.md`, `# ${MARK}\nне должен лечь`]])
check(noText.status === 400, "форма без text → 400", `код ${noText.status}`)
check(noText.json?.error === "missing-params" && noText.json?.missing?.includes("text"), "отказ — missing-params договора", JSON.stringify(noText.json).slice(0, 160))
check(!("objects" in (noText.json ?? {})), "файл при отказе не лёг: objects нет")

// ── 2. ПОЛНАЯ ФОРМА: файл, ссылки двух родов, по одной подмене рода в каждом поле ───
const full = await formCall(
  {
    lang: "ru",
    links: [VIDEO, PAGE],
    text: `Проверка вложений ${MARK}: фактов о человеке здесь нет.`,
    who: "bench-1",
    youtube: [PAGE, VIDEO],
  },
  [[`${MARK}.md`, `# ${MARK}\n\nКороткий документ прибора 200-5 о вложениях в «Сказать».`]],
)
console.log(`   полная форма: код ${full.status} за ${full.ms} мс`)
const objects = Array.isArray(full.json?.objects) ? full.json.objects : []
for (const o of objects) console.log(`   · ${JSON.stringify(o).slice(0, 190)}`)
check(full.status === 200, "полная форма → 200", `код ${full.status}`)
check(objects.length === 5, "судеб в objects ровно пять: файл + две ссылки + два ролика", `${objects.length}`)
const fileFate = objects.find((o) => o.name === `${MARK}.md`)
check(!!fileFate?.ok && !!fileFate?.id && Number.isFinite(fileFate?.messageId), "файл лёг: id объекта и messageId", JSON.stringify(fileFate ?? {}).slice(0, 140))
const videoInLinks = objects.find((o) => o.kind === "web" && o.url === VIDEO)
check(videoInLinks?.ok === false && videoInLinks?.error === "link-is-youtube", "НЕГАТИВ: ролик в links → link-is-youtube", JSON.stringify(videoInLinks ?? {}).slice(0, 140))
const pageInYoutube = objects.find((o) => o.kind === "youtube" && o.url === PAGE)
check(pageInYoutube?.ok === false && pageInYoutube?.error === "youtube-not-youtube", "НЕГАТИВ: страница в youtube → youtube-not-youtube", JSON.stringify(pageInYoutube ?? {}).slice(0, 140))
const page = objects.find((o) => o.kind === "web" && o.ok)
check(!!page && Number.isFinite(page.messageId), "страница в links легла или уже была (existing) — есть messageId", JSON.stringify(page ?? {}).slice(0, 140))
const video = objects.find((o) => o.kind === "youtube" && o.ok)
check(!!video && Number.isFinite(video.messageId), "ролик в youtube лёг или уже был (existing) — есть messageId", JSON.stringify(video ?? {}).slice(0, 140))
const reported = (full.json?.params ?? []).map((p) => `${p.name}:${p.state}`)
check(reported.includes("links:accepted") && reported.includes("youtube:accepted"), "params: links и youtube приняты", reported.join(", "))

// ── 3. JSON-ПУТЬ ТОЖЕ ПРОВЕРЯЕТ РОД ──────────────────────────────────────────────
const asJson = await jsonCall({ lang: "ru", links: [VIDEO], text: `Проверка JSON ${MARK}: фактов нет.`, who: "bench-1" })
const jsonFate = (asJson.json?.objects ?? [])[0]
check(asJson.status === 200 && jsonFate?.error === "link-is-youtube", "JSON: ролик в links → link-is-youtube", JSON.stringify(jsonFate ?? {}).slice(0, 140))

// ── 4. УБОРКА: только положенное этим прогоном ──────────────────────────────────
const fresh = objects.filter((o) => o.ok && !o.existing && o.id).map((o) => o.id)
if (fresh.length && SECRET) {
  const r = await fetch("http://127.0.0.1:3700/api/fractera/object-test", {
    body: JSON.stringify({ ids: fresh }),
    headers: { "content-type": "application/json", "x-data-secret": SECRET },
    method: "DELETE",
  })
  const j = await r.json().catch(() => ({}))
  console.log(`   уборка: снято ${j.removed ?? "?"} из ${fresh.length}, чужих ${JSON.stringify(j.refused ?? [])}; остаются документы графа и строки таблицы сообщений`)
} else {
  console.log(`   уборка: снимать нечего (новых id ${fresh.length}) или нет секрета машины`)
}

console.log("-".repeat(72))
if (bad === 0) {
  console.log("✓ ВСЁ ЗЕЛЁНОЕ: вложения входят в «Сказать», род ссылки проверяется в обоих полях и на обоих телах")
  process.exit(0)
}
console.log(`🛑 ПРОВАЛОВ: ${bad}`)
process.exit(1)

// ПРИБОР 205-5 — ОДНА ДВЕРЬ К ПАМЯТИ И ПОДКЛЮЧЕНИЯ ЭЛЕМЕНТОВ К ПРИЗНАКАМ.
//
// Запускается НА СЕРВЕРЕ: обе плоскости требуют живого слоя данных и живой памяти.
//   node scripts/probe/consumers-205-5.mjs
//
// 🔒 ДВЕ ПЛОСКОСТИ, НАЗВАННЫЕ В ТЗ ЗАРАНЕЕ:
//   A — одна дверь: `:3300/service/memory/v1/*` отвечает секрету машины; негатив — без секрета `401`.
//   B — данные подключений: набор пишется и читается ровно тем же; негативы — чужой ключ и чужой элемент.
//
// 🛑 ПРИБОР УБИРАЕТ ЗА СОБОЙ ПО СВОЕЙ МЕТКЕ, А НЕ ЧИСТИТ ТАБЛИЦУ. Элемент `probe` заведён в закрытом
// списке ровно для этого: живые подключения чата и панели прибор не трогает. Закон оплачен стёртой
// личной памятью владельца (шаг 160).

import { readFileSync } from "node:fs"

const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const ELEMENT = "probe"

function machineSecret() {
  if (process.env.DATA_SECRET) return process.env.DATA_SECRET
  for (const line of readFileSync("/etc/fractera/secrets.env", "utf8").split("\n")) {
    const i = line.indexOf("=")
    if (i > 0 && line.slice(0, i).trim() === "DATA_SECRET") return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
  }
  return ""
}
const SECRET = machineSecret()

let bad = 0
const say = (ok, what, detail) => {
  if (!ok) bad += 1
  console.log(`${ok ? "  ok" : "  ✗ "} ${what}${detail === undefined ? "" : ` — ${detail}`}`)
}

async function call(path, { method = "GET", body, withSecret = true } = {}) {
  const res = await fetch(`${DATA}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...(withSecret ? { "x-data-secret": SECRET } : {}) },
    method,
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* не JSON — так и скажем */ }
  return { json, status: res.status, text: text.slice(0, 200) }
}

console.log("=== A. ОДНА ДВЕРЬ ===")
const cat = await call("/service/memory/v1/features")
say(cat.status === 200, "каталог признаков через слой данных", `код ${cat.status}, признаков ${cat.json?.count ?? "?"}`)
say(Array.isArray(cat.json?.features) && cat.json.features.length > 0, "каталог непустой", `${cat.json?.features?.length ?? 0}`)
say(
  cat.json?.features?.every((f) => Array.isArray(f.consumers)),
  "у каждой записи названы подключения (поле consumers)",
)
// 🛑 НЕГАТИВ: без секрета машины дверь обязана отказать. Прибор, не доказавший этого, зелен по
// причине собственной слепоты — дверь могла бы быть открыта всему интернету.
const noKey = await call("/service/memory/v1/features", { withSecret: false })
say(noKey.status === 401, "НЕГАТИВ: без секрета машины — отказ", `код ${noKey.status}`)

console.log("=== B. ПОДКЛЮЧЕНИЯ ===")
// Берём три ЖИВЫХ ключа из самого каталога: список, написанный здесь руками, разошёлся бы с реестром.
const keys = (cat.json?.features ?? []).filter((f) => !f.retired).slice(0, 3).map((f) => f.key)
say(keys.length === 3, "взяты три живых ключа из каталога", keys.join(", "))

const put = await call("/service/memory/v1/features/consumers", { body: { by: "probe-205-5", element: ELEMENT, keys }, method: "PUT" })
say(put.status === 200 && put.json?.count === 3, "набор записан", `код ${put.status}, ${put.json?.count ?? "?"}`)

const got = await call(`/service/memory/v1/features/consumers?element=${ELEMENT}`)
const gotKeys = (got.json?.features ?? []).map((f) => f.key).sort()
say(
  got.status === 200 && JSON.stringify(gotKeys) === JSON.stringify([...keys].sort()),
  "прочитан ровно тот же набор",
  gotKeys.join(", "),
)
say(got.json?.features?.every((f) => f.connected_by === "probe-205-5" && f.since), "у подключения названы кто и когда")

const back = await call("/service/memory/v1/features")
const named = back.json?.features?.find((f) => f.key === keys[0])?.consumers ?? []
say(named.includes(ELEMENT), "каталог называет элемент у подключённого признака", named.join(", "))

// 🛑 НЕГАТИВ 1: чужой ключ (реестр чата) — отказ с причиной, а не молчаливое подключение в пустоту.
const alien = await call("/service/memory/v1/features/consumers", { body: { element: ELEMENT, keys: ["person.name"] }, method: "PUT" })
say(alien.status === 400 && alien.json?.error === "unknown-feature", "НЕГАТИВ: чужой ключ отвергнут", alien.json?.rejected?.[0]?.what_happened)

// 🛑 НЕГАТИВ 2: элемент вне закрытого списка.
const alienEl = await call("/service/memory/v1/features/consumers", { body: { element: "whatever", keys: [] }, method: "PUT" })
say(alienEl.status === 400 && alienEl.json?.error === "unknown-element", "НЕГАТИВ: элемент вне списка отвергнут", (alienEl.json?.elements ?? []).join(" · "))

// 🛑 НЕГАТИВ 3: отказ не должен был испортить уже записанное.
const still = await call(`/service/memory/v1/features/consumers?element=${ELEMENT}`)
say(still.json?.count === 3, "после отказов набор цел", `${still.json?.count ?? "?"}`)

// Уборка по своей метке.
const wipe = await call("/service/memory/v1/features/consumers", { body: { element: ELEMENT, keys: [] }, method: "PUT" })
const after = await call(`/service/memory/v1/features/consumers?element=${ELEMENT}`)
say(wipe.status === 200 && after.json?.count === 0, "прибор убрал за собой по своей метке", `${after.json?.count ?? "?"}`)

console.log(bad === 0 ? "=== ВСЁ СОШЛОСЬ ===" : `=== РАСХОЖДЕНИЙ: ${bad} ===`)
process.exit(bad === 0 ? 0 : 1)

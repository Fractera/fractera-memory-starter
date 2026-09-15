#!/usr/bin/env node
// ПРИБОР 205-3: чужой ключ не теряется; признаки принимает и чтение. Запускается НА СЕРВЕРЕ (нужен слой данных).
//
//   A — без модели: 14 ключей чата → в `nearest` ключ памяти из утверждённой переписи (205-census §7), место называется числом;
//       НЕГАТИВ — ключ памяти принят без подсказки.
//   B — живое ЧТЕНИЕ от пустого ключа прибора (ничего не пишет): `recall` с признаком → used_model false;
//       НЕГАТИВ — тот же вопрос без признака → used_model true (один вызов модели; квота названа владельцу до прогона).
//
// 🛑 ЖИВОЙ ЗАПИСИ НЕТ НАМЕРЕННО: у памяти нет двери уборки строки по метке прибора (205-2).

import { readFileSync } from "node:fs"
import { checkGiven, suggestNearest } from "../../lib/features-discover.mjs"

const MARK = "===PROBE_205_3==="
const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
function machineEnv(name) {
  try {
    for (const line of readFileSync(process.env.FRACTERA_MACHINE_ENV ?? "/etc/fractera/secrets.env", "utf8").split("\n")) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    }
  } catch { /* вне сервера файла нет */ }
  return process.env[name] ?? ""
}
const SECRET = machineEnv("DATA_SECRET")
if (!SECRET) {
  console.log(`${MARK} секрета машины нет — прибор работает только на сервере`)
  process.exit(1)
}

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}
console.log(`${MARK} start ${new Date().toISOString()}`)

// Утверждённое сопоставление (перепись §7).
const MAP = {
  "person.timezone": "person.time-zone-he-lives-in",
  "person.name": "person.name-he-is-called",
  "person.address-form": "person.how-he-wants-to-be-addressed",
  "person.tone": "person.tone-he-asks-us-to-use",
  "person.reply-length": "person.reply-length-he-prefers",
  "person.language": "person.language-he-speaks-with-us",
  "person.city": "person.city-where-he-lives-now",
  "person.occupation": "person.job-title-he-has",
  "person.active-hours": "person.work-hours-he-keeps-each-day",
  "person.currency": "person.currency-he-counts-money-in",
  "person.avoid": "person.things-he-asked-us-never-to-do",
  "person.projects": "person.projects-he-is-working-on",
  "person.important-people": "person.people-he-calls-his-friends",
  "person.nationality": "person.nationality-he-names-for-himself",
}

// ── A ────────────────────────────────────────────────────────────────────────
let first = 0
let top3 = 0
for (const [chatKey, memKey] of Object.entries(MAP)) {
  const { rejected } = checkGiven([{ key: chatKey, value: "x" }])
  const [r] = await suggestNearest(rejected)
  const rank = (r?.nearest ?? []).indexOf(memKey)
  if (rank === 0) first++
  if (rank >= 0) top3++
  console.log(`  ${rank === 0 ? "1" : rank > 0 ? String(rank + 1) : "—"} · ${chatKey} → ${(r?.nearest ?? []).join(", ")}`)
}
say(top3 === 14, `ключ памяти в подсказке (первые 3): ${top3} из 14 · первым: ${first} из 14`)
const own = checkGiven([{ key: "person.name-he-is-called", value: "Рома" }])
const ownSuggested = await suggestNearest(own.rejected)
say(own.taken.length === 1 && ownSuggested.length === 0, `НЕГАТИВ: ключ памяти принят без подсказки (taken ${own.taken.length}, отказов ${ownSuggested.length})`)

// ── B ────────────────────────────────────────────────────────────────────────
async function recall(body) {
  const res = await fetch(`${BASE}/v1/recall`, {
    body: JSON.stringify({ who: "probe-205-3", lang: "ru", ...body }),
    headers: { "Content-Type": "application/json", "x-data-secret": SECRET },
    method: "POST",
  })
  return { status: res.status, body: await res.json().catch(() => ({})) }
}
const withKey = await recall({ text: "сколько я потратил сегодня?", features: [{ key: "money.spent-on-a-purchase" }] })
say(withKey.status === 200 && withKey.body.used_model === false, `recall с признаком → ${withKey.status}, used_model ${withKey.body.used_model}`)
const withChatKey = await recall({ text: "как меня зовут?", features: [{ key: "person.name" }] })
const noted = JSON.stringify(withChatKey.body)
say(withChatKey.status === 200 && noted.includes("person.name-he-is-called"), `recall с ключом чата → ${withChatKey.status}, подсказка ключа памяти в ответе: ${noted.includes("person.name-he-is-called")}`)
const withoutKey = await recall({ text: "сколько я потратил сегодня?" })
say(withoutKey.status === 200 && withoutKey.body.used_model === true, `НЕГАТИВ: recall без признака → ${withoutKey.status}, used_model ${withoutKey.body.used_model}`)

console.log(`${MARK} ${bad ? `ПРОВАЛОВ: ${bad}` : "всё сошлось"} ${new Date().toISOString()}`)
process.exit(bad ? 1 : 0)

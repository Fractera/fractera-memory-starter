#!/usr/bin/env node
//
// ПРИБОР 175-1 — СЛУЖБА ЖИВА И ОТДЕЛЬНА.
//
// 🔒 «ЖИВА» И «ОТДЕЛЬНА» — РАЗНЫЕ УТВЕРЖДЕНИЯ, И ВТОРОЕ ГЛАВНОЕ. Живой процесс
// доказывает только себя; отдельность доказывается тем, что служба отвечает,
// когда приложение бота НЕ РАБОТАЕТ. Пока они падают вместе — отдельности нет,
// как бы аккуратно ни лежали папки.
//
// Запуск:  node scripts/probe/alive.mjs
//          MEMORY_URL=http://127.0.0.1:3700 node scripts/probe/alive.mjs

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
const MACHINE_ENV = process.env.FRACTERA_MACHINE_ENV ?? "/etc/fractera/secrets.env"

function machineEnv(name) {
  try {
    for (const line of readFileSync(MACHINE_ENV, "utf8").split("\n")) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) {
        return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
      }
    }
  } catch { /* вне сервера файла нет — законно */ }
  return ""
}

const SECRET = process.env.DATA_SECRET || machineEnv("DATA_SECRET")

let bad = 0
const say = (ok, what, extra = "") => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}${extra ? "  — " + extra : ""}`)
}

async function call(path, withSecret = true) {
  const started = Date.now()
  try {
    const res = await fetch(BASE + path, {
      headers: withSecret && SECRET ? { "x-data-secret": SECRET } : {},
    })
    // 🔒 ЧИТАЕМ ТЕЛО, А НЕ ТОЛЬКО КОД: в этом проекте уже оплачено, что чужая
    // служба отвечает `200` с `{ok:false}`.
    const body = await res.json().catch(() => null)
    return { body, ms: Date.now() - started, status: res.status }
  } catch (e) {
    return { body: null, ms: Date.now() - started, status: 0, error: String(e.message) }
  }
}

console.log("=".repeat(70))
console.log("ПРИБОР 175-1 — служба памяти: жива и отдельна")
console.log("адрес:", BASE, "· секрет:", SECRET ? "есть" : "НЕТ")
console.log("=".repeat(70))

const health = await call("/v1/health")
say(health.status === 200 && health.body?.ok === true, "health отвечает", `${health.status}, ${health.ms} мс`)
say(typeof health.body?.version === "string", "health называет версию договора", String(health.body?.version))

const c = await call("/v1/contract")
say(c.status === 200 && Array.isArray(c.body?.methods), "договор отдаётся машинно", `методов ${c.body?.methods?.length}`)

// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ ПЕРВЫЙ: без секрета закрытая дверь обязана отказать.
// Прибор, который только подтверждает, зелен по причине собственной слепоты.
const noKey = await call("/v1/contract", false)
say(noKey.status === 401, "БЕЗ СЕКРЕТА договор закрыт", `код ${noKey.status}`)

// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ ВТОРОЙ: непостроенный метод отвечает «не построено»,
// а не «такого не бывает». Разница видна тому, кто отлаживает.
const nope = await call("/v1/write")
say(nope.status === 501 && nope.body?.error === "not-built", "непостроенный метод честно говорит «не построено»", `код ${nope.status}`)

console.log("")
console.log("-".repeat(70))
if (bad === 0) {
  console.log("✓ ВСЁ ЗЕЛЁНОЕ.")
  console.log("🛑 НО ОТДЕЛЬНОСТЬ ЭТИМ НЕ ДОКАЗАНА: её доказывает только прогон")
  console.log("   при ОСТАНОВЛЕННОМ приложении бота на :3600. Это делает 175-1 отдельным замером.")
  process.exit(0)
}
console.log(`🛑 ПРОВАЛОВ: ${bad}`)
process.exit(1)

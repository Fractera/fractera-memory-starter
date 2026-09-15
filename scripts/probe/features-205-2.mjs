#!/usr/bin/env node
// ПРИБОР 205-2: три новых признака и снятый возраст.
//
//   A — локально: реестр 23 действующих и 1 снятый; сторож чист; снятый ключ отвергается с причиной; задача-объект
//       принимается; НЕГАТИВ — задача строкой получает отказ по типу.
//   B — на сервере (есть секрет машины): каталог отдаёт 23 и 1; кандидаты для «мне 40 лет» без возраста; ПОЗИТИВНЫЙ
//       КОНТРОЛЬ индекса — кандидаты для «надо позвонить в банк насчёт карты» содержат признак задач (иначе пустота
//       доказывала бы только слепоту индекса).
//
// 🛑 ПРИБОР НИЧЕГО НЕ ПИШЕТ В ПАМЯТЬ ЧЕЛОВЕКА: живой записи фразы здесь нет намеренно — у памяти нет двери, убирающей
// строку таблицы по метке прибора, и пробная запись осталась бы в живой памяти владельца. Индекс кандидатов при первом
// обращении перестраивается — это склад признаков (`memory_features`), а не память человека.

import { readFileSync } from "node:fs"
import { activeFeatures, problemsOf, readFeatures } from "../../lib/features.mjs"
import { checkGiven } from "../../lib/features-discover.mjs"

const MARK = "===PROBE_205_2==="
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

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}

console.log(`${MARK} start ${new Date().toISOString()}`)

// ── A: локально ──────────────────────────────────────────────────────────────
const all = readFeatures()
const active = activeFeatures()
say(active.length === 23 && all.length - active.length === 1, `реестр: действующих ${active.length}, снятых ${all.length - active.length} (ожидалось 23 и 1)`)
say(problemsOf(all).length === 0, `сторож: нарушений ${problemsOf(all).length}`)
for (const key of ["person.tasks-he-plans-to-do", "person.places-he-marked-for-himself", "person.ideas-he-had-for-the-future"]) {
  say(active.some((f) => f.key === key), `новый признак действует: ${key}`)
}
say(!active.some((f) => f.key === "person.age-he-is-now"), "возраст среди действующих: нет")

const retired = checkGiven([{ key: "person.age-he-is-now", value: 40 }])
say(retired.rejected[0]?.why === "retired-feature", `снятый ключ отвергнут: ${retired.rejected[0]?.why} — ${retired.rejected[0]?.what_happened ?? ""}`.slice(0, 200))
const task = checkGiven([{ key: "person.tasks-he-plans-to-do", value: { what: "позвонить в банк", state: "planned" } }])
say(task.taken.length === 1 && task.rejected.length === 0, `задача-объект принята: taken ${task.taken.length}`)
const taskAsText = checkGiven([{ key: "person.tasks-he-plans-to-do", value: "позвонить в банк" }])
say(taskAsText.rejected[0]?.why === "bad-value-type", `НЕГАТИВ: задача строкой → ${taskAsText.rejected[0]?.why ?? "ПРИНЯТА"}`)

if (!SECRET) {
  console.log(`${MARK} секрета машины нет — живой каталог и индекс не проверялись (это не сервер) · ${bad ? `ПРОВАЛОВ: ${bad}` : "локально всё сошлось"}`)
  process.exit(bad ? 1 : 0)
}

// ── B: сервер ────────────────────────────────────────────────────────────────
const res = await fetch(`${BASE}/v1/features`, { headers: { "x-data-secret": SECRET } })
const body = await res.json().catch(() => ({}))
say(res.status === 200 && body.active === 23 && body.retired === 1, `GET /v1/features → ${res.status}, действующих ${body.active}, снятых ${body.retired}`)

const { candidatesFor } = await import("../../lib/features-index.mjs")
const age = await candidatesFor("мне 40 лет")
say(age.ok && !age.candidates.some((c) => c.key === "person.age-he-is-now"),
  `кандидаты «мне 40 лет» без возраста: ${age.ok ? age.candidates.map((c) => c.key).join(", ") : age.error}`)
const bank = await candidatesFor("надо позвонить в банк насчёт карты")
const rank = bank.ok ? bank.candidates.findIndex((c) => c.key === "person.tasks-he-plans-to-do") : -1
say(bank.ok && rank >= 0 && rank < 3, `ПОЗИТИВНЫЙ КОНТРОЛЬ: признак задач в кандидатах на месте ${rank + 1} (индекс перестроен: ${bank.rebuilt})`)

console.log(`${MARK} ${bad ? `ПРОВАЛОВ: ${bad}` : "всё сошлось"} ${new Date().toISOString()}`)
process.exit(bad ? 1 : 0)

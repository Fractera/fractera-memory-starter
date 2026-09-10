// ОБЩЕЕ ДЛЯ ПРИБОРОВ ШАГА 183: как позвать память и как печатать вердикт.
//
// 🔒 ПОЧЕМУ ОБЩЕЕ, А НЕ КОПИЯ В КАЖДОМ ПРИБОРЕ. Пять приборов с пятью
// собственными `call()` разошлись бы на первой правке адреса или замка — и
// разошлись бы МОЛЧА: неверно позвавший прибор печатает не отказ, а провал
// проверки, и виноватой выглядит способность.
//
// 🛑 НИ ОДИН ПРИБОР ШАГА НИЧЕГО НЕ УДАЛЯЕТ. Уборка — по своей метке `who`, и
// только у тех, кто писал. Спрашивать у прибора надо не «что он проверяет», а
// «что он удаляет и чьё это»: прибор шага 160 стирал таблицы личной памяти
// целиком, то есть живую память владельца.

import { readFileSync } from "node:fs"

export const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
const MACHINE_ENV = process.env.FRACTERA_MACHINE_ENV ?? "/etc/fractera/secrets.env"

export function machineEnv(name) {
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

export const SECRET = process.env.DATA_SECRET || machineEnv("DATA_SECRET")

/** Позвать метод договора. Возвращает тело, код и время — всё три нужны. */
export async function call(method, body) {
  const started = Date.now()
  const res = await fetch(`${BASE}/v1/${method}`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-data-secret": SECRET },
    method: "POST",
  })
  const data = await res.json().catch(() => null)
  return { data, ms: Date.now() - started, status: res.status }
}

/** Счётчик провалов и печать строки вердикта. */
export function scoreboard(title) {
  let bad = 0
  console.log("=".repeat(72))
  console.log(title)
  console.log("=".repeat(72))
  console.log("")
  return {
    done(good) {
      console.log("")
      console.log("-".repeat(72))
      if (bad === 0) {
        console.log(`✓ ВСЁ ЗЕЛЁНОЕ: ${good}`)
        process.exit(0)
      }
      console.log(`🛑 ПРОВАЛОВ: ${bad}`)
      process.exit(1)
    },
    say(ok, what, extra = "") {
      if (!ok) bad += 1
      console.log(`${ok ? "✓" : "✗"} ${what}${extra ? "  — " + extra : ""}`)
    },
  }
}

/** Найти строку судьбы параметра в ответе. */
export function fate(data, name) {
  return (data?.params ?? []).find((p) => p.name === name) ?? null
}

/** Убрать за собой по СВОЕЙ метке — чужих строк прибор не трогает. */
export async function cleanup(who, tables) {
  const DATA_URL =
    process.env.REMOTE_DATA_URL || machineEnv("REMOTE_DATA_URL") || "http://localhost:3300"
  for (const t of tables) {
    await fetch(`${DATA_URL}/db/migrate`, {
      body: JSON.stringify({ params: [who], sql: `DELETE FROM ${t} WHERE who = ?` }),
      headers: { "Content-Type": "application/json", "X-Data-Secret": SECRET },
      method: "POST",
    }).catch(() => {})
  }
}

#!/usr/bin/env node
//
// ПРИБОР 185 — КЛЮЧ ВНЕШНИХ ИНСТРУМЕНТОВ: ОТКРЫВАЕТ, И ТОЛЬКО ОН.
//
// 🔒 ЧТО ИЗМЕРЯЕТСЯ. Не «создаётся ли файл», а четыре утверждения о ЗАМКЕ:
//   ① без ключа и без секрета машины дверь закрыта;
//   ② с ключом — открыта;
//   ③ ключ работает и в своём заголовке, и как `Authorization: Bearer`;
//   ④ новый ключ ОТМЕНЯЕТ прежний — тот перестаёт открывать в тот же миг.
//
// 🛑 ПРИБОР ПЕРЕЗАПИСЫВАЕТ ЖИВОЙ КЛЮЧ, И ЭТО СКАЗАНО ВСЛУХ. Он ротирует ключ
// дважды, а в конце оставляет РАБОЧИЙ — но не тот, что был до прогона. Если на
// этом сервере уже есть интеграция, она сломается: прогонять после того, как
// владелец роздал ключ, нельзя. Спрашивать у прибора надо не «что он
// проверяет», а «что он меняет и чьё это».

import { readFileSync } from "node:fs"
import { rotateKey } from "../../lib/api-key.mjs"
import { BASE, SECRET, scoreboard } from "./_call.mjs"

const s = scoreboard("ПРИБОР 185 — ключ доступа к памяти")

/** Позвать чтение с произвольными заголовками: сам вызов дешёвый, модель не зовётся. */
async function knock(headers) {
  const res = await fetch(`${BASE}/v1/recall`, {
    body: JSON.stringify({ lang: "ru", who: "probe-185" }),
    headers: { "Content-Type": "application/json", ...headers },
    method: "POST",
  })
  const data = await res.json().catch(() => null)
  return { data, status: res.status }
}

// ── ① БЕЗ НИЧЕГО — ЗАКРЫТО ───────────────────────────────────────────────────
const bare = await knock({})
s.say(bare.status === 401, "без ключа дверь закрыта", `${bare.status} · ${bare.data?.error ?? "—"}`)

// ── ② СЕКРЕТ МАШИНЫ ПО-ПРЕЖНЕМУ РАБОТАЕТ ─────────────────────────────────────
// 🔒 ЭТО ПРОВЕРКА НА РЕГРЕССИЮ: новый замок не имеет права закрыть дверь своим.
const machine = await knock({ "x-data-secret": SECRET })
s.say(machine.status === 200, "секрет машины открывает, как и раньше", String(machine.status))

// ── ③ НОВЫЙ КЛЮЧ ОТКРЫВАЕТ ───────────────────────────────────────────────────
const first = rotateKey()
s.say(first.startsWith("fmk_") && first.length > 20, "ключ рождён и узнаваем по приставке", `${first.slice(0, 8)}…`)

const byHeader = await knock({ "x-memory-key": first })
s.say(byHeader.status === 200, "ключ открывает в своём заголовке", String(byHeader.status))

const byBearer = await knock({ authorization: `Bearer ${first}` })
s.say(byBearer.status === 200, "тот же ключ открывает как Bearer", String(byBearer.status))

// ── ④ НЕГАТИВНЫЙ КОНТРОЛЬ: ЧУЖОЙ КЛЮЧ ────────────────────────────────────────
const wrong = await knock({ "x-memory-key": "fmk_этого-ключа-не-существует" })
s.say(wrong.status === 401, "НЕГАТИВНЫЙ: чужой ключ не открывает", String(wrong.status))

// ── ⑤ НЕГАТИВНЫЙ КОНТРОЛЬ: НОВЫЙ КЛЮЧ ОТМЕНЯЕТ ПРЕЖНИЙ ───────────────────────
// 🔒 РАДИ ЭТОЙ СТРОКИ ПРИБОР И НАПИСАН. «Сгенерировать» и «отозвать» — одно
// действие, и на экране это обещано человеку словами. Обещание, которое никто
// не проверил, живёт до первого раза, когда на него понадеялись.
const second = rotateKey()
s.say(second !== first, "второй ключ отличается от первого")
const old = await knock({ "x-memory-key": first })
s.say(old.status === 401, "НЕГАТИВНЫЙ: прежний ключ отозван новым", String(old.status))
const now = await knock({ "x-memory-key": second })
s.say(now.status === 200, "новый ключ открывает", String(now.status))

// ── ⑥ ПРАВА НА ФАЙЛ ──────────────────────────────────────────────────────────
try {
  const mode = (readFileSync && (await import("node:fs")).statSync("/etc/fractera/memory-api-key").mode) & 0o777
  s.say(mode === 0o600, "файл ключа закрыт от посторонних", "0" + mode.toString(8))
} catch (e) {
  s.say(false, "права файла ключа не прочитаны", String(e.message))
}

console.log("")
console.log("🛑 ключ на этой машине ПЕРЕЗАПИСАН прибором: действующий — последний из созданных")

s.done("ключ открывает, отзывается новым и не пускает чужого")

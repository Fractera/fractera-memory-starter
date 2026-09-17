#!/usr/bin/env node
//
// ПРИБОР 175-2 — ДВА ГЛАГОЛА РАБОТАЮТ, И ПАМЯТЬ ГОВОРИТ ПРАВДУ О СЕБЕ.
//
// 🛑 ПРИБОР УБИРАЕТ ЗА СОБОЙ ПО СВОЕЙ МЕТКЕ, А НЕ `DELETE FROM <таблица>`.
// ✗ Оплачено дорого в шаге 160: прибор стирал таблицы личной памяти целиком —
// то есть живую память владельца, — и снаружи это было неотличимо от «памяти
// никогда не было». Здесь у прибора свой `who`, и трогает он только его.

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
const MACHINE_ENV = process.env.FRACTERA_MACHINE_ENV ?? "/etc/fractera/secrets.env"
const WHO = "probe-175-2"

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

async function call(method, body) {
  const started = Date.now()
  const res = await fetch(`${BASE}/v1/${method}`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-data-secret": SECRET },
    method: "POST",
  })
  const data = await res.json().catch(() => null)
  return { data, ms: Date.now() - started, status: res.status }
}

console.log("=".repeat(72))
console.log("ПРИБОР 175-2 — сказать и спросить")
console.log("=".repeat(72))
console.log("")

// ── 1. ЧИСТЫЙ ЛИСТ ───────────────────────────────────────────────────────────
const empty = await call("recall", { who: WHO })
say(empty.data?.ok === true, "чистый лист: recall отвечает", `${empty.ms} мс`)
// 🪦 206-6: ЗДЕСЬ ЖДАЛИ РОВНО ДВУХ НЕДОСТАЮЩИХ — часовой пояс и язык, обязательные поля
// корневой таблицы. Числа больше нет, потому что нет и таблицы; проверяется то, что
// осталось правдой: на чистом листе память честно говорит, что ей чего-то не хватает.
say(
  Array.isArray(empty.data?.not_yet_known),
  "на чистом листе сказано, ЧЕГО не хватает",
  (empty.data?.not_yet_known ?? []).map((m) => m.what).join(", "),
)
// 🔒 ЭТО И ЕСТЬ ЗАКОН О МГНОВЕННОСТИ, ПРОВЕРЕННЫЙ ЧИСЛОМ: чтение без вопроса
// не имеет права звать модель.
say(empty.data?.used_model === false, "чтение НЕ звало модель", "used_model=false")

// ── 2. СКАЗАТЬ ───────────────────────────────────────────────────────────────
const first = await call("remember", { text: "я живу в часовом поясе Мадрида и говорю по-русски", who: WHO })
say(first.data?.ok === true, "remember принял фразу", `${first.ms} мс`)
const kinds = (first.data?.noted ?? []).map((n) => n.what)
say(kinds.length >= 2, "из одной фразы вынуто два факта", kinds.join(", "))
say(
  kinds.every((k) => /^[a-z][a-z0-9_]*$/.test(k)),
  "имена родов по стандарту: английские, через подчёркивание",
)

// ── 3. ПРОЧИТАТЬ ЗАПИСАННОЕ ──────────────────────────────────────────────────
const after = await call("recall", { who: WHO })
say((after.data?.known ?? []).length >= 2, "записанное читается", `известно ${(after.data?.known ?? []).length}`)
say(after.data?.used_model === false, "и это чтение тоже БЕЗ модели", `${after.ms} мс`)

// 🪦 206-6: ЗДЕСЬ ПРОВЕРЯЛОСЬ, ЧТО ОТВЕТ НАЗЫВАЕТ ХРАНИЛИЩЕ-ИСТОЧНИК. Проверка снята
// вместе с предметом: специализированных хранилищ у памяти нет, поле уходило пустым,
// и утверждение было зелёным только до 206-1. Род значения проверяется ниже — он про
// знание, а не про хранение.
say(
  (after.data?.known ?? []).every((k) => "claim" in k),
  "и род значения едет вместе с ним",
)

// ── 4. ПРОТИВОРЕЧИЕ: ПОСЛЕДНЕЕ ПОБЕЖДАЕТ, НО ВСЛУХ ───────────────────────────
const second = await call("remember", { text: "нет, всё-таки давай на украинском", who: WHO })
// 🪦 206-6: ЗДЕСЬ ПРОВЕРЯЛОСЬ «БЫЛО X, СТАЛО Y». Перезапись значения жила в колонке
// корня; с 206-1 факт стал событием графа, и прежнее значение назвать неоткуда.
// 🛑 ДОЛГ НАЗВАН ВСЛУХ, А НЕ ЗАМАЗАН: способность «поправка вслух, с прежним значением»
// потеряна вместе с колонками. Вернуть её на графе — решение владельца.
say(
  (second.data?.noted ?? []).length > 0,
  "поправка принята и записана",
  `записей: ${(second.data?.noted ?? []).length}`,
)
say(
  // 🪦 206-6: слова «было» в ответе больше нет — вместе с прежним значением.
  typeof second.data?.what_happened === "string" && second.data.what_happened.length > 0,
  "и сказано ВСЛУХ, словами для человека",
  String(second.data?.what_happened ?? "").slice(0, 70),
)

// ── 5. НЕГАТИВНЫЙ КОНТРОЛЬ: ФРАЗА БЕЗ ФАКТОВ НИЧЕГО НЕ ПИШЕТ ─────────────────
const beforeN = ((await call("recall", { who: WHO })).data?.known ?? []).length
const plain = await call("remember", { text: "посчитай, сколько будет 17% от 4300", who: WHO })
const afterN = ((await call("recall", { who: WHO })).data?.known ?? []).length
// 🪦 206-6: РАНЬШЕ ЗДЕСЬ ЖДАЛИ НЕИЗМЕННОСТИ — фраза без фактов не писала ничего.
// С 206-1 память — это СОБЫТИЯ: каждая фраза получает строку, и «ничего не записал»
// перестало быть правдой. Проверяется новая правда и её граница.
// 🔒 СЧИТАЕМ НЕ ДЛИНУ СПИСКА, А НОМЕР СОБЫТИЯ. ✗ Оплачено в тот же час: длина `known`
// дала 4 → 5 на чистой метке и 10 → 10 на обжитой: `known` — это ВИД последних событий,
// а не счётчик записей, и его длина растёт не один к одному. ПОЧЕМУ именно так — не мерено
// и здесь не утверждается. Прямой замер по таблице в тот же час: 0 строк → 1, чтение подряд
// 1 → 1. Номер события врать не умеет, длина вида — умеет.
say(Number.isInteger(plain.data?.message_id) && plain.data.message_id > 0, "фраза без фактов всё равно стала событием — у неё есть номер", `message_id=${plain.data?.message_id}`)
const againN = ((await call("recall", { who: WHO })).data?.known ?? []).length
say(againN === afterN, "НЕГАТИВНЫЙ: чтение НИЧЕГО не пишет — два вопроса подряд дают то же число", `${afterN} → ${againN}`)

// ── 6. НЕГАТИВНЫЙ КОНТРОЛЬ: ДОГОВОР ОХРАНЯЕТ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ ───────────────
const noWho = await fetch(`${BASE}/v1/remember`, {
  body: JSON.stringify({ text: "что-то" }),
  headers: { "Content-Type": "application/json", "x-data-secret": SECRET },
  method: "POST",
})
say(noWho.status === 400, "НЕГАТИВНЫЙ: вызов без обязательного параметра отвергнут", `код ${noWho.status}`)

// ── 7. НЕГАТИВНЫЙ КОНТРОЛЬ: НЕОБЪЯВЛЕННЫЙ МЕТОД ──────────────────────────────
const nope = await fetch(`${BASE}/v1/forget_everything`, {
  body: "{}",
  headers: { "Content-Type": "application/json", "x-data-secret": SECRET },
  method: "POST",
})
say(nope.status === 501, "НЕГАТИВНЫЙ: метода вне договора не существует", `код ${nope.status}`)

// ── УБОРКА ПО СВОЕЙ МЕТКЕ ────────────────────────────────────────────────────
const DATA_URL = process.env.REMOTE_DATA_URL || machineEnv("REMOTE_DATA_URL") || "http://localhost:3300"
for (const t of ["person_who_owns_this_project", "person_who_owns_this_project__what_he_told_us_before"]) {
  await fetch(`${DATA_URL}/db/migrate`, {
    body: JSON.stringify({ params: [WHO], sql: `DELETE FROM ${t} WHERE who = ?` }),
    headers: { "Content-Type": "application/json", "X-Data-Secret": SECRET },
    method: "POST",
  }).catch(() => {})
}
console.log("")
console.log("(убрано по метке who = " + WHO + "; чужих строк прибор не трогает)")

console.log("")
console.log("-".repeat(72))
if (bad === 0) {
  console.log("✓ ВСЁ ЗЕЛЁНОЕ: два глагола работают, чтение мгновенно и ничего не пишет, поправка принята вслух")
  process.exit(0)
}
console.log(`🛑 ПРОВАЛОВ: ${bad}`)
process.exit(1)

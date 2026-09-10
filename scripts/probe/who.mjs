#!/usr/bin/env node
//
// ПРИБОР 183-3 — ПАМЯТЬ ОТВЕЧАЕТ ПРО НАЗВАННОГО ЧЕЛОВЕКА, А НЕ ПРО ВООБЩЕ.
//
// 🔒 ЧТО ЗДЕСЬ ИЗМЕРЯЕТСЯ. Раньше имя человека подставляла дверь стенда — молча
// и всегда одно. Снаружи это неотличимо от «памяти всё равно, о ком спрашивают»:
// два разных вопроса давали один ответ, и понять почему было нечем. Проверяем
// две вещи: разные имена дают разные ответы, и безымянный вызов получает ОТКАЗ,
// а не тихую подстановку.

import { call, cleanup, scoreboard } from "./_call.mjs"

const ONE = "probe-183-3-one"
const TWO = "probe-183-3-two"
const s = scoreboard("ПРИБОР 183-3 — от чьего имени")

await call("remember", { lang: "ru", text: "меня зовут Первый", who: ONE })
await call("remember", { lang: "ru", text: "меня зовут Второй", who: TWO })

const one = await call("recall", { lang: "ru", who: ONE })
const two = await call("recall", { lang: "ru", who: TWO })

const values = (d) => (d?.known ?? []).map((k) => String(k.value)).join(" | ")
s.say(one.data?.ok === true && two.data?.ok === true, "оба вопроса получили ответ")
s.say(
  values(one.data) !== values(two.data),
  "разные люди — разные ответы",
  `${values(one.data)}  ≠  ${values(two.data)}`,
)
s.say(
  values(one.data).includes("Первый") && values(two.data).includes("Второй"),
  "каждому отвечено ЕГО фактом, а не соседним",
)

// ── КОГО ПАМЯТЬ ЗНАЕТ — ЭТО ТОТ ЖЕ СПИСОК, ЧТО НА ЭКРАНЕ ─────────────────────
// 🔒 СПИСОК НА СТЕНДЕ ПОРОЖДАЕТСЯ ЭТИМ МЕТОДОМ, А НЕ ПИШЕТСЯ РУКАМИ. Прибор
// доказывает, что источник у экрана и у него один.
const people = await call("people", { lang: "ru" })
const names = (people.data?.people ?? []).map((p) => (typeof p === "string" ? p : p?.who))
s.say(names.includes(ONE) && names.includes(TWO), "метод people знает обоих", names.length + " человек(а)")

// ── НЕГАТИВНЫЙ КОНТРОЛЬ: БЕЗ ИМЕНИ — ОТКАЗ, А НЕ ПОДСТАНОВКА ─────────────────
// 🔒 ИМЕННО ЭТО И СНЯЛ ПОДШАГ. Пока дверь подставляла своё имя, такой вызов
// возвращал бы чужие факты и выглядел бы успехом.
const none = await call("recall", { lang: "ru" })
s.say(
  none.data?.ok === false && (none.data?.error === "need-who" || none.status === 400),
  "НЕГАТИВНЫЙ: без имени память отказывает",
  `${none.status} · ${none.data?.error ?? none.data?.what_happened ?? "—"}`,
)
s.say(
  !Array.isArray(none.data?.known) || none.data.known.length === 0,
  "НЕГАТИВНЫЙ: безымянному вызову не отдано ни одного факта",
)

await cleanup(ONE, [
  "person_who_owns_this_project",
  "person_who_owns_this_project__what_he_told_us_before",
])
await cleanup(TWO, [
  "person_who_owns_this_project",
  "person_who_owns_this_project__what_he_told_us_before",
])
console.log("")
console.log(`(убрано по меткам ${ONE} и ${TWO}; чужих строк прибор не трогает)`)

s.done("память отвечает про названного человека, безымянный вызов отвергается")

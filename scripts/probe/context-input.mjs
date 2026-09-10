#!/usr/bin/env node
//
// ПРИБОР 183-4 — ИСТОРИЯ И ПРЕЖНИЕ НАХОДКИ УЧАСТВУЮТ В ПОИСКЕ И НАЗЫВАЮТСЯ.
//
// 🔒 ЧТО ЗДЕСЬ ИЗМЕРЯЕТСЯ. Зовущая модель по своему усмотрению передаёт памяти
// предыдущий разговор. Проверяем не «принят ли параметр», а ЕГО ДЕЙСТВИЕ: один
// и тот же вопрос без истории не находит ничего, с историей — находит. И вторая
// половина, не менее важная: память НАЗЫВАЕТ, что взяла на вход. Ответ,
// найденный по слову из истории, иначе выглядит как найденный по вопросу — и
// зовущий решит, что память знает больше, чем знает.

import { call, cleanup, fate, scoreboard } from "./_call.mjs"

const WHO = "probe-183-4"
const s = scoreboard("ПРИБОР 183-4 — история разговора и прежние находки")

// 🔒 ФАКТОВ КЛАДЁМ ДВА, И ЭТО НЕ ПРИДИРКА К ЧИСЛУ, А УСЛОВИЕ РАЗЛИЧИМОСТИ.
// ✗ оплачено первым прогоном 183-4 на сервере: факт был один, и «нашёлся ровно
// один» оказалось неотличимо от «отдано всё известное, а его всего один».
// Прибор печатал провал там, где память вела себя правильно, — то есть мерил
// не то, что утверждал. При двух фактах промах даёт два, попадание — один.
await call("remember", { lang: "ru", text: "я говорю с вами по-русски", who: WHO })
await call("remember", { lang: "ru", text: "я живу в Мадриде", who: WHO })

// Вопрос БЕЗ общих слов с именами родов: механический поиск обязан промахнуться.
const blind = await call("recall", { lang: "ru", text: "а что там у меня", who: WHO })
s.say(
  (blind.data?.known ?? []).length >= 2,
  "без контекста точного совпадения нет — отдано всё известное",
  `известно ${(blind.data?.known ?? []).length}`,
)

// Тот же вопрос, но зовущий прислал историю со словом рода.
const withHistory = await call("recall", {
  history: "мы говорили про language he speaks with us",
  lang: "ru",
  text: "а что там у меня",
  who: WHO,
})
s.say(
  (withHistory.data?.known ?? []).length === 1,
  "с историей вопрос разрешился в один факт",
  (withHistory.data?.known ?? []).map((k) => k.what).join(", ") || "ничего",
)
s.say(
  (withHistory.data?.used_input ?? []).includes("history"),
  "память НАЗВАЛА, что история участвовала в поиске",
  JSON.stringify(withHistory.data?.used_input ?? []),
)
s.say(fate(withHistory.data, "history")?.state === "accepted", "судьба «history» названа принятой")

// Прежние находки — тот же путь, другое поле.
const withPrior = await call("recall", {
  lang: "ru",
  prior: "раньше нашли только language he speaks with us",
  text: "а что там у меня",
  who: WHO,
})
s.say(
  (withPrior.data?.used_input ?? []).includes("prior"),
  "прежние находки тоже названы учтёнными",
  JSON.stringify(withPrior.data?.used_input ?? []),
)

// ── НЕГАТИВНЫЙ КОНТРОЛЬ: ПУСТОЙ КОНТЕКСТ НИЧЕГО НЕ ДОСОЧИНЯЕТ ────────────────
// 🔒 БЕЗ ЭТОЙ ПРОВЕРКИ ПРИБОР ДОКАЗЫВАЛ БЫ ЛИШЬ ТО, ЧТО ПОЛЕ ЧИТАЕТСЯ. Здесь он
// доказывает обратное утверждение: не присланного в `used_input` быть не может.
const clean = await call("recall", { lang: "ru", text: "а что там у меня", who: WHO })
s.say(
  (clean.data?.used_input ?? []).length === 0,
  "НЕГАТИВНЫЙ: не прислали контекст — и учтённого контекста нет",
  JSON.stringify(clean.data?.used_input ?? []),
)
s.say(
  fate(clean.data, "history") === null && fate(clean.data, "prior") === null,
  "НЕГАТИВНЫЙ: о неприсланном параметре ответ молчит, а не пишет строку",
)

await cleanup(WHO, [
  "person_who_owns_this_project",
  "person_who_owns_this_project__what_he_told_us_before",
])
console.log("")
console.log(`(убрано по метке who = ${WHO}; чужих строк прибор не трогает)`)

s.done("присланный контекст действует на поиск и называется в ответе")

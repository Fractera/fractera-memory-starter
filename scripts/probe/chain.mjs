#!/usr/bin/env node
//
// ПРИБОР 183-5 — ЦЕПОЧКА ВОЗВРАЩАЕТСЯ ТОЛЬКО ПО ПРОСЬБЕ.
//
// 🔒 ОБЕ ПОЛОВИНЫ ЗАМЕРА РАВНОЗНАЧНЫ, И ВТОРАЯ ВАЖНЕЕ. Первая: попросили —
// цепочка пришла. Вторая: не просили — поля `chain` НЕТ ВОВСЕ. Проверяется
// именно наличие ключа, а не его пустота: пустое поле человек и модель читают
// как «память не думала», а это уверенное умолчание (закон 144).

import { call, cleanup, fate, scoreboard } from "./_call.mjs"

const WHO = "probe-183-5"
const s = scoreboard("ПРИБОР 183-5 — цепочка размышлений по требованию зовущего")

await call("remember", { lang: "ru", text: "я говорю с вами по-русски", who: WHO })

const asked = await call("recall", {
  lang: "ru",
  text: "на каком языке я говорю",
  want_chain: true,
  who: WHO,
})
s.say(Array.isArray(asked.data?.chain), "попросили — цепочка пришла массивом")
s.say((asked.data?.chain ?? []).length > 0, "цепочка непуста", `${(asked.data?.chain ?? []).length} шаг(ов)`)
s.say(
  (asked.data?.chain ?? []).some((line) => String(line).includes("механический поиск")),
  "в цепочке названы настоящие шаги поиска",
  (asked.data?.chain ?? []).join(" → ").slice(0, 160),
)
s.say(fate(asked.data, "want_chain")?.state === "accepted", "судьба «want_chain» названа принятой")

// ── НЕГАТИВНЫЙ КОНТРОЛЬ: НЕ ПРОСИЛИ — КЛЮЧА НЕТ ──────────────────────────────
const quiet = await call("recall", { lang: "ru", text: "на каком языке я говорю", who: WHO })
s.say(
  !("chain" in (quiet.data ?? {})),
  "НЕГАТИВНЫЙ: не просили — ключа chain нет вовсе (а не пустой массив)",
  "chain" in (quiet.data ?? {}) ? "ключ есть — это провал" : "ключа нет",
)
s.say(
  quiet.data?.ok === true && (quiet.data?.known ?? []).length > 0,
  "и при этом сам ответ не пострадал",
  `известно ${(quiet.data?.known ?? []).length}`,
)

// 🔒 ЯВНОЕ «НЕТ» — ЭТО ТОЖЕ «НЕ ПРОСИЛИ», А НЕ ТРЕТЬЕ СОСТОЯНИЕ.
const said_no = await call("recall", {
  lang: "ru",
  text: "на каком языке я говорю",
  want_chain: false,
  who: WHO,
})
s.say(!("chain" in (said_no.data ?? {})), "НЕГАТИВНЫЙ: явное «нет» тоже не приносит цепочку")

await cleanup(WHO, [
  "person_who_owns_this_project",
  "person_who_owns_this_project__what_he_told_us_before",
])
console.log("")
console.log(`(убрано по метке who = ${WHO}; чужих строк прибор не трогает)`)

s.done("цепочка приходит по просьбе и отсутствует без неё")

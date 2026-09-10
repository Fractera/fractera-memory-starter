#!/usr/bin/env node
//
// ПРИБОР 183-2 — ГЛУБИНА ПРОСИТСЯ СЛОВОМ, А ОТВЕЧАЕТСЯ ЧИСЛОМ ПО ФАКТУ.
//
// 🔒 ЧТО ИМЕННО ЗДЕСЬ ИЗМЕРЯЕТСЯ: не «принял ли параметр», а РАЗНИЦА между
// запрошенным и достигнутым. Память, отвечающая «дошла до пятого» потому, что
// пятый попросили, — это уверенное умолчание, и оно дороже отсутствующего
// значения (закон 144). Просили `extreme`, поднялись до первого — так и должно
// быть сказано.

import { call, cleanup, fate, scoreboard } from "./_call.mjs"

const WHO = "probe-183-2"
const s = scoreboard("ПРИБОР 183-2 — глубина: просили одно, дошли до другого")

// Кладём один факт, чтобы было что искать.
await call("remember", { lang: "ru", text: "я говорю с вами по-русски", who: WHO })

for (const depth of ["standard", "deep", "extreme"]) {
  const r = await call("recall", { depth, lang: "ru", text: "на каком языке я говорю", who: WHO })
  s.say(r.data?.ok === true, `«${depth}»: память отвечает`, `${r.ms} мс`)
  s.say(r.data?.depth_asked === depth, `«${depth}»: запрошенное названо в ответе`, String(r.data?.depth_asked))
  s.say(
    typeof r.data?.depth_used === "number" && r.data.depth_used <= 2,
    `«${depth}»: достигнутое — число, и оно не выше построенного`,
    `depth_used=${r.data?.depth_used}`,
  )
  const f = fate(r.data, "depth")
  s.say(f?.state === "accepted", `«${depth}»: судьба параметра названа`, f?.state ?? "строки нет")
}

// 🔒 РАЗНИЦА ВИДНА ЧИСЛОМ, А НЕ ВПЕЧАТЛЕНИЕМ: у дорогой просьбы достигнутое
// обязано отличаться от запрошенного, пока уровни 3–5 не построены.
const extreme = await call("recall", { depth: "extreme", lang: "ru", text: "чего я не говорил", who: WHO })
s.say(
  extreme.data?.depth_asked === "extreme" && extreme.data?.depth_used < 5,
  "просили экстремальную, дошли ниже — и это сказано, а не скрыто",
  `asked=${extreme.data?.depth_asked} used=${extreme.data?.depth_used}`,
)

// ── НЕГАТИВНЫЙ КОНТРОЛЬ: ГЛУБИНЫ ТАКОЙ НЕ БЫВАЕТ ─────────────────────────────
// 🔒 БЕЗ НЕГО ПРИБОР ЗЕЛЁН ПО ПРИЧИНЕ СОБСТВЕННОЙ СЛЕПОТЫ. Проверяем, что
// неизвестное значение ОТВЕРГНУТО по форме, а не понижено молча до стандарта:
// тихое понижение и есть то самое уверенное умолчание.
const ultra = await call("recall", { depth: "ultra", lang: "ru", text: "на каком языке я говорю", who: WHO })
const bad = fate(ultra.data, "depth")
s.say(bad?.state === "bad_form", "НЕГАТИВНЫЙ: «ultra» названа не той формой", bad?.state ?? "строки нет")
s.say(
  ultra.data?.depth_asked === "standard" && Boolean(bad),
  "НЕГАТИВНЫЙ: отвергнутая глубина не выдаётся за принятую",
  `depth_asked=${ultra.data?.depth_asked}, причина: ${bad?.note ?? "—"}`,
)

await cleanup(WHO, [
  "person_who_owns_this_project",
  "person_who_owns_this_project__what_he_told_us_before",
])
console.log("")
console.log(`(убрано по метке who = ${WHO}; чужих строк прибор не трогает)`)

s.done("глубина просится словом, достигнутое считается по факту, неизвестное отвергается")

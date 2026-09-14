// ПРИБОР 201-5 — ЗАПИСЬ: ВСЁ В ГРАФ, ТОЧНОЕ И СЧЁТНОЕ — ЕЩЁ И В ТАБЛИЦУ.
//
// 🔒 ДВЕ ПЛОСКОСТИ, НАЗВАННЫЕ ЗАРАНЕЕ (ТЗ 201-5):
//   A — кейсы владельца: расходы 200/300/400 → строки таблицы и документ графа с указателями;
//       «Денис служил в президентском полку» → якорь «Денис» в графе, истории в таблице нет;
//       «живу в Толедо» → «нет, в Севилье» — было/стало;
//   B — негатив и паритет: значение не того типа в таблицу не идёт и названо; одна и та же фраза с
//       `features` и без даёт одинаковые записи; без признаков модель зовётся, с ними — нет.
//
// 🛑 ЧТО ПРИБОР ПИШЕТ И УДАЛЯЕТ, И ЧЬЁ ЭТО. Он говорит от лица ПРОБНОГО человека
// `probe-201-5@local`, а не владельца: его строки живут в тех же таблицах, но своими значениями
// `who`, и убираются по этому же ключу. Живой памяти владельца прибор не касается.
// ✗ Оплачено в соседнем шаге: прибор 160 стирал таблицы целиком — то есть живую память человека.
//
// 💰 ЦЕНА ДО ПРОГОНА: 4 вызова модели разбора (~$0,013 и 5–9 с каждый) и 5 документов графа
// (извлечение сущностей на его стороне). Остаток окна подписки проверяется ДО прогона — урок 201-4.
//
// Запуск на сервере из корня службы:  node scripts/probe/write-201-5.mjs [keep]

import { forgetBySource } from "../../lib/graph.mjs"
import { dataCall } from "../../lib/data-call.mjs"
import { remember } from "../../lib/verbs.mjs"
import { ROOT } from "../../lib/naming.mjs"

const MARK = "===PROBE_201_5==="
const WHO = "probe-201-5@local"
const KEEP = process.argv[2] === "keep"

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}
const sql = async (text, params = []) => {
  const r = await dataCall("/db/migrate", { params, sql: text })
  return r.ok ? (r.body?.rows ?? []) : []
}
const pointersOf = (r) => (r?.noted ?? []).map((n) => `${n.what}=${n.added ?? n.became ?? n.value}${n.row ? `#${n.row}` : ""}`)

console.log(`${MARK} start ${new Date().toISOString()} who=${WHO}`)

// ── A1: кейс владельца — три траты ───────────────────────────────────────────
const spend = await remember({
  text: "мои расходы на молоко колбасу и воду сегодня были 200 300 и 400 руб",
  who: WHO,
})
say(spend.ok, `«расходы 200/300/400» → ok=${spend.ok}, записей ${spend.noted?.length ?? 0}: ${pointersOf(spend).join(", ")}`)
say(spend.kept_whole?.ok === true, `   в граф ушло целиком: ${JSON.stringify(spend.kept_whole)}`)
say(spend.used_model === true, `   модель разбора звалась: ${spend.used_model}`)

// ── A2: Денис — друг в таблицу, служба только в граф ─────────────────────────
const denis = await remember({
  text: "Мой друг Денис служил в президентском полку с 1994 по 1996 год",
  who: WHO,
})
const denisNoted = (denis.noted ?? []).map((n) => String(n.added ?? n.became ?? n.value ?? ""))
say(denis.ok && denisNoted.some((v) => v.includes("Денис")), `«Денис служил…» → в таблицу: ${denisNoted.join(" | ") || "ничего"}`)
say(
  !denisNoted.some((v) => /полк|1994|1996/i.test(v)),
  `   НЕГАТИВ: истории службы в таблице нет (значения: ${denisNoted.join(" | ") || "—"})`,
)
say(denis.kept_whole?.anchors?.some((a) => a.includes("Денис")) === true, `   якорь графа: ${JSON.stringify(denis.kept_whole?.anchors)}`)

// ── A3: было/стало ───────────────────────────────────────────────────────────
// 🔒 ПЕРВЫЙ ШАГ ПРОВЕРЯЕТСЯ ОТДЕЛЬНО. ✗ Оплачено прогоном 2026-09-14 23:55: «перехода не видно» —
// и по одному только второму ответу нельзя было сказать, что подвело: исправление или сама первая
// запись. Проверка пары без проверки её половин диагноза не даёт.
const first = await remember({ text: "я живу в Толедо", who: WHO })
const firstCity = (first.noted ?? []).find((n) => n.what === "city_where_he_lives_now")
say(Boolean(firstCity), `«живу в Толедо» записано: ${firstCity ? JSON.stringify(firstCity) : "НЕТ — " + JSON.stringify(first.noted ?? first.what_happened)}`)
const moved = await remember({ text: "нет, я живу в Севилье", who: WHO })
const changed = (moved.noted ?? []).find((n) => n.was)
say(Boolean(changed), `«Толедо» → «Севилья»: ${changed ? `было «${changed.was}», стало «${changed.became}»` : "перехода не видно: " + JSON.stringify(moved.noted)}`)

// ── A4: вводная часть документа графа (требование владельца 2026-09-14) ──────
//
// 🔒 ПРОВЕРЯЕТСЯ НЕ «ЗАПИСЬ ПРИНЯТА», А ЧТО ИМЕННО ГРАФ ИЗ НЕЁ ИЗВЛЁК: имя человека и канал обязаны
// стать СУЩНОСТЯМИ, иначе вопрос «что говорил Рома» не находит ничего. Имя проверяем поиском по
// меткам — он модель не зовёт.
await remember({ text: "меня зовут Рома Армстронг", who: WHO, via: "Telegram" })
const named = await remember({ text: "вчера встречался с Денисом в Севилье", via: "Telegram", who: WHO })
say(named.ok, `фраза с каналом принята: ${String(named.what_happened).slice(0, 70)}`)
for (let i = 0; i < 20; i++) {
  const l = await dataCall(`/service/rag/graph/label/search?q=${encodeURIComponent("Армстронг")}&limit=5`, undefined, "GET")
  if (Array.isArray(l.body) && l.body.length) break
  await new Promise((r) => setTimeout(r, 3000))
}
const lblName = await dataCall(`/service/rag/graph/label/search?q=${encodeURIComponent("Армстронг")}&limit=5`, undefined, "GET")
const lblVia = await dataCall(`/service/rag/graph/label/search?q=${encodeURIComponent("Telegram")}&limit=5`, undefined, "GET")
const lblNone = await dataCall(`/service/rag/graph/label/search?q=${encodeURIComponent("Гиацинтов")}&limit=5`, undefined, "GET")
say(Array.isArray(lblName.body) && lblName.body.length > 0, `имя человека стало сущностью графа: ${JSON.stringify(lblName.body)}`)
console.log(`   канал как сущность: ${JSON.stringify(lblVia.body)} (не обязателен, но виден)`)
say(Array.isArray(lblNone.body) && lblNone.body.length === 0, `НЕГАТИВ: несуществующее имя меткой не стало: ${JSON.stringify(lblNone.body)}`)

// ── B1: значение не того типа от зовущего ────────────────────────────────────
const badValue = await remember({
  features: [{ key: "money.spent-on-a-purchase", value: "много" }],
  text: "потратил много",
  who: WHO,
})
say(
  (badValue.dropped ?? []).some((d) => /не принят/.test(d)),
  `НЕГАТИВ: «много» как деньги отвергнуто и названо: ${(badValue.dropped ?? []).join("; ") || "МОЛЧА"}`,
)
// 🔒 ПРОВЕРЯЕТСЯ И ТОТ ПУТЬ, ГДЕ РАЗБОР ОТКАЗАЛ: фраза обязана уцелеть в графе даже тогда.
say(badValue.kept_whole?.ok === true, `   но сказанное всё равно в графе: ${JSON.stringify(badValue.kept_whole)} (ответ: ${String(badValue.what_happened).slice(0, 60)})`)

// ── B2: паритет — та же фраза с признаками и без ─────────────────────────────
const WHO2 = `${WHO}-parity`
const without = await remember({ text: "я живу в Порту", who: WHO2 })
const WHO3 = `${WHO}-parity-given`
const withGiven = await remember({
  features: [{ key: "person.city-where-he-lives-now", value: "Порту" }],
  text: "я живу в Порту",
  who: WHO3,
})
// 🔒 ПАРИТЕТ СЧИТАЕТСЯ ПО ТОМУ ПРИЗНАКУ, О КОТОРОМ ШЛА РЕЧЬ, А НЕ ПО ВСЕМУ УЛОВУ. Закон шестой
// защищает путь БЕЗ признаков: он обязан дать то же качество. Обратное неверно и не обещано —
// модель разбора попутно замечает и другое (например, язык фразы), а путь с присланными признаками
// пишет ровно то, что прислали. Разница названа здесь, а не спрятана за красивым равенством.
const cityOf = (r) => (r.noted ?? []).filter((n) => n.what === "city_where_he_lives_now").map((n) => n.added ?? n.became ?? n.value).join(",")
const allOf = (r) => (r.noted ?? []).map((n) => `${n.what}=${n.added ?? n.became ?? n.value}`).sort().join(",")
say(cityOf(without) === cityOf(withGiven) && cityOf(without) !== "", `паритет по названному признаку: без «${cityOf(without)}» = с «${cityOf(withGiven)}»`)
console.log(`   улов целиком: без признаков «${allOf(without)}» · с признаками «${allOf(withGiven)}» (разница — попутные находки модели)`)
say(without.used_model === true && withGiven.used_model === false, `   разница только в ходе модели: без — ${without.used_model}, с — ${withGiven.used_model}`)

// ── уборка ───────────────────────────────────────────────────────────────────
if (!KEEP) {
  console.log("── уборка по своей метке ──")
  const tables = await sql("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ?", [`${ROOT}%`])
  let rows = 0
  for (const t of tables) {
    const name = String(t.name)
    const r = await dataCall("/db/migrate", { params: [WHO, WHO2, WHO3], sql: `DELETE FROM ${name} WHERE who IN (?, ?, ?)` })
    if (r.ok) rows += Number(r.body?.changes ?? 0)
  }
  const left = await sql(`SELECT COUNT(*) AS n FROM ${ROOT} WHERE who LIKE ?`, [`${WHO}%`])
  say(Number(left[0]?.n ?? 0) === 0, `строк прибора удалено ${rows}, осталось ${left[0]?.n ?? "?"} (и ни одной чужой не тронуто)`)
  const g = await forgetBySource(`memory/${WHO.replace(/[^\w.@-]/g, "_")}`)
  console.log(`   документы графа прибора: удалено ${g.deleted ?? 0}${g.background ? " (фоново)" : ""}`)
  for (const w of [WHO2, WHO3]) {
    const g2 = await forgetBySource(`memory/${w.replace(/[^\w.@-]/g, "_")}`)
    console.log(`   документы графа ${w}: удалено ${g2.deleted ?? 0}`)
  }
}

console.log(`${MARK} ${bad ? `ПРОВАЛОВ: ${bad}` : "всё сошлось"} ${new Date().toISOString()}`)
process.exit(bad ? 1 : 0)

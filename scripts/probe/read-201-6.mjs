// ПРИБОР 201-6 — ЧТЕНИЕ: ТАБЛИЦА ИЛИ ГРАФ ОДНИМ РЕШЕНИЕМ, ЧЕСТНОЕ «НЕ ЗНАЮ».
//
// 🔒 ДВЕ ПЛОСКОСТИ, НАЗВАННЫЕ ЗАРАНЕЕ (ТЗ 201-6):
//   A — вопросы по-русски и по-английски со СТРОГИМ судьёй: ответом считается ровно нужный факт, а
//       не его присутствие среди прочих. «Сколько я потратил сегодня?» → 900; «где я живу?» →
//       Севилья; «что было с Денисом?» → история из графа по якорю.
//   B — негатив: «какая порода у моей собаки?» → честное «не знаю» и пустой `known`; вопрос о языке
//       не отдаёт встречу (ложное совпадение матрицы 200-7); объект чужого человека не приходит.
//
// 🛑 ЧТО ПРИБОР ПИШЕТ И УДАЛЯЕТ: говорит от лица пробного человека `probe-201-6@local` и убирает
// свои строки по этому ключу, а документы графа — по своему имени. Памяти владельца не касается.
//
// 💰 ЦЕНА ДО ПРОГОНА: 5 записей и 7 вопросов — по вызову модели на каждый (~$0,013, 5–9 с), плюс
// документы графа. Остаток окна подписки проверяется ДО прогона (урок 201-4).
//
// Запуск на сервере из корня службы:  node scripts/probe/read-201-6.mjs [keep]

import { dataCall } from "../../lib/data-call.mjs"
import { forgetBySource } from "../../lib/graph.mjs"
import { recall, remember } from "../../lib/verbs.mjs"
import { ROOT } from "../../lib/naming.mjs"

const MARK = "===PROBE_201_6==="
const WHO = "probe-201-6@local"
const KEEP = process.argv[2] === "keep"

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}
const valuesOf = (r) => (r.known ?? []).map((k) => `${k.what}=${k.value}`)
const foundBy = (r) => [...new Set((r.known ?? []).map((k) => k.found_by ?? "—"))].join(",")

console.log(`${MARK} start ${new Date().toISOString()} who=${WHO}`)

// ── что память знает к началу вопросов ───────────────────────────────────────
for (const [text, via] of [
  ["меня зовут Рома Армстронг", "Telegram"],
  ["я живу в Севилье", "Telegram"],
  ["мои расходы на молоко колбасу и воду сегодня были 200 300 и 400 руб", "Telegram"],
  ["Мой друг Денис служил в президентском полку с 1994 по 1996 год", "Telegram"],
  ["отвечай мне по-русски", "Telegram"],
]) {
  const r = await remember({ text, via, who: WHO })
  console.log(`   записано: «${text.slice(0, 44)}…» → ${(r.noted ?? []).length} значений, граф ${r.kept_whole?.ok ? "принял" : "НЕТ"}`)
}
// Связи строятся в фоне (измерено 201-2: 2,3–6,2 с) — ждём появления имени в метках, а не паузой.
for (let i = 0; i < 30; i++) {
  const l = await dataCall(`/service/rag/graph/label/search?q=${encodeURIComponent("Денис")}&limit=5`, undefined, "GET")
  if (Array.isArray(l.body) && l.body.length) break
  await new Promise((r) => setTimeout(r, 3000))
}

// ── A: вопросы со строгим судьёй ─────────────────────────────────────────────
const CASES = [
  { ask: "сколько я потратил сегодня?", judge: (r) => (r.known ?? []).some((k) => Number(k.value) === 900), want: "900 одной суммой" },
  { ask: "где я живу?", judge: (r) => valuesOf(r).some((v) => /Севиль/i.test(v)), want: "Севилья" },
  { ask: "where do I live?", judge: (r) => valuesOf(r).some((v) => /Севиль/i.test(v)), want: "Севилья (вопрос по-английски)" },
  { ask: "как меня зовут?", judge: (r) => valuesOf(r).some((v) => /Армстронг|Рома/i.test(v)), want: "имя" },
  { ask: "что было с Денисом?", judge: (r) => (r.known ?? []).some((k) => k.found_by === "graph" && /полк|Денис/i.test(String(k.value))), want: "история из графа" },
]
for (const c of CASES) {
  const t = Date.now()
  const r = await recall({ text: c.ask, who: WHO })
  const ok = r.ok && c.judge(r)
  say(ok, `«${c.ask}» → ${ok ? "верно" : "НЕ ТО"} (ждали ${c.want}) · глубина ${r.depth_used} · чем достали: ${foundBy(r)} · ${Date.now() - t} мс`)
  console.log(`      ответ: ${String(r.what_happened).slice(0, 110)}`)
}

// ── B: негативы ──────────────────────────────────────────────────────────────
const dog = await recall({ text: "какая порода у моей собаки?", who: WHO })
say(
  dog.ok && (dog.known ?? []).length === 0,
  `НЕГАТИВ: «порода собаки» → известных ${dog.known?.length ?? "?"}, ответ: ${String(dog.what_happened).slice(0, 80)}`,
)
say(
  (dog.not_yet_known ?? []).length > 0,
  `   и названо, чего не хватает: ${JSON.stringify(dog.not_yet_known ?? []).slice(0, 120)}`,
)

const lang = await recall({ text: "на каком языке со мной говорить?", who: WHO })
say(
  lang.ok && valuesOf(lang).some((v) => /русск/i.test(v)) && !valuesOf(lang).some((v) => /встреч|Денис/i.test(v)),
  `НЕГАТИВ: вопрос о языке не отдаёт встречу: ${valuesOf(lang).join(" | ") || "пусто"}`,
)

const alien = await recall({ text: "покажи скан паспорта", who: WHO })
const alienObjects = (alien.objects ?? []).length
say(alienObjects === 0, `НЕГАТИВ: объекты чужого человека не пришли: ${alienObjects} (у пробного человека своих объектов нет)`)

const all = await recall({ who: WHO })
say(
  all.ok && (all.known ?? []).length > 0 && all.used_model === false,
  `«всё известное» без вопроса: ${(all.known ?? []).length} значений, модель ${all.used_model}, глубина ${all.depth_used}`,
)

// ── уборка ───────────────────────────────────────────────────────────────────
if (!KEEP) {
  console.log("── уборка по своей метке ──")
  const t = await dataCall("/db/migrate", { params: [`${ROOT}%`], sql: "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ?" })
  let rows = 0
  for (const row of t.ok ? (t.body?.rows ?? []) : []) {
    const r = await dataCall("/db/migrate", { params: [WHO], sql: `DELETE FROM ${row.name} WHERE who = ?` })
    if (r.ok) rows += Number(r.body?.changes ?? 0)
  }
  const left = await dataCall("/db/migrate", { params: [WHO], sql: `SELECT COUNT(*) AS n FROM ${ROOT} WHERE who = ?` })
  say(Number(left.body?.rows?.[0]?.n ?? 0) === 0, `строк прибора удалено ${rows}, осталось ${left.body?.rows?.[0]?.n ?? "?"}`)
  const g = await forgetBySource(`memory/${WHO.replace(/[^\w.@-]/g, "_")}`)
  console.log(`   документы графа прибора: удалено ${g.deleted ?? 0}${g.background ? " (фоново)" : ""}`)
}

console.log(`${MARK} ${bad ? `ПРОВАЛОВ: ${bad}` : "всё сошлось"} ${new Date().toISOString()}`)
process.exit(bad ? 1 : 0)

#!/usr/bin/env node
//
// ПРИБОР 183-1 — СТЕНД ПОСЫЛАЕТ РОВНО ТО, ЧТО ДОГОВОР ПРИНИМАЕТ, И НАЗЫВАЕТ
// ОСТАЛЬНОЕ ВСЛУХ.
//
// 🔒 ЗАЧЕМ ОН НУЖЕН, ЕСЛИ ОРГАНЫ ВИДНЫ ГЛАЗАМИ. Глаза отвечают на вопрос «что
// нарисовано», и молчат о том, что уедет по проводу. Здесь проверяется второе:
// выставленный параметр либо в теле запроса, либо в списке «не доезжает».
// Третьего исхода — исчезнуть молча — у значения быть не должно.
//
// 🔒 С 200-4 ПРОВЕРЯЕТСЯ КАЖДЫЙ ОРГАН У КАЖДОГО ИЗ ДВУХ ГЛАГОЛОВ. ✗ До 200-4 сборка
// тела подставляла `null` органам «чужого» глагола: глубина у «Сказать», отрицание и
// требование таблицы у «Спросить» исчезали молча — прибор этого не видел, потому что
// спрашивал у записи только про `deny` и `need_table`, а у вопроса — только про пять.
//
// 🛑 ПРИБОР НИЧЕГО НЕ ПИШЕТ И НИЧЕГО НЕ УДАЛЯЕТ: он зовёт чистую функцию.
// Спрашивать у прибора надо не «что он проверяет», а «что он удаляет и чьё
// это» — здесь ответ «ничего», и это тоже измерение.

import { buildCall, EMPTY_PARAMS } from "../../lib/bench-call.mjs"
import { METHODS } from "../../contract.mjs"

let bad = 0
const say = (ok, what, extra = "") => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}${extra ? "  — " + extra : ""}`)
}

/** Что договор принимает у метода — порождено, а не переписано сюда руками. */
const paramsOf = (name) => (METHODS.find((m) => m.name === name)?.params ?? []).map((p) => p.name)

// Все органы выставлены разом: так стенд выглядит в худшем случае.
const FULL = {
  ...EMPTY_PARAMS,
  scope: [{ at: "2026-09-11", place: "Мадрид" }, { at: "", place: "Лондон" }, { at: "", place: "" }],
  deny: "это неверно, потому что я говорил другое",
  depth: "extreme",
  history: "до этого мы говорили о Денисе",
  historyOn: true,
  needTable: true,

  prior: "нашли только имя",
  priorOn: true,
  thread: "00000000-0000-0000-0000-000000000000",
  wantChain: true,
  who: "bench-1",
}

/** Имена органов в теле запроса — те же, что у параметров договора. */
const CONTROLS = ["depth", "history", "prior", "want_chain", "scope", "thread", "deny", "need_table"]

console.log("=".repeat(72))
console.log("ПРИБОР 183-1 / 200-4 — что уедет со стенда")
console.log("=".repeat(72))
console.log("")

// ── 1. ВОПРОС ────────────────────────────────────────────────────────────────
const ask = buildCall({
  lang: "ru",
  mode: "ask",
  params: FULL,
  supported: paramsOf("recall"),
  text: "что ты знаешь обо мне",
})
say(ask.method === "recall", "режим «спросить» зовёт recall", ask.method)
say(ask.body.who === "bench-1" && ask.body.text === "что ты знаешь обо мне", "имя и вопрос в теле")
say(ask.body.lang === "ru", "язык называет зовущий, а не угадывает служба")

// ── 2. ГЛАВНОЕ: КАЖДЫЙ ОРГАН У КАЖДОГО ГЛАГОЛА — ЛИБО В ТЕЛЕ, ЛИБО В «НЕ ДОЕЗЖАЕТ» ─
for (const [mode, verb] of [["say", "remember"], ["ask", "recall"]]) {
  const call = buildCall({ lang: "ru", mode, params: FULL, supported: paramsOf(verb), text: "фраза" })
  const declared = paramsOf(verb)
  for (const name of CONTROLS) {
    const inBody = name in call.body
    const inDropped = call.dropped.includes(name)
    say(
      inBody !== inDropped,
      `${verb} · «${name}»: ровно один исход`,
      inBody ? "уехал" : inDropped ? "назван «не доезжает»" : "ИСЧЕЗ МОЛЧА",
    )
    say(inBody === declared.includes(name), `${verb} · «${name}» уезжает ТОЛЬКО если объявлен договором`)
  }
}

// ── 3. ЗАПИСЬ ────────────────────────────────────────────────────────────────
const say_ = buildCall({
  lang: "ru",
  mode: "say",
  params: FULL,
  supported: paramsOf("remember"),
  text: "меня зовут Роман",
})
say(say_.method === "remember", "режим «сказать» зовёт remember", say_.method)
say(!("depth" in say_.body), "глубины у записи нет: запись не ищет", JSON.stringify(Object.keys(say_.body)))

// 🔒 ГЛУБИНА «СТАНДАРТ» — УМОЛЧАНИЕ, А НЕ ВЫСТАВЛЕННОЕ ЗНАЧЕНИЕ: у записи она не
// называется «не доезжает», иначе строка висела бы на экране всегда.
const plainSay = buildCall({ lang: "ru", mode: "say", params: EMPTY_PARAMS, supported: paramsOf("remember"), text: "фраза" })
say(!plainSay.dropped.includes("depth"), "стандартная глубина у записи не шумит «не доезжает»", plainSay.dropped.join(", ") || "пусто")

// ── 4. НЕГАТИВНЫЙ КОНТРОЛЬ: ПУСТОЙ ДОГОВОР ───────────────────────────────────
// 🔒 ЭТО И ЕСТЬ ПРОВЕРКА САМОГО ПРИБОРА: скажи мы, что договор не принимает
// ничего, — ни один орган не имеет права оказаться в теле. Прибор, не умеющий
// ответить «ничего не уехало», зелен по причине собственной слепоты.
for (const mode of ["say", "ask"]) {
  const none = buildCall({ lang: "ru", mode, params: FULL, supported: [], text: "вопрос" })
  const leaked = CONTROLS.filter((n) => n in none.body)
  say(leaked.length === 0, `НЕГАТИВНЫЙ (${mode}): пустой договор — ни один орган не уехал`, leaked.join(", ") || "утечек нет")
  say(
    none.dropped.length === CONTROLS.length,
    `НЕГАТИВНЫЙ (${mode}): всё выставленное названо непринятым`,
    `${none.dropped.length} из ${CONTROLS.length}`,
  )
}

// ── 5. ОХВАТ ЕДЕТ СПИСКОМ, А ПУСТЫЕ КАРТОЧКИ ОТСЕИВАЮТСЯ (183-7) ─────────────
const sentScope = ask.body.scope
say(Array.isArray(sentScope), "охват уехал списком", JSON.stringify(sentScope))
say(
  Array.isArray(sentScope) && sentScope.length === 2,
  "из трёх карточек уехали две заполненные",
  `${Array.isArray(sentScope) ? sentScope.length : "—"} из 3`,
)
say(
  Array.isArray(sentScope) && !("at" in (sentScope[1] ?? {})),
  "у карточки без даты поля даты нет вовсе, а не пустая строка",
  JSON.stringify(sentScope?.[1]),
)

// ── 6. НЕГАТИВНЫЙ КОНТРОЛЬ: НИЧЕГО НЕ ВЫСТАВЛЕНО ─────────────────────────────
// 🔒 «ПУСТО» НЕ ЗНАЧИТ «НИ ОДНОГО ПАРАМЕТРА»: у вопроса глубина выставлена ВСЕГДА —
// стандарт и есть её умолчание. Проверяем, что пустое поле не рождает `text`, а
// прочие органы молчат у обоих глаголов.
for (const [mode, verb] of [["say", "remember"], ["ask", "recall"]]) {
  const empty = buildCall({ lang: "ru", mode, params: EMPTY_PARAMS, supported: paramsOf(verb), text: "" })
  const emptyNames = [...Object.keys(empty.body), ...empty.dropped].filter(
    (n) => n !== "lang" && n !== "who" && n !== "depth",
  )
  say(
    emptyNames.length === 0 && !("text" in empty.body),
    `НЕГАТИВНЫЙ (${verb}): пустые органы ничего не досочиняют`,
    emptyNames.join(", ") || JSON.stringify(empty.body),
  )
}

// ── 7. ВЛОЖЕНИЯ «СКАЗАТЬ» (200-5): ССЫЛКИ ДВУХ РОДОВ, ФАЙЛЫ, НЕВЕРНЫЙ РОД ─────
const VIDEO = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
const PAGE = "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/200"
const withAttach = { ...EMPTY_PARAMS, files: [{ name: "a.md", size: 3 }], links: [PAGE, ""], youtube: [VIDEO] }
const sayAttach = buildCall({ lang: "ru", mode: "say", params: withAttach, supported: paramsOf("remember"), text: "фраза" })
say(JSON.stringify(sayAttach.body.links) === JSON.stringify([PAGE]), "«Сказать»: страница уехала в links, пустая строка отсеяна", JSON.stringify(sayAttach.body.links))
say(JSON.stringify(sayAttach.body.youtube) === JSON.stringify([VIDEO]), "«Сказать»: ролик уехал в youtube", JSON.stringify(sayAttach.body.youtube))
say(sayAttach.files.length === 1 && !("files" in sayAttach.body), "«Сказать»: файл едет частью формы, а не телом JSON")
say(sayAttach.invalid.length === 0, "«Сказать»: у ссылок своего рода отказа нет")
const swapped = buildCall({ lang: "ru", mode: "say", params: { ...EMPTY_PARAMS, links: [VIDEO], youtube: [PAGE] }, supported: paramsOf("remember"), text: "фраза" })
say(swapped.invalid.length === 2, "НЕГАТИВНЫЙ: ролик в links и страница в youtube названы неверными", JSON.stringify(swapped.invalid))
const askAttach = buildCall({ lang: "ru", mode: "ask", params: withAttach, supported: paramsOf("recall"), text: "вопрос" })
say(
  !("links" in askAttach.body) && askAttach.dropped.includes("links") && askAttach.dropped.includes("files") && askAttach.files.length === 0,
  "«Спросить»: вложения не уезжают и названы «не доезжает»",
  askAttach.dropped.join(", "),
)

console.log("")
console.log("-".repeat(72))
if (bad === 0) {
  console.log("✓ ВСЁ ЗЕЛЁНОЕ: стенд посылает объявленное и называет непринятое")
  process.exit(0)
}
console.log(`🛑 ПРОВАЛОВ: ${bad}`)
process.exit(1)

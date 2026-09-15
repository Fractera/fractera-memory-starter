// ПРИБОР 201-9 — ВОРОТА ЗАПИСИ БЕЗ МОДЕЛИ: ЧЕТЫРЕ ДЕФЕКТА ПЕРВОГО ПРОГОНА НА ЖИВЫХ ОТВЕТАХ.
//
// 🔒 ВХОДЫ ВЗЯТЫ ИЗ ЖУРНАЛА ПАМЯТИ ПРОГОНА 2026-09-15 00:40, А НЕ ПРИДУМАНЫ: те самые ответы модели,
// на которых запись ошиблась. Прибор не зовёт ни модель, ни сеть — квота до 03:50 UTC пуста, а ворота
// обязаны быть проверены до повторного большого прогона.
//
// Запуск: node scripts/probe/write-gate-201-9.mjs

import { gateFacts, NEW_KIND_MAX_WORDS, parseModelJson } from "../../lib/write-gate.mjs"
import { kindOf, readFeatures } from "../../lib/features.mjs"

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}
const registry = new Map(readFeatures().map((f) => [kindOf(f.key), f]))

console.log("===PROBE_201_9_GATE=== start")

// ① W8 — верный JSON в ограде с хвостом (ответ модели из журнала, сокращён до формы).
const w8 =
  '```json\n{\n  "facts": [\n    {\n      "kind": "currency_he_counts_money_in",\n      "value": "евро",\n      "about_himself": true,\n      "claim": "said",\n      "intent": "add"\n    }\n  ]\n}\n```\nЯ выделил валюту как текущее значение.'
const parsed = parseModelJson(w8)
say(parsed?.facts?.[0]?.value === "евро", `① ограда с хвостом разобрана: ${JSON.stringify(parsed?.facts?.[0] ?? null)}`)
say(parseModelJson('{"a":"скобка } внутри строки","b":1} и ещё текст')?.b === 1, "   скобка внутри строки не рвёт объект")
say(parseModelJson("модель ничего не вернула по форме") === null, "   НЕГАТИВ: текст без JSON → null, а не выдуманный объект")

// ② W4 — история второго порядка под придуманным родом.
const w4 = [
  { about_himself: true, claim: "said", kind: "people_he_calls_his_friends", shape: "value", value: "Денис" },
  { about_himself: true, claim: "said", kind: "how_long_he_has_known_his_friend_denis", value: "знакомы со школы, много лет дружим" },
]
const g4 = gateFacts(w4, registry)
say(g4.toTable.map((f) => f.kind).join() === "people_he_calls_his_friends", `② в таблицу только друг: ${g4.toTable.map((f) => f.kind).join(", ")}`)
say(g4.toGraphOnly.some((g) => g.fact.kind === "how_long_he_has_known_his_friend_denis"), `   история ушла в граф: ${g4.toGraphOnly.map((g) => g.why).join("; ")}`)

// ③ W2 — длинное значение и два «текущих города» из одной фразы.
const w2 = [
  { kind: "city_where_he_lives_now", shape: "value", value: "Севилья" },
  { kind: "city_where_he_lives_now", value: "снимает квартиру в тихом районе недалеко от парка" },
]
const g2 = gateFacts(w2, registry)
say(g2.toTable.length === 1 && g2.toTable[0].value === "Севилья", `③ у текущего признака одно значение: ${g2.toTable.map((f) => f.value).join(" | ")}`)
say(g2.toGraphOnly.length === 1, `   второе значение ушло в граф: ${g2.toGraphOnly.map((g) => g.why).join("; ")}`)
const listKind = gateFacts(
  [
    { kind: "spent_on_a_purchase", shape: "value", value: "молоко — 200 руб" },
    { kind: "spent_on_a_purchase", shape: "value", value: "колбаса — 300 руб" },
  ],
  registry,
)
say(listKind.toTable.length === 2, `   НЕГАТИВ: у списочного признака (траты) оба значения остаются в таблице: ${listKind.toTable.length}`)

// ④ W11 — содержимое файла как факт о проектах: модель теперь метит его рассказом.
const w11 = [{ kind: "projects_he_is_working_on", shape: "story", value: "план на сентябрь: отчётность, Порту, стоматолог, резина" }]
const g11 = gateFacts(w11, registry)
say(g11.toTable.length === 0 && g11.toGraphOnly.length === 1, `④ рассказ в таблицу не идёт: ${g11.toGraphOnly.map((g) => g.why).join("; ")}`)

// Граница нового рода: короткое значение вне реестра законно.
const fresh = gateFacts([{ kind: "car_model_he_drives_every_day", shape: "value", value: "Nissan Teana 2015" }], registry)
say(fresh.toTable.length === 1, `НЕГАТИВ: короткое значение нового рода (≤${NEW_KIND_MAX_WORDS} слов) законно ложится в таблицу`)

console.log(`===PROBE_201_9_GATE=== ${bad ? `ПРОВАЛОВ: ${bad}` : "всё сошлось"}`)
process.exit(bad ? 1 : 0)

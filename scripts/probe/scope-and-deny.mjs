#!/usr/bin/env node
//
// ПРИБОР 183-6 — ОХВАТ, ОТРИЦАНИЕ И ТРЕБОВАНИЕ ТАБЛИЦЫ: НИ ОДИН НЕ ИСЧЕЗАЕТ.
//
// 🔒 ГЛАВНОЕ УТВЕРЖДЕНИЕ ЭТОГО ЗАМЕРА — НЕ «ВСЁ РАБОТАЕТ», А «У КАЖДОГО ЕСТЬ
// НАЗВАННАЯ СУДЬБА». Один параметр принят и подействовал, другой принят без
// способности, третий отвергнут по форме — и все три сказаны словами. Молчание
// про присланное есть отдельный класс дефекта: агент шлёт, ничего не
// происходит, ни отказа, ни записи.

import { call, cleanup, fate, scoreboard } from "./_call.mjs"

const WHO = "probe-183-6"
const TABLE = "person_who_owns_this_project__people_he_calls_his_friends"
const s = scoreboard("ПРИБОР 183-6 — охват, отрицание, требование таблицы")

// ── ОХВАТ: ПРИНЯТ, И ПРЕДЕЛ НАЗВАН ───────────────────────────────────────────
const scoped = await call("remember", {
  lang: "ru",
  scope: [
    { at: "2026-09-11", place: "Мадрид" },
    { place: "Лондон" },
    { at: "2026-09-10" },
  ],
  text: "я говорю с вами по-русски",
  who: WHO,
})
{
  const f = fate(scoped.data, "scope")
  s.say(f?.state === "accepted", "список охватов из трёх записей принят", f?.state ?? "строки нет")
  s.say(
    Boolean(f?.note) && f.note.includes("охват"),
    "предел назван словами, а не умолчанием",
    f?.note ?? "—",
  )
}

// ── ОТРИЦАНИЕ: ПРИНЯТО ПО ФОРМЕ, СПОСОБНОСТИ НЕТ, И ЭТО СКАЗАНО ──────────────
const denied = await call("remember", {
  deny: "это неверно, я говорю по-украински",
  lang: "ru",
  text: "уточняю про язык",
  who: WHO,
})
const d = fate(denied.data, "deny")
s.say(d?.state === "not_supported", "«deny»: способности нет — и это названо, а не молчание", d?.state ?? "строки нет")
s.say(
  Boolean(d?.note) && d.note.includes("дообучения"),
  "«deny»: сказано, ЧЕГО именно не построено",
  d?.note ?? "—",
)

// ── ТРЕБОВАНИЕ ТАБЛИЦЫ: РОД ПОДНИМАЕТСЯ, НЕ ДОЖИДАЯСЬ ВТОРОГО ЗНАЧЕНИЯ ───────
const table = await call("remember", {
  lang: "ru",
  need_table: true,
  text: "мой друг Дима",
  who: WHO,
})
const t = fate(table.data, "need_table")
s.say(t?.state === "accepted", "«need_table» принят", t?.state ?? "строки нет")
s.say(
  Array.isArray(table.data?.promoted) && table.data.promoted.length > 0,
  "требование исполнено: род поднят в свою таблицу",
  JSON.stringify(table.data?.promoted ?? []),
)

// ── НЕГАТИВНЫЙ КОНТРОЛЬ: ДАТА НЕ ТОЙ ФОРМЫ ──────────────────────────────────
// 🔒 БЕЗ НЕГО ОХВАТ ЗАПОЛНЯЕТСЯ МУСОРОМ, КОТОРЫЙ ПОТОМ НЕОТЛИЧИМ ОТ ЗНАНИЯ.
// «Позавчера вечером» — не дата, и уехать в охват молча она не имеет права.
const bad = await call("remember", {
  scope: [{ at: "2026-09-11" }, { at: "позавчера вечером" }],
  lang: "ru",
  text: "я живу в Мадриде",
  who: WHO,
})
const b = fate(bad.data, "scope")
s.say(b?.state === "bad_form", "НЕГАТИВНЫЙ: свободная фраза охватом не становится", b?.state ?? "строки нет")
s.say(
  Boolean(b?.note) && b.note.includes("запись 2"),
  "НЕГАТИВНЫЙ: названа НОМЕРОМ та запись, которая подвела",
  b?.note ?? "—",
)
s.say(
  Boolean(b?.note) && b.note.includes("гггг-мм-дд"),
  "НЕГАТИВНЫЙ: сказано, какая форма нужна",
  b?.note ?? "—",
)
s.say(bad.data?.ok === true, "НЕГАТИВНЫЙ: кривой параметр не уронил весь вызов", `ok=${bad.data?.ok}`)

// ── НЕГАТИВНЫЙ КОНТРОЛЬ: ПУСТЫЕ ФОРМЫ ОХВАТА ────────────────────────────────
// 🔒 ПУСТОЙ ОХВАТ ВЫРАЖАЕТСЯ ОТСУТСТВИЕМ ПОЛЯ, А НЕ ПУСТЫМ СПИСКОМ И НЕ
// ЗАПИСЬЮ-ПУСТЫШКОЙ. Пропусти мы их — охват заполнялся бы ничем, и «здесь
// что-то есть» стало бы неотличимо от знания.
const emptyList = await call("remember", { lang: "ru", scope: [], text: "я живу в Мадриде", who: WHO })
s.say(
  fate(emptyList.data, "scope")?.state === "bad_form",
  "НЕГАТИВНЫЙ: пустой список охватом не становится",
  fate(emptyList.data, "scope")?.note ?? "строки нет",
)
const emptyEntry = await call("remember", {
  lang: "ru",
  scope: [{ at: "", place: "" }],
  text: "я живу в Мадриде",
  who: WHO,
})
s.say(
  fate(emptyEntry.data, "scope")?.state === "bad_form",
  "НЕГАТИВНЫЙ: запись без даты и места отвергнута",
  fate(emptyEntry.data, "scope")?.note ?? "строки нет",
)

// ── НЕГАТИВНЫЙ КОНТРОЛЬ: НИЧЕГО НЕ ПРИСЛАЛИ — СТРОК СУДЬБЫ НЕТ ──────────────
const plain = await call("recall", { lang: "ru", who: WHO })
s.say(
  !("params" in (plain.data ?? {})),
  "НЕГАТИВНЫЙ: о неприсланном ответ молчит — отчёт не шумит",
  "params" in (plain.data ?? {}) ? "поле есть — это провал" : "поля нет",
)

await cleanup(WHO, [
  "person_who_owns_this_project",
  "person_who_owns_this_project__what_he_told_us_before",
  TABLE,
])
console.log("")
console.log(`(убрано по метке who = ${WHO}; чужих строк прибор не трогает)`)

s.done("у каждого присланного параметра названа судьба, кривой отвергнут по форме")

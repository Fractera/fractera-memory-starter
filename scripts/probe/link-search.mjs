#!/usr/bin/env node
// ПРИБОР 195-8: ПОИСК ССЫЛОК НАХОДИТ СОХРАНЁННУЮ ССЫЛКУ ПО СМЫСЛУ И НЕ НАХОДИТ ОБЪЕКТЫ ДРУГОГО РОДА.
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА (паспорт §20.6 ①): «Найди среди тех которые я ранее анализировал… полное описание краткое описание и самому ссылку».
// 🔒 ПУТЬ ВЛАДЕЛЬЦА: публичный `https://memory.aifa.dev`, двери `link-search`, `object-search`, `object-test?object=`, секрет машины.
// 🔒 МОДЕЛЬ НЕ ЗОВЁТСЯ, ЗАПИСИ НЕТ: ищется ссылка владельца №29 (`https://fractera.ai`), уже лежащая в памяти; прогоны помечены `probe`
// и в корпус случаев не пишутся — это проверяется счётом.
// 🔒 НЕГАТИВЫ: PDF-объект владельца №13 находит дверь объектов (контроль) и НЕ находит дверь ссылок · бессмыслица — `found:false`.
// 🛑 ПОРОГ — ПОРОГ ОБЪЕКТОВ 0.30, НА ССЫЛКАХ НЕ ИЗМЕРЕН: числа близости печатаются целиком.
//
// Запуск на сервере: node scripts/probe/link-search.mjs

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "https://memory.aifa.dev"
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const LINK_OBJECT = "0e445756-d010-4c71-9334-4968ef605630"
const PDF_OBJECT = "32f502d8-e85e-4c0c-b0be-efb17c70dbda"

function machineEnv(name) {
  try {
    for (const line of readFileSync("/etc/fractera/secrets.env", "utf8").split("\n")) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    }
  } catch { /* вне сервера — пусто */ }
  return ""
}
const KEY = process.env.DATA_SECRET || machineEnv("DATA_SECRET")
const H = { "Content-Type": "application/json", "X-Data-Secret": KEY }
const sql = async (text, params = []) =>
  (await fetch(`${DATA}/db/migrate`, { body: JSON.stringify({ params, sql: text }), headers: H, method: "POST" })).json()
const cases = async () => Number((await sql("SELECT COUNT(*) AS n FROM memory_bench_cases")).rows?.[0]?.n ?? -1)

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}
const ask = async (door, question) => {
  const r = await fetch(`${BASE}/api/fractera/${door}`, { body: JSON.stringify({ probe: true, question }), headers: H, method: "POST" })
  return { j: await r.json().catch(() => ({})), status: r.status }
}
const view = async (id) => (await (await fetch(`${BASE}/api/fractera/object-test?object=${encodeURIComponent(id)}`, { headers: H })).json().catch(() => ({})))
const scores = (hits) => (hits ?? []).map((h) => `${Number(h.score).toFixed(3)}${h.far ? "·far" : ""} ${String(h.name).slice(0, 28)}`).join(" | ")

console.log("===PROBE_LINK_SEARCH===")
const casesBefore = await cases()

// ── A: ссылка владельца находится другими словами ────────────────────────────
const a = await ask("link-search", "платформа, которая сама ставит ИИ-агентов на свой сервер")
say(a.status === 200 && a.j.ok === true, `A: дверь ${a.status}, порог ${a.j.threshold}, за ${a.j.askMs} мс`)
console.log(`   кандидаты: ${scores(a.j.hits)}`)
say(a.j.found === true && a.j.near?.[0]?.id === LINK_OBJECT, `A: первым найдена ссылка №29 (${a.j.near?.[0]?.id ?? "ничего"})`)
const v = a.j.near?.[0] ? await view(a.j.near[0].id) : {}
say(v.row?.kind === "web" && v.row?.url === "https://fractera.ai" && String(v.object?.about ?? "").length > 1000,
  `A: у найденного блок — род ${v.row?.kind}, адрес ${v.row?.url}, полное описание ${String(v.object?.about ?? "").length} знаков, саммари ${String(v.row?.summary ?? "").length}`)
let foreign = 0
for (const h of a.j.hits ?? []) {
  const hv = await view(h.id)
  if (hv.row?.kind !== "web") foreign++
}
say(foreign === 0, `A: среди всех ${a.j.hits?.length ?? 0} кандидатов объектов другого рода ${foreign}`)

// ── B: PDF-объект — дверь объектов находит, дверь ссылок нет ─────────────────
const QPDF = "скан заграничного паспорта Анны Егоровой"
const bo = await ask("object-search", QPDF)
console.log(`   объекты: ${scores(bo.j.hits)}`)
say((bo.j.near ?? []).some((h) => h.id === PDF_OBJECT), "B контроль: дверь объектов находит PDF №13")
const bl = await ask("link-search", QPDF)
console.log(`   ссылки: ${scores(bl.j.hits)}`)
say(!(bl.j.hits ?? []).some((h) => h.id === PDF_OBJECT), "B: дверь ссылок PDF №13 не отдаёт даже дальним кандидатом")

const nonsense = await ask("link-search", "квантовая свёкла летучих гиппопотамов на Юпитере")
say(nonsense.j.ok === true && nonsense.j.found === false, `B: бессмыслица → found=${nonsense.j.found}, ближайшее ${nonsense.j.nearest?.score?.toFixed?.(3) ?? "—"}`)

const casesAfter = await cases()
say(casesAfter === casesBefore, `B: корпус случаев до ${casesBefore} = после ${casesAfter} (прогоны probe не пишутся)`)

console.log(failed ? `✗ ПРОВАЛ: ${failed}` : "✓ OK")
console.log("===PROBE_LINK_SEARCH_DONE===")
process.exit(failed ? 1 : 0)

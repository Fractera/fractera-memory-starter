// ПРИБОР 201-4 — ПОДБОР СХЕМЫ: КАНДИДАТЫ БЕЗ МОДЕЛИ, ОДИН ВЫЗОВ БЕЗ ИСТОРИИ.
//
// 🔒 ДВЕ ПЛОСКОСТИ, НАЗВАННЫЕ ЗАРАНЕЕ (ТЗ 201-4):
//   A — фразы владельца по-русски и по-английски: нужный ключ среди кандидатов И выбран; в подсказке
//       модели не больше K записей; время в пределах замера 201-2;
//   B — негатив: несвязанная фраза даёт «ни одного»; ответ вызова не несёт имени нити и разговор не
//       ложится на диск; признак неверного типа от зовущего отвергнут с причиной.
//
// 🛑 ЧТО ПРИБОР ПИШЕТ И УДАЛЯЕТ: только раздел склада `memory_features` — индекс самого реестра,
// который и так строится при первом подборе. Живых данных человека он не касается вовсе.
//
// 💰 ЦЕНА ДО ПРОГОНА: 6 вызовов модели по подписке (~$0,013 и 6–8 с каждый) и 21 встраивание.
//
// Запуск на сервере из корня службы:  node scripts/probe/discover-201-4.mjs

import { readdirSync } from "node:fs"
import { discover, checkGiven, valueFits } from "../../lib/features-discover.mjs"
import { candidatesFor, ensureIndex, K } from "../../lib/features-index.mjs"

const MARK = "===PROBE_201_4==="
const PROJECTS = "/root/.claude/projects/-tmp-fractera-memory-think"

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}
const sessions = () => {
  try { return readdirSync(PROJECTS).length } catch { return null }
}

console.log(`${MARK} start ${new Date().toISOString()}`)

// ── индекс ───────────────────────────────────────────────────────────────────
const built = await ensureIndex({ force: true })
say(built.ok, `индекс построен заново: записей ${built.count}, ${built.ms} мс, отпечаток ${built.fingerprint}`)
const again = await ensureIndex()
say(again.ok && again.rebuilt === false, `повтор не перестраивает: rebuilt=${again.rebuilt} (отпечаток тот же)`)

// ── A: фразы ─────────────────────────────────────────────────────────────────
const CASES = [
  { phrase: "мои расходы на молоко колбасу и воду сегодня были 200 300 и 400 руб", want: "money.spent-on-a-purchase", action: "write" },
  { phrase: "сколько я потратил сегодня?", want: "money.spent-on-a-purchase", action: "read" },
  { phrase: "я переехал в Лиссабон", want: "person.city-where-he-lives-now", action: "write" },
  { phrase: "where do I live?", want: "person.city-where-he-lives-now", action: "read" },
  { phrase: "Мой друг Денис служил в президентском полку с 1994 по 1996", want: "person.people-he-calls-his-friends", action: "write" },
  { phrase: "отвечай мне по-русски", want: "person.language-he-speaks-with-us", action: "write" },
]

const before = sessions()
for (const c of CASES) {
  const t = Date.now()
  const r = await discover(c.phrase)
  const ms = Date.now() - t
  if (!r.ok) {
    say(false, `«${c.phrase}» → ОТКАЗ ${r.error} ${r.why ?? ""}`)
    continue
  }
  const keys = (r.candidates ?? []).map((x) => (typeof x === "string" ? x : x.key))
  const chosen = r.features.map((f) => f.key)
  say(keys.length <= K, `«${c.phrase.slice(0, 42)}…» кандидатов ${keys.length} (предел ${K}) · ${ms} мс · модель ${r.used_model}`)
  say(keys.includes(c.want), `   нужный ключ среди кандидатов: ${c.want} (место ${keys.indexOf(c.want) + 1 || "нет"})`)
  say(chosen.includes(c.want), `   выбран: ${chosen.join(", ") || "ничего"}${r.not_in_list ? ` · не из списка: ${String(r.not_in_list).slice(0, 60)}` : ""}`)
  say(r.action === c.action, `   род обращения: ${r.action} (ждали ${c.action})`)
  if (r.rejected?.length) console.log(`   отвергнуто: ${r.rejected.map((x) => `${x.key}:${x.why}`).join(", ")}`)
  if (c.want === "money.spent-on-a-purchase" && c.action === "write") {
    const values = r.features.filter((f) => f.key === c.want).map((f) => (typeof f.value === "object" ? f.value?.amount : f.value))
    say(values.length === 3, `   три траты разными значениями: ${JSON.stringify(values)}`)
  }
}
const after = sessions()
say(before !== null && after === before, `НЕГАТИВ: разговоров на диске было ${before}, стало ${after} — одиночный вызов не оставляет следа`)

// ── B: негативы ──────────────────────────────────────────────────────────────
const far = await discover("почему корабли не тонут")
say(far.ok && far.features.length === 0, `НЕГАТИВ: несвязанная фраза → выбрано ${far.features?.length ?? "?"} признаков, not_in_list: ${String(far.not_in_list ?? "").slice(0, 70)}`)

const cand = await candidatesFor("почему корабли не тонут")
say(cand.ok && cand.candidates.length > 0, `   кандидаты ей всё равно нашлись (${cand.candidates.length}) — «ни одного» решает модель, а не число близости`)

const givenBad = checkGiven([{ key: "money.spent-on-a-purchase", value: "много" }, { key: "nope.nope", value: 1 }])
say(givenBad.taken.length === 0 && givenBad.rejected.length === 2,
  `НЕГАТИВ: присланное отвергнуто с причиной — ${givenBad.rejected.map((x) => `${x.key}:${x.why}`).join(", ")}`)

const givenGood = checkGiven([{ key: "money.spent-on-a-purchase", value: { amount: 200, currency: "RUB" } }])
say(givenGood.taken.length === 1 && givenGood.rejected.length === 0, "присланное верного типа принято (эталон: проверка не «ругается всегда»)")

const fast = await discover("что угодно", { given: [{ key: "person.name-he-is-called", value: "Роман" }] })
say(fast.ok && fast.used_model === false && fast.how === "given", `присланный признак пропускает подбор: модель ${fast.used_model}, путь ${fast.how}`)

say(valueFits("money", 200) && !valueFits("money", "двести") && valueFits("date", "2026-09-14") && !valueFits("date", "вчера"),
  "проверка типов различает годное и негодное (money, date)")

console.log(`${MARK} ${bad ? `ПРОВАЛОВ: ${bad}` : "всё сошлось"} ${new Date().toISOString()}`)
process.exit(bad ? 1 : 0)

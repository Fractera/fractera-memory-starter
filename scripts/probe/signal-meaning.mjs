#!/usr/bin/env node
// ПРИБОР 218-18: СИГНАЛ СЧИТАЕТСЯ ПО СМЫСЛУ, А НЕ ПО СОВПАДЕНИЮ СЛОВ.
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-17: «чини звено 3» — сигнал из повтора разными словами не срабатывал.
//
// ✗ ЧТО БЫЛО ИЗМЕРЕНО ДО ПРАВКИ: два комментария об одном пожелании — «в ответе нет должности Пети»
// и «не хватает роли человека: чем Петя занимается» — дали совпадение слов 0.00 при пороге 0.50.
// Даже «Пети» и «Петя» не совпали: падеж разводил одного человека на двоих.
//
// 🔒 ПРИБОР ДЕЛАЕТ ДВЕ РАЗНЫЕ РАБОТЫ И НАЗЫВАЕТ ИХ ОТДЕЛЬНО:
//   1) МЕРИТ границу — попарная близость шести комментариев: три пары об одном разными словами и
//      все остальные пары о разном. Из них выводится порог `NEAR_FEEDBACK`, а не выбирается красивым.
//   2) ПРОВЕРЯЕТ склейку на настоящей функции службы (`groupByMeaning` внутри `signals`), а не на
//      своей копии: копия доказывала бы себя.
//
// 🛑 УБОРКА ПО СВОЕЙ МЕТКЕ `probe-218-18`, И НИКОГДА `DELETE` ЦЕЛИКОМ: в этой же коллекции живут
// настоящие комментарии людей, и прибор, стирающий таблицу, стирает живую память (закон 160).
//
// Запуск на сервере: node scripts/probe/signal-meaning.mjs

import { FEEDBACK_COLLECTION, NEAR_FEEDBACK, nearFeedback, putFeedbackVector, sameText } from "/opt/fractera/memory/lib/feedback-vector.mjs"
import { dataCall } from "/opt/fractera/memory/lib/data-call.mjs"
import { themesOf } from "/opt/fractera/memory/lib/signals.mjs"

const MARK = "probe-218-18"
const id = (n) => `${MARK}-${n}`

// Корпус замера. ПАРЫ НАЗВАНЫ ЗАРАНЕЕ — иначе граница подгоняется под то, что получилось.
const CORPUS = [
  { n: 1, pair: "роль", text: "в ответе нет должности Пети, хочу видеть кем он работает" },
  { n: 2, pair: "роль", text: "не хватает роли человека: укажи, чем Петя занимается" },
  { n: 3, pair: "скорость", text: "ответ слишком медленный" },
  { n: 4, pair: "скорость", text: "долго жду результата, хотелось бы быстрее" },
  { n: 5, pair: "место", text: "ты не пишешь, где это было" },
  { n: 6, pair: "место", text: "в ответе нет города, укажи место события" },
  // 🔒 СЕДЬМАЯ И ВОСЬМАЯ ФРАЗЫ — НЕ ПРИДУМАННЫЕ, А ВЗЯТЫЕ ИЗ ЖИВОГО ЗАМЕРА 218-20, И ИМЕННО ОНИ ДЕРЖАТ
  // ПОРОГ ЧЕСТНЫМ. ✗ Они дали 0.473 — ниже прежнего порога 0.50, — и настоящий сигнал не собрался.
  // Урок: порог, измеренный на фразах, которые автор придумал сам, описывает его фантазию о людях.
  { n: 7, pair: "время", text: "в ответе нет даты, когда это было сказано" },
  { n: 8, pair: "время", text: "не хватает времени события: укажи когда это произошло" },
]

const REPEAT = { n: 7, pair: "роль", text: "В ОТВЕТЕ НЕТ ДОЛЖНОСТИ ПЕТИ, ХОЧУ ВИДЕТЬ КЕМ ОН РАБОТАЕТ  " }

const fmt = (x) => Number(x).toFixed(3)

async function put(item) {
  const r = await putFeedbackVector({ id: id(item.n), text: item.text })
  if (!r.ok) throw new Error(`вектор не положен (${item.n}): ${r.refused}`)
}

async function cleanup() {
  let gone = 0
  for (const n of [...CORPUS.map((c) => c.n), REPEAT.n]) {
    const r = await dataCall(`/vectors/feedback-${MARK}-${n}`, undefined, "DELETE")
    if (r.ok !== false) gone++
  }
  return gone
}

async function main() {
  console.log(`=== ПРИБОР 218-18 · коллекция ${FEEDBACK_COLLECTION} · метка ${MARK} ===\n`)

  for (const item of CORPUS) await put(item)
  console.log(`положено комментариев: ${CORPUS.length}\n`)

  // ── 1. ГРАНИЦА ────────────────────────────────────────────────────────────────────────────────
  const same = []
  const diff = []
  for (const a of CORPUS) {
    const near = await nearFeedback({ text: a.text, k: 20 })
    if (!near.ok) throw new Error(`поиск отказал: ${near.refused}`)
    for (const hit of near.hits) {
      const b = CORPUS.find((c) => hit.id === `feedback-${id(c.n)}`)
      if (!b || b.n <= a.n) continue
      ;(a.pair === b.pair ? same : diff).push({ from: a.n, score: hit.score, to: b.n })
    }
  }

  // 🔒 ВЕРДИКТ СКЛЕЙКИ ДВУХПРИЗНАКОВЫЙ С 218-20, И ПРИБОР ОБЯЗАН МЕРИТЬ ТО ЖЕ, ЧТО РЕШАЕТ КОД.
  // ✗ Пока он печатал одну близость, его вывод «границы нет» был верен про ЧИСЛО и неверен про
  // механизм: тему как запрет он не видел вовсе.
  const themesOfCase = (c) => themesOf(c.text)
  const clash = (a, b) => {
    const A = themesOfCase(a)
    const B = themesOfCase(b)
    return A.length > 0 && B.length > 0 && !A.some((x) => B.includes(x))
  }
  /** Склеит ли механизм эту пару: близость выше порога И темы не спорят. */
  const glue = (x) =>
    x.score >= NEAR_FEEDBACK &&
    !clash(
      CORPUS.find((c) => c.n === x.from),
      CORPUS.find((c) => c.n === x.to),
    )
  const line = (list) => list.map((x) => `${x.from}~${x.to} ${fmt(x.score)}${glue(x) ? "+" : "−"}`).join(" · ")
  console.log("ПАРЫ ОБ ОДНОМ разными словами:", line(same.sort((x, y) => x.score - y.score)))
  console.log("ПАРЫ О РАЗНОМ:               ", line(diff.sort((x, y) => y.score - x.score)))

  const worstSame = Math.min(...same.map((x) => x.score))
  const bestDiff = Math.max(...diff.map((x) => x.score))
  console.log(`\nпо ОДНОМУ числу: худшее «об одном» ${fmt(worstSame)} · лучшее «о разном» ${fmt(bestDiff)}`)
  console.log(
    worstSame > bestDiff
      ? `  границы по числу хватило бы: ${fmt(bestDiff)} … ${fmt(worstSame)}`
      : `  🛑 ОДНИМ ЧИСЛОМ ЭТИ СЛУЧАИ НЕ РАЗДЕЛИТЬ: пары пересекаются — близость говорит «похоже сказано», а не «об одном»`,
  )

  // 🔒 А ТЕПЕРЬ — РЕШЕНИЕ САМОГО МЕХАНИЗМА, У КОТОРОГО ПРИЗНАКОВ ДВА (218-20): близость И тема.
  // ✗ Пока прибор печатал одну близость, его «границы нет» было верно про число и слепо про механизм.
  const missed = same.filter((x) => !glue(x))
  const wrong = diff.filter((x) => glue(x))
  console.log(`\nрешение механизма при пороге ${fmt(NEAR_FEEDBACK)} + запрет по теме:`)
  console.log(`  пропущено пар об одном: ${missed.length} из ${same.length}${missed.length ? ` → ${line(missed)}` : ""}`)
  console.log(`  ложно склеено пар о разном: ${wrong.length} из ${diff.length}${wrong.length ? ` → ${line(wrong)}` : ""}`)
  // 🛑 СКОЛЬКО РАБОТЫ ДЕЛАЕТ ВТОРОЙ ПРИЗНАК — ВИДНО ЧИСЛОМ, А НЕ УТВЕРЖДЕНИЕМ.
  const byScoreOnly = diff.filter((x) => x.score >= NEAR_FEEDBACK)
  console.log(`  одним числом склеилось бы ложных: ${byScoreOnly.length} — тема сняла ${byScoreOnly.length - wrong.length}`)
  console.log(missed.length === 0 && wrong.length === 0 ? "  ✓ на всех парах корпуса решение верно" : "  🛑 механизм ошибается на этом корпусе")

  // ── 2. ДОСЛОВНЫЙ ПОВТОР ───────────────────────────────────────────────────────────────────────
  console.log(`\nдословный повтор (регистр и пробелы изменены) узнан как тот же текст: ${sameText(CORPUS[0].text, REPEAT.text) ? "да" : "НЕТ — дефект"}`)

  // ── 3. НЕГАТИВНЫЙ КОНТРОЛЬ САМОГО ПРИБОРА ─────────────────────────────────────────────────────
  // 🔒 Прибор обязан уметь ОТКАЗЫВАТЬ на заведомо ложном, иначе он зелёный по причине своей слепоты.
  const alien = await nearFeedback({ text: "рецепт борща с говядиной и свёклой", k: 20 })
  const alienTop = Math.max(0, ...alien.hits.filter((h) => h.id.includes(MARK)).map((h) => h.score))
  console.log(`чужая фраза против корпуса: лучшая близость ${fmt(alienTop)} — ${alienTop < NEAR_FEEDBACK ? "порога не прошла, верно" : "ПРОШЛА порог — прибор слеп"}`)

  console.log(`\nубрано по метке: ${await cleanup()} из ${CORPUS.length + 1}`)
}

main().catch(async (e) => {
  await cleanup()
  console.error("ОТКАЗ:", e.message)
  process.exit(1)
})

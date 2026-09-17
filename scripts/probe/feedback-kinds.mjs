#!/usr/bin/env node
// ПРИБОР 218-19: У КОММЕНТАРИЯ ЧЕТЫРЕ ИСХОДА, И ОДИН ИЗ НИХ — ЧЕСТНЫЙ ОТКАЗ.
//
// 🎯 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-17: комментарий «этого в принципе нельзя решить памятью» обязан
// получить ту же цепочку, что чужая просьба, — маркетплейс → навыки → предложение микросервиса; и
// там же: «отказать пользователю это тоже распространённый вариант… Потому что бла-бла-бла. Вот что
// можно было бы сделать: бла-бла-бла. Если хотите мы продолжим обсуждение или просто давайте
// вернёмся к обычной работе».
//
// 🔒 ПРОВЕРЯЕТСЯ НАСТОЯЩИЙ КОД СЛУЖБЫ (`feedbackKind`, `findSolution`, `refusalWordsFor`), а не копия:
// копия доказывала бы себя.
// 🛑 РАЗБОР ИДЁТ ХОДОМ МОДЕЛИ — значит прибор ТРАТИТ КВОТУ подписки, по одному ходу на комментарий.
// Это сказано здесь, чтобы прогон «на всякий случай» был осознанным решением.
// 🛑 УБОРКИ НЕ ТРЕБУЕТСЯ: прибор НИЧЕГО НЕ ПИШЕТ — ни строк, ни векторов, ни графа. Живой путь через
// `/v1` проверяется отдельно и убирает за собой по метке источника.
//
// Запуск на сервере: node scripts/probe/feedback-kinds.mjs

import { feedbackKind, KIND, refusalWordsFor } from "/opt/fractera/memory/lib/feedback-kind.mjs"
import { findSolution, solutionWords } from "/opt/fractera/memory/lib/solution-search.mjs"

const CASES = [
  { expect: KIND.IMPROVE, text: "ответ слишком длинный, хотелось бы короче", why: "обычное пожелание к работе памяти" },
  { expect: KIND.IMPROVE, text: "не хватает роли человека: укажи, чем Петя занимается", why: "пожелание, из которого вчера собрался сигнал" },
  { expect: KIND.BEYOND, text: "я хочу видеть аналитику по своим конкурентам — памятью это не сделать", why: "заявка на другой продукт, случай владельца" },
  { expect: KIND.BEYOND, text: "это вообще не задача памяти — нужен отдельный сервис для рассылок клиентам", why: "заявка, названная прямо" },
  // 🔒 ПЯТЫЙ СЛУЧАЙ ЗАВЕДЁН ИЗМЕРЕНИЕМ, А НЕ ЗАМЫСЛОМ, И ОН ДЕРЖИТ ВТОРУЮ ВЕТВЬ ЖИВОЙ.
  // ✗ Первый прогон: все четыре заявки ушли в честный отказ — недостижимо было ПРЕДЛОЖЕНИЕ. Правка
  // промпта перевернула маятник: все ушли в предложение, и недостижимым стал ОТКАЗ. Прибор, у
  // которого нет случая на каждую ветвь, зелен ровно потому, что второй ветви не видит.
  { expect: KIND.BEYOND, refusal: true, text: "хочу чтобы память предсказывала спрос на мой товар на следующий квартал", why: "заявка, которую нельзя надёжно пообещать: нет истории продаж, результат нечем проверить" },
]

async function main() {
  console.log("=== ПРИБОР 218-19 · четыре исхода комментария ===\n")
  let right = 0

  for (const c of CASES) {
    const kind = await feedbackKind(c.text)
    if (!kind.ok) {
      console.log(`🛑 «${c.text.slice(0, 50)}…» → род не назван: ${kind.refusal}`)
      continue
    }
    // 🔒 СЛУЧАЙ С ОЖИДАНИЕМ ВЕТВИ ПРОВЕРЯЕТ И ВЕТВЬ, А НЕ ТОЛЬКО РОД: иначе «род угадан 5 из 5»
    // соседствовало бы с мёртвой половиной механизма и выглядело бы успехом.
    const branchOk = c.refusal === undefined || c.refusal === !kind.can_promise
    const hit = kind.kind === c.expect && branchOk
    if (hit) right++
    console.log(`${hit ? "✓" : "🛑"} «${c.text.slice(0, 52)}…»${c.refusal !== undefined ? ` [ждём ветвь: ${c.refusal ? "отказ" : "предложение"} — ${branchOk ? "сошлось" : "НЕ сошлось"}]` : ""}`)
    console.log(`   ждали ${c.expect} · получили ${kind.kind} · пообещать надёжно: ${kind.can_promise ? "да" : "нет"}`)
    console.log(`   человек хочет: ${kind.asked}`)

    if (kind.kind === KIND.BEYOND) {
      const solution = await findSolution(kind.asked)
      const words = kind.can_promise
        ? solutionWords([solution], "ru")
        : refusalWordsFor({ asked: kind.asked, could_do: kind.could_do, lang: "ru", why_not: kind.why_not })
      console.log(`   ступени поиска: ${solution.searched.map((s) => `${s.where}${s.stub ? " (заглушка)" : ""}=${s.found}`).join(" → ")}`)
      console.log(`   исход: ${kind.can_promise ? solution.proposal : "honest-refusal"}`)
      console.log(`   ответ человеку: ${words}`)
      // 🔒 ТРИ ЧАСТИ ОТКАЗА ПРОВЕРЯЮТСЯ ПОИМЁННО: отказ без причины — тупик, без выхода — грубость.
      if (!kind.can_promise) {
        const parts = { "выбор человеку": /продолжим обсуждение|вернёмся к обычной работе/.test(words), "причина": /Потому что/.test(words), "что можно сделать": /Вот что можно было бы сделать|нет/.test(words) }
        console.log(`   части отказа: ${Object.entries(parts).map(([k, v]) => `${k} ${v ? "✓" : "🛑"}`).join(" · ")}`)
      }
    } else {
      // 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ: обычное пожелание НЕ ДОЛЖНО получать предложение микросервиса.
      console.log(`   цепочка решения не зовётся — верно`)
    }
    console.log("")
  }

  console.log(`сошлось (род и ветвь): ${right} из ${CASES.length}`)
}

main().catch((e) => {
  console.error("ОТКАЗ:", e.message)
  process.exit(1)
})

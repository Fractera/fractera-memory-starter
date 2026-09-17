#!/usr/bin/env node
// ПРИБОР 221: КАНАЛ УПРАВЛЕНИЯ РАБОТАЕТ И ПЕРЕЕЗЖАЕТ В ЛЮБУЮ СЛУЖБУ БЕЗ ПРАВОК.
//
// 🎯 ЗАКОН ВЛАДЕЛЬЦА 2026-09-17: «каждый строительный кирпичик полностью автономный… не используй
// жёсткий нейминг, связывающий это с памятью — настолько атомарно независимым, чтобы при превращении
// сервиса в другой, например в рассылку, переименовывать и менять структуру не пришлось».
//
// 🔒 ПЕРЕНОСИМОСТЬ ПРОВЕРЯЕТСЯ ПРИБОРОМ, А НЕ ОБЕЩАНИЕМ. Имя службы в коде канала ищется построчно, и
// строки-комментарии из счёта исключены НАМЕРЕННО: в них записана цена урока, и вычеркнуть её ради
// зелёного счёта значило бы купить цвет (закон о трёх вердиктах сторожа).
//
// 🛑 ПРИБОР НИЧЕГО НЕ ЗАПУСКАЕТ И НЕ ПИШЕТ ТОКЕН: он читает состояние и проверяет отказы. Живой
// запуск канала — работа человека на экране, и она проверяется его глазами.
//
// Запуск на сервере: node scripts/probe/channel.mjs

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { channelSessionName, channelStateDir, developmentSkill, serviceId, serviceTitle, suggestedBotName } from "/opt/fractera/memory/lib/channel/identity.mjs"
import { channelState } from "/opt/fractera/memory/lib/channel/telegram.mjs"

const ROOT = "/opt/fractera/memory"
const FILES = ["lib/channel/identity.mjs", "lib/channel/telegram.mjs", "scripts/agent/channel.sh"]

/** Строка кода или комментарий. Комментарии из счёта исключены: там записана цена урока. */
const isComment = (line) => {
  const t = line.trim()
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("#")
}

console.log("=== ПРИБОР 221 · канал управления ===\n")

console.log("--- 1. служба называет себя из реестра ---")
console.log(`  id ${serviceId()} · название ${serviceTitle()} · сессия ${channelSessionName()}`)
console.log(`  навык разработки: ${developmentSkill() || "🛑 НЕ НАЙДЕН"}`)
console.log(`  имя бота: ${suggestedBotName("ccid")}`)

console.log("\n--- 2. папка состояния своя, не общая с другим ботом ---")
const dir = channelStateDir()
const shared = "/root/.claude/channels/telegram"
console.log(`  ${dir}`)
console.log(`  не равна общей папке плагина: ${dir !== shared ? "верно" : "🛑 СОВПАДАЕТ — два бота делили бы токен"}`)

console.log("\n--- 3. состояние наружу не несёт токен ---")
const st = channelState()
const asText = JSON.stringify(st)
const leaks = /\d{6,}:[A-Za-z0-9_-]{30,}/.test(asText)
console.log(`  ${asText.slice(0, 160)}`)
console.log(`  токен в ответе: ${leaks ? "🛑 ЕСТЬ" : "нет — верно"}`)

console.log("\n--- 4. ПЕРЕНОСИМОСТЬ: имя службы в КОДЕ канала ---")
let hits = 0
for (const f of FILES) {
  const lines = readFileSync(join(ROOT, f), "utf8").split("\n")
  lines.forEach((line, i) => {
    if (isComment(line)) return
    if (!line.toLowerCase().includes(serviceId())) return
    hits += 1
    console.log(`  🛑 ${f}:${i + 1} ${line.trim().slice(0, 90)}`)
  })
}
console.log(`  вхождений в коде: ${hits} ${hits === 0 ? "— канал переносится копированием" : "— переезд потребует правок"}`)

// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ САМОГО ПРИБОРА: он обязан НАХОДИТЬ имя, если оно есть. Иначе его «ноль»
// означал бы слепоту, а не чистоту.
const probe = `const x = "${serviceId()}-hardcoded"`
console.log(`  контроль прибора: строку с именем он ${!isComment(probe) && probe.includes(serviceId()) ? "видит" : "🛑 НЕ ВИДИТ"}`)

process.exit(hits === 0 && !leaks ? 0 : 1)

#!/usr/bin/env node
//
// СТОРОЖ ДОГОВОРА: он обязан оставаться единственным источником и быть годным
// к употреблению снаружи.
//
// 🔒 ЗАЧЕМ ОН ЕСТЬ УЖЕ СЕЙЧАС, ПРИ НУЛЕ МЕТОДОВ. Сторож, заведённый после
// первого нарушения, приходит поздно: к тому моменту нарушение уже
// называется «как у нас принято». Этот стоит до первой строки логики.
//
// ✗ ЧЕМ ОПЛАЧЕН ЕГО ГЛАВНЫЙ ПУНКТ — ПРОВЕРКА ТИПОВ. 2026-09-09 наш внутренний
// псевдотип `value` уехал в JSON Schema инструмента агента. API Anthropic
// отверг инструмент целиком, привратник исключил `memory_write` и
// `memory_mutate` из каждой сессии — и это было невидимо СУТКИ: `tools/list`
// показывал все двенадцать, дверь отвечала `ok:true`, типы и сборка зелёные.
// 🔒 ЗАКОН ШИРЕ СЛУЧАЯ: у инструмента для модели есть ТРЕТЬЯ сторона, и её
// ответ надо измерять отдельно. Здесь мы ловим причину до того, как она до неё
// доедет.
//
// 🔒 С 200-6 ПРОВЕРКИ — ФУНКЦИЯ `problemsOf`, А СКРИПТ ЛИШЬ ПЕЧАТАЕТ ЕЁ ВЫВОД: прибор зовёт её на копии договора без схемы ответа и
// доказывает, что сторож это ловит. Сторож, чей отказ никто ни разу не видел, зелен по причине собственной слепоты.

import { pathToFileURL } from "node:url"
import { contract, CONTRACT_VERSION, METHODS } from "../contract.mjs"

// Простые типы JSON Schema. Ничего сверх этого списка в договоре стоять не может.
const ALLOWED = new Set(["array", "boolean", "integer", "null", "number", "object", "string"])

// 🔒 ДВА ГЛАГОЛА ЧЁРНОГО ЯЩИКА ОБЯЗАНЫ ОПИСЫВАТЬ СВОЙ ОТВЕТ СХЕМОЙ (200-6). Слово владельца: «все что мы засунули внутрь должно быть так же
// типизированы в этом объекте». Поля, без которых ответ не ответ, — `text` и `objects`.
const TYPED_VERBS = ["remember", "recall"]
const REQUIRED_OUTPUT = ["ok", "what_happened", "text", "objects"]

/**
 * Что не так с договором.
 * @param {Array<Record<string, any>>} methods
 * @param {string} version
 * @returns {string[]}
 */
export function problemsOf(methods, version) {
  const out = []
  const fail = (why) => out.push(why)

  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    fail(`версия договора «${version}» не по semver — потребитель не сможет объяснить свой отказ`)
  }

  // 🔒 ГЛАГОЛОВ РОВНО ТРИ, И ЭТО СТЕРЕЖЁТ КОД, А НЕ ПАМЯТЬ АВТОРА (207-6).
  // Замысел владельца: два входящих действия — сказать и спросить — плюс отзыв о предыдущем ответе.
  // Всё остальное («что у тебя есть», «покажи вот это») живёт адресами каталога.
  // 🛑 ИМЕННО ЗДЕСЬ ЛОВИТСЯ САМЫЙ ДЕШЁВЫЙ СПОСОБ ВЕРНУТЬ ПРЕЖНЮЮ АРХИТЕКТУРУ — «заведу ещё один
  // маленький глагол». Рукописное число в инструкции этого не поймает: оно не двигается само,
  // и в проекте это оплачено пять раз за три дня.
  const VERBS = ["feedback", "recall", "remember"]
  const got = methods.map((m) => m.name).sort()
  if (got.length !== VERBS.length || got.some((n, i) => n !== VERBS[i])) {
    fail(`глаголы договора: ожидались ${VERBS.join(", ")}, а объявлены ${got.join(", ") || "ни одного"}`)
  }

  const seen = new Set()
  for (const m of methods) {
    if (!m || typeof m.name !== "string" || !m.name) {
      fail("метод без имени: снаружи его нельзя ни позвать, ни назвать в отказе")
      continue
    }
    if (seen.has(m.name)) fail(`метод «${m.name}» объявлен дважды — вторая копия победит молча`)
    seen.add(m.name)

    // 🔒 «КОГДА ЗВАТЬ» ОБЯЗАТЕЛЬНО, И ЭТО НЕ ВЕЖЛИВОСТЬ. Метод без этого поля
    // читает модель, и она решает по имени — то есть угадывает.
    if (!m.about) fail(`метод «${m.name}» не говорит, КОГДА его звать`)
    if (!m.returns) fail(`метод «${m.name}» не говорит, что вернёт`)
    if (!m.onMiss) fail(`метод «${m.name}» не говорит, что будет при промахе`)

    for (const p of m.params ?? []) {
      if (!p || !p.name) { fail(`у «${m.name}» параметр без имени`); continue }
      if (!p.about) fail(`у «${m.name}» параметр «${p.name}» без объяснения`)
      const list = Array.isArray(p.type) ? p.type : [p.type]
      for (const one of list) {
        if (ALLOWED.has(one)) continue
        fail(
          `у «${m.name}» параметр «${p.name}» имеет тип «${String(one)}» — это не тип JSON Schema. ` +
            `Привратник исключит инструмент МОЛЧА, и агент его не увидит.`,
        )
      }
    }

    if (TYPED_VERBS.includes(m.name)) {
      const o = m.output
      if (!o || typeof o !== "object") {
        fail(`глагол «${m.name}» не описывает ответ схемой output — зовущий не знает, что получит`)
        continue
      }
      if (o.type !== "object") fail(`схема ответа «${m.name}» — не объект`)
      const required = Array.isArray(o.required) ? o.required : []
      for (const field of REQUIRED_OUTPUT) {
        if (!required.includes(field)) fail(`схема ответа «${m.name}» не требует «${field}»`)
      }
    }
  }
  return out
}

function main() {
  const problems = problemsOf(METHODS, CONTRACT_VERSION)
  // 🔒 ДОГОВОР ОБЯЗАН БЫТЬ СЕРИАЛИЗУЕМ: его отдают по HTTP, и то, что не
  // переживает JSON, снаружи не существует.
  try {
    JSON.parse(JSON.stringify(contract()))
  } catch (e) {
    problems.push("договор не переживает JSON: " + e.message)
  }
  for (const why of problems) console.log("🛑 " + why)
  if (problems.length === 0) {
    console.log(`✓ договор годен: версия ${CONTRACT_VERSION}, методов ${METHODS.length}`)
    process.exit(0)
  }
  process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()

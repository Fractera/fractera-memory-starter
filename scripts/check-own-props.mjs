#!/usr/bin/env node
//
// СТОРОЖ ОПИСАНИЯ СЕБЯ (227-3).
//
// 🪦 ЗАМЕНЯЕТ `check-services.mjs` — сторожа общего реестра, который жил в дереве одной службы.
// Реестр всех служб отсюда удалён: его собирает панель (227-4), а служба описывает только себя.
//
// 🔒 ПРАВИЛА НЕ ПИШУТСЯ ЗДЕСЬ, А БЕРУТСЯ ИЗ ЯДРА — `problemsOfProps` из копии объявления. Свой
// список проверок рядом с чужим объявлением разошёлся бы с ним на первом же новом поле, и разошёлся
// бы молча, в сторону «у меня проходит».
//
// 🔒 СТОРОЖ ДОКАЗЫВАЕТ, ЧТО УМЕЕТ ОТКАЗЫВАТЬ. Проверки живут в ядре и там же имеют свой негативный
// контроль (`core/service-props/check.mjs`, восемь испорченных случаев). Здесь — минимальная сверка
// того же рода: заведомо негодное описание обязано быть отвергнуто.

import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { problemsOfProps } from "../core-vendor/service-props/service-props.decl.mjs"
import { OWN_PROPS, OWN_PROPS_ERROR, OWN_PROPS_PATH } from "../lib/services.mjs"

export function problemsOfOwn(props, error) {
  const problems = []
  if (error) problems.push(`описание себя не читается или негодно: ${error}`)
  if (!props) return problems
  problems.push(...problemsOfProps(props))
  return problems
}

function main() {
  let failed = 0
  const problems = problemsOfOwn(OWN_PROPS, OWN_PROPS_ERROR)
  if (problems.length) {
    failed++
    console.log("🛑 описание себя не годится:")
    for (const p of problems) console.log("  · " + p)
  } else {
    console.log(`✓ описание себя годно: «${OWN_PROPS.id}», порт ${OWN_PROPS.port}, вход ${OWN_PROPS.auth} (${OWN_PROPS_PATH})`)
  }

  // Негативный контроль: сторож обязан отказывать на заведомо негодном.
  const spoiled = { ...(OWN_PROPS ?? {}) }
  delete spoiled.port
  const caught = problemsOfOwn(spoiled, null).some((p) => /нет поля port/.test(p))
  if (!caught) {
    failed++
    console.log("🛑 сторож слеп: описание без порта прошло проверку")
  } else {
    console.log("✓ негативный контроль: описание без порта отвергнуто")
  }

  process.exit(failed === 0 ? 0 : 1)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main()

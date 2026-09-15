// О ЧЁМ ВОПРОС: ОДИН ВЫЗОВ МОДЕЛИ ПО ТОМУ, ЧТО У ЧЕЛОВЕКА УЖЕ ЕСТЬ.
//
// 🪦 ЗДЕСЬ БЫЛ ПОДБОР ПО РЕЕСТРУ ПРИЗНАКОВ (`features-discover.mjs`, 201-4 … 205-3). Реестр отменён
// целиком решением владельца 2026-09-15: «мы не будем использовать реестр признаков в проекте
// вообще… я дам тебе новую стратегию». Причины и что именно удалено — `development-docs/CANCELLED.md`.
//
// 🔒 ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ, ЕСЛИ СТРАТЕГИЯ ЕЩЁ НЕ ПРИШЛА. Без подбора вопрос к таблицам не
// отвечается вовсе: `recall` не знал бы, ЧТО из записанного спрашивают, и любое «где я живу»
// возвращало бы «не знаю» при записанном городе. Удалить реестр и оставить память немой — это не
// то, о чём просили: просили убрать реестр, а не способность отвечать.
//
// 🛑 ЭТО НЕ НОВАЯ СТРАТЕГИЯ, А ТОТ ЖЕ МЕХАНИЗМ БЕЗ РЕЕСТРА. Модель по-прежнему видит ЗАКРЫТЫЙ
// список и не выдумывает имён — только список берётся из того, что у человека уже записано, а не
// из отдельного словаря. Придёт стратегия владельца — этот файл заменяется ею целиком.
//
// ✗ ЧТО ПРИ ЭТОМ ПОТЕРЯНО И НЕ СКРЫВАЕТСЯ: суммы. «Сколько я потратил» складывалось потому, что у
// признака было сказано «складывается»; вместе с реестром это знание ушло, и сумма теперь не
// считается — значения возвращаются по одному.

import { think } from "./think.mjs"
import { parseModelJson } from "./write-gate.mjs"

const SYSTEM = [
  "Ты определяешь, о чём спрашивает человек, для его собственной памяти.",
  "Тебе дан ЗАКРЫТЫЙ список того, что об этом человеке уже записано.",
  "Верни ТОЛЬКО JSON без ограды и без пояснений:",
  '{"kinds":["<имя ИЗ СПИСКА>", …],"not_in_list":"<о чём спрашивают, но в списке нет, или null>"}',
  "Правила:",
  "— имена только из списка; ничего не подходит — пустой kinds и скажи почему в not_in_list;",
  "— можно назвать несколько имён, если вопрос о нескольких сразу;",
  "— ничего не придумывай: чего в списке нет, того нет.",
].join("\n")

/**
 * Какие из записанных родов имеет в виду вопрос.
 *
 * @param {string} question вопрос человека, на любом языке
 * @param {Array<{what: string, value?: unknown}>} known что у человека уже записано
 * @returns {Promise<{ok: boolean, kinds?: string[], not_in_list?: string|null, used_model?: boolean, error?: string, why?: string}>}
 */
export async function pickKinds(question, known) {
  const text = String(question ?? "").trim()
  if (!text) return { ok: false, error: "empty-phrase" }

  // Список — имена родов с примером текущего значения: имя без значения модель читает хуже, а
  // значение подсказывает смысл имени, которое сочинила другая модель.
  const byKind = new Map()
  for (const k of Array.isArray(known) ? known : []) {
    if (!k?.what) continue
    if (!byKind.has(k.what)) byKind.set(k.what, k.value)
  }
  if (byKind.size === 0) return { ok: true, kinds: [], not_in_list: null, used_model: false }

  const user = [
    "Записано об этом человеке:",
    [...byKind.entries()].map(([kind, v]) => `- ${kind}${v ? ` (сейчас: ${String(v).slice(0, 60)})` : ""}`).join("\n"),
    "",
    `Вопрос: «${text}»`,
  ].join("\n")

  // 🔒 ОДИНОЧНЫЙ ВЫЗОВ: без сохранения разговора и без объявления инструментов — разбор вопроса
  // анализом не является (закон §10 паспорта).
  const said = await think(SYSTEM, user, { single: true })
  if (!said.ok) return { ok: false, error: said.refusal, why: said.why }

  let parsed = said.data
  if (typeof parsed === "string") parsed = parseModelJson(parsed)
  if (!parsed || typeof parsed !== "object") return { ok: false, error: "answer-unusable" }

  // 🛑 ОТВЕТ МОДЕЛИ ПРОВЕРЯЕТСЯ ПО ЗАКРЫТОМУ СПИСКУ, А НЕ ПРИНИМАЕТСЯ НА ВЕРУ: имя вне списка —
  // это выдуманное имя, и в запрос оно не пойдёт.
  const kinds = (Array.isArray(parsed.kinds) ? parsed.kinds : [])
    .map((k) => String(k ?? "").trim())
    .filter((k) => byKind.has(k))

  return {
    ok: true,
    kinds,
    not_in_list: typeof parsed.not_in_list === "string" && parsed.not_in_list.trim() ? parsed.not_in_list.trim() : null,
    used_model: true,
  }
}

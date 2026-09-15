// ПОДБОР СХЕМЫ: ФРАЗА ЧЕЛОВЕКА → ПРИЗНАКИ И ЗНАЧЕНИЯ, ОДИН ВЫЗОВ БЕЗ ИСТОРИИ.
//
// 🔒 ТРЕБОВАНИЕ ВЛАДЕЛЬЦА 2026-09-14, ДОСЛОВНО: «вопрос для обнаружения подходящей базы данных это
// вопрос в котором мы передаем один одиночный запрос выполняем получаем ответ и больше не
// хранилось в истории». Нить — только для анализа, где несколько вариантов сводятся в один; подбор
// схемы анализом не является.
//
// 🔒 МОДЕЛЬ ВИДИТ КАНДИДАТОВ, А НЕ СХЕМУ. Кандидатов даёт `features-index.mjs` поиском по смыслу;
// сколько их — измеренное число, не выбранное.
//
// 🛑 ЗНАЧЕНИЯ ПРОВЕРЯЕМ МЫ, А НЕ ОБЕЩАЕТ МОДЕЛЬ (закон `socials-ai`, принятый в проекте): ключ вне
// закрытого списка кандидатов и значение не того типа отвергаются ЗДЕСЬ. Модель вернёт неверное
// правдоподобно, и отличить это на глаз нельзя.

import { readFeatures } from "./features.mjs"
import { candidatesFor, K } from "./features-index.mjs"
import { think } from "./think.mjs"
import { parseModelJson } from "./write-gate.mjs"

const SYSTEM = [
  "Ты разбираешь фразу человека для его памяти. Тебе дан ЗАКРЫТЫЙ список признаков-кандидатов.",
  "Верни ТОЛЬКО JSON без ограды и без пояснений:",
  '{"action":"write"|"read","features":[{"key":"<ключ ИЗ СПИСКА>","value":<значение или null>}],"not_in_list":"<что сказано, но в списке нет, или null>"}',
  "Правила:",
  "— ключи только из списка; ничего не подходит — пустой features и скажи почему в not_in_list;",
  "— action=write, если человек сообщает сведения; action=read, если он спрашивает;",
  "— при чтении value = null: спрашивают о признаке, а не сообщают значение;",
  "— несколько значений одного признака — несколько элементов с одним ключом;",
  "— значение пиши так, как сказал человек: числа числами, деньги числом с полем currency, даты как гггг-мм-дд;",
  "— ничего не придумывай: чего во фразе нет, того нет.",
].join("\n")

/** Как кандидат выглядит для модели: смысл и форма значения, без места хранения. */
function forModel(f) {
  return `- ${f.key} · ${f.title} · значение: ${f.valueType}, накопление: ${f.aggregate}. ${f.howToFind}`
}

/**
 * Годится ли значение под тип признака.
 *
 * 🔒 ПРОВЕРКА ГРУБАЯ НАМЕРЕННО. Её дело — отличить «не то вовсе» от «то»: строка вместо суммы,
 * объект вместо даты. Точность значения — дело записи, а не подбора.
 */
export function valueFits(valueType, value) {
  if (value === null || value === undefined) return true // чтение: значения нет и не должно быть
  switch (valueType) {
    case "text":
      return typeof value === "string" && value.trim().length > 0
    case "number":
      return typeof value === "number" && Number.isFinite(value)
    case "money": {
      if (typeof value === "number") return Number.isFinite(value)
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return Number.isFinite(Number(value.amount))
      }
      return false
    }
    case "date":
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value.trim())
    case "geo":
      return Boolean(value) && typeof value === "object" && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lon))
    case "flag":
      return typeof value === "boolean"
    case "list":
      return Array.isArray(value) && value.length > 0
    case "object":
      return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    default:
      return false
  }
}

/**
 * Проверить то, что ПРИСЛАЛ зовущий (закон шестой: признаки ускоряют, но не чинят).
 *
 * 🛑 ПАМЯТЬ НЕ ВЕРИТ НА СЛОВО ДАЖЕ СИЛЬНОЙ МОДЕЛИ БОТА: неизвестный ключ и значение не того типа
 * отвергаются с причиной, а не тихо выбрасываются. Тихо выброшенное выглядит как принятое.
 */
export function checkGiven(given) {
  const known = new Map(readFeatures().map((f) => [f.key, f]))
  const taken = []
  const rejected = []
  for (const item of Array.isArray(given) ? given : []) {
    const key = String(item?.key ?? "")
    const f = known.get(key)
    if (!f) {
      rejected.push({ key, why: "unknown-feature", what_happened: `признака «${key}» в реестре нет` })
      continue
    }
    // 205-2: снятый признак не принимает значений, но зовущий слышит причину и замену, а не «такого нет».
    if (f.retired) {
      rejected.push({ key, why: "retired-feature", what_happened: `признак «${key}» снят: ${f.retired}` })
      continue
    }
    if (!valueFits(f.valueType, item?.value)) {
      rejected.push({ key, why: "bad-value-type", what_happened: `значение не годится под тип ${f.valueType}` })
      continue
    }
    taken.push({ key, value: item?.value ?? null, from: "given" })
  }
  return { taken, rejected }
}

/**
 * Чужой ключ не теряется (205-3): отказу «такого признака нет» добавляются ближайшие ключи памяти.
 *
 * 🔒 ВОПРОС ВЛАДЕЛЬЦА, РАДИ КОТОРОГО ЭТО ЕСТЬ: «пришло тебе какой-то определённое название что ты будешь делать? Разве это
 * не дыра?» Чат шлёт `person.name`, память знает `person.name-he-is-called` — отказ без подсказки оставлял бы зовущего
 * гадать. Псевдонимов нет намеренно: второе имя одного признака разошлось бы с первым молча (решение агента, план 205).
 * 🔒 ПОДСКАЗКА ИЩЕТСЯ ПО СЛОВАМ САМОГО КЛЮЧА, БЕЗ МОДЕЛИ: один поиск по индексу реестра (только действующие признаки).
 * 🛑 ПОДСКАЗКА НЕ ПРИНИМАЕТ ЗНАЧЕНИЕ ЗА ЗОВУЩЕГО: угаданный ключ, записанный молча, — та же ошибка, что псевдоним.
 * @param {Array<{key: string, why: string, what_happened: string}>} rejected
 */
export async function suggestNearest(rejected, { k = 3 } = {}) {
  const out = []
  for (const r of Array.isArray(rejected) ? rejected : []) {
    if (r?.why !== "unknown-feature" || !r.key) {
      out.push(r)
      continue
    }
    const words = String(r.key).replace(/[._-]+/g, " ").trim()
    const found = await candidatesFor(words, { k })
    const nearest = found.ok ? found.candidates.slice(0, k).map((c) => c.key) : []
    out.push({
      ...r,
      nearest,
      what_happened: nearest.length
        ? `${r.what_happened}; вероятно, имелся в виду «${nearest[0]}» (ближайшие: ${nearest.join(", ")}) — ключи реестра: GET /v1/features`
        : `${r.what_happened}; ключи реестра: GET /v1/features`,
    })
  }
  return out
}

/**
 * Что имеется в виду во фразе.
 *
 * @param {string} phrase фраза человека, на любом языке
 * @param {{given?: Array<{key: string, value?: unknown}>, k?: number}} opts
 *   `given` — признаки, присланные зовущим: они не отменяют проверку, но подбор для них не нужен.
 */
export async function discover(phrase, opts = {}) {
  const text = String(phrase ?? "").trim()
  if (!text) return { ok: false, error: "empty-phrase" }

  const given = checkGiven(opts.given)
  if (given.rejected.length) given.rejected = await suggestNearest(given.rejected)
  // 🔒 ПРИСЛАННЫЕ ПРИЗНАКИ ПРОПУСКАЮТ ПОДБОР — В ЭТОМ И СОСТОИТ УСКОРЕНИЕ. Но только когда они
  // прошли проверку: отвергнутые не считаются присланными, иначе отказ превратился бы в тишину.
  if (given.taken.length > 0) {
    return {
      ok: true,
      action: "write",
      features: given.taken,
      rejected: given.rejected,
      not_in_list: null,
      used_model: false,
      candidates: given.taken.map((g) => g.key),
      how: "given",
    }
  }

  const found = await candidatesFor(text, { k: opts.k ?? K })
  if (!found.ok) return { ok: false, error: found.error, why: found.why, rejected: given.rejected }
  if (found.candidates.length === 0) {
    return { ok: true, action: "read", features: [], rejected: given.rejected, not_in_list: text, used_model: false, candidates: [], how: "no-candidates" }
  }

  const user = [
    "Кандидаты:",
    found.candidates.map(forModel).join("\n"),
    "",
    `Фраза: «${text}»`,
  ].join("\n")

  // 🔒 ОДИНОЧНЫЙ ВЫЗОВ: `single` снимает и сохранение разговора, и объявление инструментов.
  const said = await think(SYSTEM, user, { single: true })
  if (!said.ok) {
    return { ok: false, error: said.refusal, why: said.why, rejected: given.rejected, candidates: found.candidates.map((c) => c.key) }
  }

  let parsed = said.data
  if (typeof parsed === "string") {
    parsed = parseModelJson(parsed)
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "answer-unusable", rejected: given.rejected, candidates: found.candidates.map((c) => c.key) }
  }

  const allowed = new Map(found.candidates.map((c) => [c.key, c]))
  const features = []
  const rejected = [...given.rejected]
  for (const item of Array.isArray(parsed.features) ? parsed.features : []) {
    const key = String(item?.key ?? "")
    const f = allowed.get(key)
    if (!f) {
      rejected.push({ key, why: "not-in-candidates", what_happened: "модель назвала ключ вне закрытого списка" })
      continue
    }
    if (!valueFits(f.valueType, item?.value)) {
      rejected.push({ key, why: "bad-value-type", what_happened: `значение не годится под тип ${f.valueType}` })
      continue
    }
    features.push({ key, value: item?.value ?? null, from: "model" })
  }

  const action = parsed.action === "read" ? "read" : "write"
  return {
    ok: true,
    action,
    features,
    rejected,
    not_in_list: typeof parsed.not_in_list === "string" && parsed.not_in_list.trim() ? parsed.not_in_list.trim() : null,
    used_model: true,
    // 🔒 КАНДИДАТЫ И ИХ БЛИЗОСТЬ ЕДУТ В ОТЧЁТ: без них «почему не нашлось» нечем объяснить.
    candidates: found.candidates.map((c) => ({ key: c.key, score: Math.round(c.score * 1000) / 1000 })),
    ms: said.ms ?? null,
    how: "model",
  }
}

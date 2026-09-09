// РАЗГОВОР С OpenAI — ВЕКТОРЫ И ТРАНСКРИПЦИЯ, И БОЛЬШЕ НИЧЕГО.
//
// 🪦 ЗАГОЛОВОК «ЕДИНСТВЕННОЕ МЕСТО, ГДЕ ПАМЯТЬ ЗОВЁТ МОДЕЛЬ» ОТМЕНЁН 2026-09-10.
// 🔒 ДОПУСК К РАЗМЫШЛЕНИЯМ ДЛЯ OpenAI ЗАПРЕЩЁН — закон владельца 2026-09-09,
// дословно: «OpenAI нужен для оцифровки голоса, то есть транскрипции, и для
// работы с векторами». Память думает через `think.mjs` (Claude Opus).
// 🛑 ЭТОТ ФАЙЛ СЕГОДНЯ НЕ ЗОВЁТ НИКТО, И ЭТО ЗАКОННО, А НЕ ЗАБЫТО: он ждёт
// векторов и транскрипции. Вернуть отсюда `ask()` в разбор фразы = отменить
// закон владельца молча. ✗ Чем оплачено: `gpt-4o-mini` на трёх живых фразах
// потерял проект, слепил имя с формой обращения и положил кота в друзья.
//
// 🔒 ВЫЗОВ МОДЕЛИ ВНУТРИ ЯЩИКА НЕ НАРУШАЕТ ЗАКОН О МГНОВЕННОСТИ. Закон владельца
// считает **ходы агента**: каждый стоит 8–12 секунд у человека с телефоном в
// руке. Один вызов на нашей стороне — это миллисекунды сети плюс работа модели,
// и агент за него ходами не платит.
// 🛑 НО ЧТЕНИЕ ИЗВЕСТНОГО ОБЯЗАНО ОБХОДИТЬСЯ БЕЗ МОДЕЛИ ВОВСЕ. Если за ответом
// «на каком языке он говорит» мы зовём модель, мы вернули ту самую цену, ради
// снятия которой всё и затевалось.
//
// 🔒 ОТКАЗ ПО ДЕНЬГАМ И ОТКАЗ ПО КЛЮЧУ — РАЗНЫЕ ВЕЩИ (замысел владельца,
// зафиксирован в INTENT-REGISTRY). Первое чинит владелец платежом, второе —
// заменой ключа; один код на оба заставил бы его гадать.
// 🛑 И «РАБОТАЕТ» НЕ РАВНО «ОПЛАЧЕНО»: `/v1/models` отвечает `200` и на пустом
// счёте — измерено в проекте. Поэтому живость ключа мы проверяем настоящим
// вызовом, а не списком моделей.

import { readFileSync } from "node:fs"

const MACHINE_ENV = process.env.FRACTERA_MACHINE_ENV ?? "/etc/fractera/secrets.env"

function machineEnv(name) {
  try {
    for (const line of readFileSync(MACHINE_ENV, "utf8").split("\n")) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) {
        return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
      }
    }
  } catch { /* вне сервера файла нет — законно */ }
  return ""
}

const KEY = process.env.OPENAI_API_KEY || machineEnv("OPENAI_API_KEY")
const MODEL = process.env.MEMORY_MODEL ?? "gpt-4o-mini"

/** Роды отказа, которые память умеет назвать. Каждый чинится по-своему. */
export const REFUSAL = {
  BAD_ANSWER: "model-answer-unusable",
  NO_KEY: "model-key-missing",
  NO_MONEY: "model-quota-exhausted",
  UNREACHABLE: "model-unreachable",
  WRONG_KEY: "model-key-rejected",
}

/** Что сказать владельцу при каждом отказе — словами, а не кодом. */
export const REFUSAL_WORDS = {
  [REFUSAL.BAD_ANSWER]: "модель ответила не по форме — разобрать фразу не удалось",
  [REFUSAL.NO_KEY]: "ключ модели не найден на этой машине: без него разбор фразы невозможен",
  [REFUSAL.NO_MONEY]: "у ключа модели кончились оплаченные токены — нужно пополнить счёт",
  [REFUSAL.UNREACHABLE]: "модель недоступна по сети",
  [REFUSAL.WRONG_KEY]: "ключ модели отвергнут — вероятно, он больше не действителен и его надо заменить",
}

/**
 * Спросить модель и получить РАЗОБРАННЫЙ JSON.
 *
 * 🔒 ОТВЕТ ПРОВЕРЯЕМ МЫ, А НЕ ОБЕЩАЕТ МОДЕЛЬ (закон `socials-ai`): она вернёт
 * правдоподобное значение вне договора, и выглядеть оно будет убедительно.
 * Не прошедшее проверку отбрасывается ЦЕЛИКОМ — наполовину разобранное сохранят.
 */
export async function ask(system, user) {
  if (!KEY) return { ok: false, refusal: REFUSAL.NO_KEY }

  let res
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      body: JSON.stringify({
        messages: [
          { content: system, role: "system" },
          { content: user, role: "user" },
        ],
        model: MODEL,
        response_format: { type: "json_object" },
        temperature: 0,
      }),
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      method: "POST",
    })
  } catch (e) {
    return { ok: false, refusal: REFUSAL.UNREACHABLE, why: String(e.message) }
  }

  if (res.status === 401 || res.status === 403) {
    return { ok: false, refusal: REFUSAL.WRONG_KEY }
  }
  if (res.status === 429) {
    // 🔒 РАЗЛИЧАЕМ ДЕНЬГИ И ТЕМП. `insufficient_quota` — счёт пуст, чинится
    // платежом; прочие `429` — слишком часто, чинится ожиданием. Один код на оба
    // отправил бы владельца платить там, где надо было подождать.
    const body = await res.text().catch(() => "")
    const noMoney = body.includes("insufficient_quota") || body.includes("billing")
    return { ok: false, refusal: noMoney ? REFUSAL.NO_MONEY : REFUSAL.UNREACHABLE, why: "429" }
  }
  if (!res.ok) return { ok: false, refusal: REFUSAL.UNREACHABLE, why: `http-${res.status}` }

  const body = await res.json().catch(() => null)
  const text = body?.choices?.[0]?.message?.content
  if (!text) return { ok: false, refusal: REFUSAL.BAD_ANSWER }
  try {
    return { data: JSON.parse(text), ok: true }
  } catch {
    return { ok: false, refusal: REFUSAL.BAD_ANSWER }
  }
}

/** Есть ли ключ вообще — без обращения к сети. */
export function haveKey() {
  return Boolean(KEY)
}

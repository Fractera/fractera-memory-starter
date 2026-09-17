// АКТИВАЦИЯ КАНАЛА ОДНИМ НАЖАТИЕМ START — БЕЗ КОДА И БЕЗ АНГЛИЙСКОГО (221-8).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-17, ДОСЛОВНО: «Мы договаривались, что после прохождения четвёртого шага у меня
// сразу начнётся сессия… здесь что-то написано на английском языке, я на английском не понимаю ни слова…
// лучше бы вместо этого текста прилетела кнопка с текстом активировать соединение».
//
// ✗ ЧЕМ ОПЛАЧЕНО. В новом чате Telegram показывает кнопку START, она шлёт боту `/start`, и плагин каналов
// отвечает зашитой английской инструкцией «In Claude Code: /telegram:access pair <code>» — и кода не выдаёт
// (измерено в `telegram/0.0.7/server.ts`, `bot.command('start')`). Текст плагина мы не правим: это чужой код в
// общем кэше, из которого живёт и канал агента №1, и правка исчезла бы при первом обновлении.
//
// 🔒 ОТСЮДА УСТРОЙСТВО: `/start` ЧИТАЕМ МЫ, ПОКА ПЛАГИН ЕЩЁ НЕ СЛУШАЕТ. Кнопка экрана открывает
// `t.me/<бот>?start=<одноразовая метка>`. Человек жмёт START — Telegram шлёт `/start <метка>`. Сервер памяти
// находит это обновление, вносит отправителя в `allowFrom` плагина, ПОДТВЕРЖДАЕТ обновления (плагин их не
// увидит и английского не пришлёт), пишет человеку на языке страницы и только потом запускает канал.
//
// 🛑 ОДИН ОПРАШИВАТЕЛЬ НА БОТА — ЗАКОН 115, И ЗДЕСЬ ОН ДЕРЖИТСЯ КОДОМ: активация отказывает, если сессия
// канала жива. Telegram отдаёт каждое обновление одному читателю; прочитав его при работающем плагине, мы
// молча украли бы сообщение человека.
// 🔒 МЕТКА — ЗАМОК, А НЕ УКРАШЕНИЕ. Без неё впустили бы первого, кто нажал START у этого бота. Метка живёт
// час, одноразовая, и знает её только тот, кто открыл страницу мастерской под ролью архитектора.

import { randomBytes } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { channelStateDir } from "./identity.mjs"
import { running, storedToken } from "./telegram.mjs"

const LIFETIME_MS = 60 * 60 * 1000
const file = () => join(channelStateDir(), "activation.json")
const accessFile = () => join(channelStateDir(), "access.json")

async function tg(method, params = {}) {
  const token = storedToken()
  if (!token) return { ok: false, description: "no-token" }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      body: JSON.stringify(params),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    })
    return (await res.json().catch(() => null)) ?? { ok: false }
  } catch {
    return { ok: false, description: "unreachable" }
  }
}

/** Действующая метка или новая. Одна на раз: вторая вкладка получает ту же, а не отменяет первую. */
export function activationLink(botUsername) {
  if (!botUsername) return { error: "no-bot-username", ok: false }
  let nonce = ""
  try {
    const a = JSON.parse(readFileSync(file(), "utf8"))
    if (a.nonce && Date.now() - a.createdAt < LIFETIME_MS) nonce = a.nonce
  } catch {
    /* метки ещё нет */
  }
  if (!nonce) {
    nonce = randomBytes(12).toString("hex")
    mkdirSync(channelStateDir(), { recursive: true })
    writeFileSync(file(), JSON.stringify({ createdAt: Date.now(), nonce }), { mode: 0o600 })
  }
  return { ok: true, url: `https://t.me/${botUsername}?start=${nonce}` }
}

/**
 * Проверить, нажал ли человек START по нашей ссылке; нажал — впустить и поприветствовать.
 *
 * 🔒 ПОДТВЕРЖДАЮТСЯ ВСЕ ПРОЧИТАННЫЕ ОБНОВЛЕНИЯ, А НЕ ТОЛЬКО НАЙДЕННОЕ: иначе плагин при запуске получит
 * старое `/start` и пришлёт тот самый английский текст, ради устранения которого файл заведён.
 */
export async function checkActivation(greeting) {
  if (!storedToken()) return { error: "no-token", ok: false }
  if (running()) return { error: "channel-running", ok: false }
  let nonce = ""
  try {
    const a = JSON.parse(readFileSync(file(), "utf8"))
    if (Date.now() - a.createdAt < LIFETIME_MS) nonce = a.nonce
  } catch {
    /* нет метки */
  }
  if (!nonce) return { error: "no-activation", ok: false }

  const got = await tg("getUpdates", { allowed_updates: ["message"], timeout: 0 })
  // 🛑 ТОКЕН БЫВАЕТ ОТОЗВАН ПОСЛЕ СОХРАНЕНИЯ, И ЭТО НЕ НАША ПОЛОМКА, А ФАКТ, КОТОРЫЙ НАДО СКАЗАТЬ.
  // ✗ Измерено 2026-09-17: `getMe` принял токен при сохранении, а через полчаса и `getMe`, и `getUpdates`
  // отвечали `401` — в BotFather нажата «Revoke current token» либо заведён другой бот. Экран при этом
  // продолжал показывать «Токен сохранён»: молчаливое «всё хорошо» при мёртвом боте.
  if (got.error_code === 401) return { error: "token-rejected", ok: false }
  // 🛑 `409 Conflict` — у бота уже есть читатель: это не отказ навсегда, а «попробуй ещё раз».
  if (got.error_code === 409) return { activated: false, ok: true }
  if (!got.ok) return { error: got.description === "unreachable" ? "telegram-unreachable" : "telegram-refused", ok: false }
  const updates = Array.isArray(got.result) ? got.result : []
  const hit = updates.find((u) => {
    const m = u.message
    return m?.chat?.type === "private" && typeof m.text === "string" && m.text.trim() === `/start ${nonce}`
  })
  if (updates.length > 0) await tg("getUpdates", { offset: updates[updates.length - 1].update_id + 1, timeout: 0 })
  if (!hit) return { activated: false, ok: true }

  const sender = String(hit.message.from.id)
  let a = { allowFrom: [], dmPolicy: "pairing", groups: {}, pending: {} }
  try {
    a = { ...a, ...JSON.parse(readFileSync(accessFile(), "utf8")) }
  } catch {
    /* файла нет — заводим */
  }
  if (!a.allowFrom.includes(sender)) a.allowFrom.push(sender)
  writeFileSync(accessFile(), JSON.stringify(a, null, 2), { mode: 0o600 })
  rmSync(file(), { force: true })

  const text = String(greeting ?? "").slice(0, 500)
  if (text) await tg("sendMessage", { chat_id: hit.message.chat.id, text })
  return { activated: true, ok: true }
}

/**
 * Описание бота, которое Telegram показывает в ПУСТОМ чате до нажатия START, — на языке страницы.
 * 🔒 Ставится для языка человека (`language_code`) и как умолчание: без него пустой чат молчит, и первое,
 * что видит человек, — кнопка START без объяснения.
 */
export async function setDescription(text, lang) {
  const body = String(text ?? "").slice(0, 500)
  if (!body) return
  await tg("setMyDescription", { description: body })
  if (lang && /^[a-z]{2}$/.test(lang)) await tg("setMyDescription", { description: body, language_code: lang })
}

/** Снять метку: канал запущен или записи стёрты. */
export function clearActivation() {
  if (existsSync(file())) rmSync(file(), { force: true })
}

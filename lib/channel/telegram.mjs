// КАНАЛ УПРАВЛЕНИЯ TELEGRAM: СОСТОЯНИЕ, ТОКЕН, ЗАПУСК СЕССИИ (221-2, 221-3).
//
// 🎯 ЗАДАЧА ВЛАДЕЛЬЦА 2026-09-17: «каждый микросервис получает по умолчанию собственные инструменты
// разработки и плюс чат для удобства управления… я смогу продолжить всю разработку через Telegram».
//
// 🔒 ИМЕНИ СЛУЖБЫ ЗДЕСЬ НЕТ: всё, что нужно назвать, приходит из `identity.mjs` (реестр + `ME`).
// Папку `lib/channel/` можно скопировать в другую службу, и она заработает там без единой правки.
//
// 🔒 СВОЯ ПАПКА СОСТОЯНИЯ — НЕ УДОБСТВО, А УСЛОВИЕ СОСУЩЕСТВОВАНИЯ. Первоисточник плагина каналов
// (`telegram/0.0.7/README.md`): «To run multiple bots on one machine (different tokens, separate
// allowlists), point TELEGRAM_STATE_DIR at a different directory per instance». Без этого второй бот
// читал бы токен и список допущенных ПЕРВОГО — то есть на машине мог бы жить ровно один канал.
//
// 🛑 ТОКЕН НЕ ВОЗВРАЩАЕТСЯ НИКОГДА. Наружу едет только «настроен или нет» и хвост из четырёх знаков
// для узнавания. ✗ Тот же закон, что у ключей моделей: показанный однажды секрет считается
// раскрытым, а «показать, чтобы человек проверил» — самая частая причина утечки.

import { execFileSync, spawn } from "node:child_process"
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { channelSessionName, channelStateDir, serviceRoot } from "./identity.mjs"

/** Токен бота от BotFather: число, двоеточие, тело. Проверяется формой до записи. */
const TOKEN_SHAPE = /^\d{6,}:[A-Za-z0-9_-]{30,}$/

const envFile = () => join(channelStateDir(), ".env")
const accessFile = () => join(channelStateDir(), "access.json")
const botFile = () => join(channelStateDir(), "bot.json")

/** Кто этот бот в Telegram: ручка и видимое имя, как их назвал сам Telegram при проверке токена. */
function botInfo() {
  try {
    const b = JSON.parse(readFileSync(botFile(), "utf8"))
    return { botName: String(b.name ?? ""), botUsername: String(b.username ?? "") }
  } catch {
    return {}
  }
}

/**
 * Прочитать токен с диска. Наружу из СЕРВЕРА он не уходит никогда — только в запуск сессии и в вызовы
 * Telegram (`activation.mjs`). Ни одна дверь не кладёт его в ответ.
 */
export function storedToken() {
  try {
    const line = readFileSync(envFile(), "utf8")
      .split("\n")
      .find((l) => l.startsWith("TELEGRAM_BOT_TOKEN="))
    return line ? line.slice("TELEGRAM_BOT_TOKEN=".length).trim() : ""
  } catch {
    return ""
  }
}

/**
 * Сохранить токен.
 *
 * 🛑 ФОРМА ПРОВЕРЯЕТСЯ ДО ЗАПИСИ: иначе человек сохранит опечатку, канал не поднимется, и виноватой
 * будет выглядеть вся способность. 🔒 Права `0600`: файл читает только тот, кто запускает сессию.
 */
export async function saveToken(raw) {
  const token = String(raw ?? "").trim()
  if (!token) return { error: "empty-token", ok: false }
  if (!TOKEN_SHAPE.test(token)) return { error: "bad-format", ok: false }
  // 🔒 ТОКЕН ПРОВЕРЯЕТСЯ У САМОГО TELEGRAM, И ОТТУДА ЖЕ БЕРЁТСЯ РУЧКА БОТА (221-6). Форма токена
  // говорит «похоже на токен», а не «бот существует». Ручка нужна шагу «откройте бота»: без неё
  // кнопки, ведущей в чат, не построить, а человек после запуска канала не знал, куда идти.
  // 🛑 `getMe` — НЕ `getUpdates`: он не забирает сообщения у опрашивателя канала (закон 115).
  let me
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(10_000) })
    me = await res.json().catch(() => null)
  } catch {
    return { error: "telegram-unreachable", ok: false }
  }
  if (!me?.ok || !me.result?.username) return { error: "token-rejected", ok: false }
  const dir = channelStateDir()
  mkdirSync(dir, { recursive: true })
  writeFileSync(botFile(), JSON.stringify({ name: me.result.first_name ?? "", username: me.result.username }, null, 2))
  writeFileSync(envFile(), `TELEGRAM_BOT_TOKEN=${token}\n`, { mode: 0o600 })
  chmodSync(envFile(), 0o600)
  // Список допущенных заводится сразу: плагин ждёт подтверждения первого собеседника (dmPolicy pairing).
  if (!existsSync(accessFile())) {
    writeFileSync(accessFile(), JSON.stringify({ allowFrom: [], dmPolicy: "pairing", groups: {}, pending: {} }, null, 2), { mode: 0o600 })
  }
  return { ok: true, tail: token.slice(-4) }
}

/**
 * Кто ждёт допуска и кто уже допущен — из файла самого плагина, а не из нашей копии.
 *
 * 🔒 ОЖИДАЮЩИЙ — ЭТО КОД, КОТОРЫЙ БОТ ПРИСЛАЛ ЧЕЛОВЕКУ, А НЕ ЕГО НОМЕР. Человек видит код у себя в
 * Telegram и сверяет его со строкой на экране; номер ему ничего не говорит.
 * 🛑 ПРОСРОЧЕННЫЙ КОД НЕ ПОКАЗЫВАЕТСЯ: кнопка у него обещала бы то, чего плагин уже не примет.
 */
export function access() {
  try {
    const a = JSON.parse(readFileSync(accessFile(), "utf8"))
    const now = Date.now()
    const pending = Object.entries(a.pending ?? {})
      .filter(([, p]) => !p?.expiresAt || p.expiresAt > now)
      .map(([code]) => code)
    return { allowed: a.allowFrom ?? [], pending }
  } catch {
    return { allowed: [], pending: [] }
  }
}

/**
 * Допустить собеседника по коду, который бот прислал ему в Telegram.
 *
 * 🔒 ПОРЯДОК ВЗЯТ У ПЕРВОИСТОЧНИКА, А НЕ ПРИДУМАН: навык плагина `access`, команда `pair <code>` —
 * найти запись по коду · проверить срок · номер человека в `allowFrom` · удалить ожидание ·
 * файл `approved/<номер>` с номером чата. По этому файлу бот сам пишет человеку, что тот допущен.
 * ✗ Оплачено 2026-09-17: прежняя функция ждала НОМЕР, экран слал КОД — отказ был на каждом нажатии,
 * владелец остался в ожидающих, а бот, ответив недопущенному дважды, замолчал.
 * 🛑 БЕЗ ФАЙЛА `approved/` ДОПУСК ПРОХОДИТ МОЛЧА: человек не узнаёт, что можно писать.
 */
export function allow(code) {
  const key = String(code ?? "").trim()
  if (!/^[A-Za-z0-9]{4,12}$/.test(key)) return { error: "bad-code", ok: false }
  let a
  try {
    a = JSON.parse(readFileSync(accessFile(), "utf8"))
  } catch {
    return { error: "no-such-code", ok: false }
  }
  const entry = a.pending?.[key]
  if (!entry?.senderId) return { error: "no-such-code", ok: false }
  if (entry.expiresAt && entry.expiresAt < Date.now()) return { error: "code-expired", ok: false }
  const sender = String(entry.senderId)
  a.allowFrom = Array.isArray(a.allowFrom) ? a.allowFrom : []
  if (!a.allowFrom.includes(sender)) a.allowFrom.push(sender)
  delete a.pending[key]
  writeFileSync(accessFile(), JSON.stringify(a, null, 2), { mode: 0o600 })
  const approved = join(channelStateDir(), "approved")
  mkdirSync(approved, { recursive: true })
  writeFileSync(join(approved, sender), String(entry.chatId ?? sender))
  return { allowed: a.allowFrom, ok: true }
}

/** Жива ли сессия канала. Спрашивается у `screen`, а не у нашей памяти о том, что мы запускали. */
export function running() {
  try {
    const out = spawnSync("screen", ["-ls"])
    return out.includes(`.${channelSessionName()}\t`) || out.includes(`.${channelSessionName()} `)
  } catch {
    return false
  }
}

function spawnSync(cmd, args) {
  try {
    return String(execFileSync(cmd, args, { encoding: "utf8" }))
  } catch (e) {
    // `screen -ls` возвращает код 1, когда сессий нет: это ответ, а не отказ.
    return String(e?.stdout ?? "")
  }
}

/**
 * Состояние канала для экрана.
 *
 * 🔒 ТРИ РАЗНЫХ ОТВЕТА, А НЕ ДВА: «токена нет» · «токен есть, канал спит» · «канал работает». Человек
 * должен различать «не настроено» и «настроено, но не запущено», иначе он будет нажимать не ту кнопку.
 */
export function channelState() {
  const token = storedToken()
  return {
    configured: Boolean(token),
    ...(token ? { tail: token.slice(-4), ...botInfo() } : {}),
    ...access(),
    running: running(),
    session: channelSessionName(),
    stateDir: channelStateDir().replace(serviceRoot(), "<корень службы>"),
  }
}

/**
 * Поднять сессию канала.
 *
 * 🛑 БЕЗ ТОКЕНА — ОТКАЗ С ПРИЧИНОЙ, А НЕ ПОПЫТКА. Плагин без токена падает на старте, и человек
 * увидел бы пустой экран вместо объяснения.
 * 🔒 ПРЕЖНЯЯ СЕССИЯ СНИМАЕТСЯ ПЕРЕД СТАРТОМ: Telegram отдаёт каждое обновление ровно одному
 * читателю, и второй опрашиватель поделит переписку пополам МОЛЧА (закон живого канала 115).
 */
export function start() {
  if (!storedToken()) return { error: "no-token", ok: false }
  const script = join(serviceRoot(), "scripts", "agent", "channel.sh")
  if (!existsSync(script)) return { error: "no-launcher", ok: false }
  stop()
  // 🛑 ДВОЙНОЙ ФОРК, А НЕ `detached`. Служба живёт под pm2, а `pm2 reload` убивает ВСЁ дерево потомков,
  // и `detached: true` из него не выводит: родителем остаётся процесс службы. ✗ Оплачено 2026-09-17:
  // канал выдал владельцу код допуска и умер при первой же доставке — `screen -ls` показал «Dead».
  // Внешний bash завершается сразу, и канал достаётся init (ppid=1), куда pm2 не дотягивается.
  const child = spawn("bash", ["-c", `setsid nohup bash "${script}" >/dev/null 2>&1 < /dev/null & exit 0`], {
    detached: true,
    stdio: "ignore",
  })
  child.unref()
  return { ok: true, session: channelSessionName() }
}

/** Остановить сессию: гасится по имени, а не по нашему представлению о том, что мы запускали. */
export function stop() {
  try {
    execFileSync("screen", ["-S", channelSessionName(), "-X", "quit"], { encoding: "utf8" })
  } catch {
    /* сессии не было — это не отказ */
  }
  return { ok: true }
}

// КТО ПРИШЁЛ НА СТРАНИЦУ — СПРАШИВАЕМ У ЕДИНСТВЕННОЙ СЛУЖБЫ ВХОДА (177-3).
//
// 🔒 КОНВЕЙЕР ПОВТОРЁН БАЙТ В БАЙТ, А НЕ ПРИДУМАН ЗАНОВО. Требование владельца:
// «если вошли в проект как архитектор, то все сервисы видят нас как архитектор…
// все делаю переадресацию к единственной точке входа». Панель, сайт и чат
// читают сессию ровно так: пересылают куку запроса в `/api/session` службы
// `:3001` и получают `{ userId, email, roles }`.
// 🛑 ЗАКОН ПРОЕКТА: ДОКАЗАННЫЙ КОНВЕЙЕР ВХОДА НЕ УЛУЧШАЮТ. Своя проверка здесь
// стала бы второй правдой о человеке — и разошлась бы с первой молча.
//
// 🔒 ПОЧЕМУ КУКА ВООБЩЕ ВИДНА ЭТОЙ СЛУЖБЕ: вход ставит её на весь домен второго
// уровня (`COOKIE_DOMAIN=.<апекс>`), поэтому любой поддомен получает её сам,
// без общего секрета между службами.

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

function authUrl() {
  return (
    process.env.AUTH_SERVICE_URL ||
    machineEnv("AUTH_SERVICE_URL") ||
    process.env.NEXT_PUBLIC_AUTH_URL ||
    machineEnv("NEXT_PUBLIC_AUTH_URL") ||
    "http://127.0.0.1:3001"
  )
}

/**
 * Кто вошёл, по мнению единственной службы входа. `null` — никто.
 *
 * 🛑 ПУСТАЯ КОРЗИНА КУК — НЕ ПОВОД НЕ СПРАШИВАТЬ. Пока сервер живёт на голом IP,
 * служба входа отдаёт архитектора всем (режим онбординга); ранний выход сделал
 * бы эту страницу единственной, которая в онбординге никого не пускает. Цена —
 * один запрос к соседу на петле. Тот же довод записан у чата.
 */
export async function whoIsThere(req) {
  const cookie = req?.headers?.cookie ?? ""
  try {
    const res = await fetch(`${authUrl()}/api/session`, {
      cache: "no-store",
      headers: cookie ? { cookie } : undefined,
    })
    if (!res.ok) return null
    // 🔒 ОТВЕТ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ. Служба может ответить `200` с
    // телом без `email` — это «никто не вошёл», а не «вошёл кто-то безымянный».
    const s = await res.json().catch(() => null)
    if (!s?.email) return null
    return { email: s.email, roles: Array.isArray(s.roles) ? s.roles : [], userId: s.userId ?? s.email }
  } catch {
    // Служба входа может не отвечать — тогда человек не узнан, и это честный
    // отказ, а не «пускаем всех».
    return null
  }
}

/** Пускать ли к журналу. Роль та же, что у ключей и терминала. */
export function isArchitect(session) {
  return Boolean(session && session.roles.includes("architect"))
}

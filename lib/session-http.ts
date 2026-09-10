// КТО ПРИШЁЛ — ДЛЯ СТОРОНЫ NEXT (178-2).
//
// 🔒 ТОТ ЖЕ КОНВЕЙЕР, ЧТО В `session.mjs`, И ЭТО НЕ ДУБЛЬ, А ДРУГОЙ ВХОД К НЕМУ.
// `session.mjs` принимает узловой `req` — им пользуется голый сервер памяти;
// здесь приходит `Request` веб-стандарта, который даёт Next. Правило проверки
// одно и то же: куки пересылаются в службу входа `:3001`, роль читается из её
// ответа.
// 🛑 СВОЯ ПРОВЕРКА ЗДЕСЬ БЫЛА БЫ ВТОРОЙ ПРАВДОЙ О ЧЕЛОВЕКЕ. Закон проекта:
// доказанный конвейер входа не улучшают.

import { readFileSync } from "node:fs"

const MACHINE_ENV = process.env.FRACTERA_MACHINE_ENV ?? "/etc/fractera/secrets.env"

function machineEnv(name: string): string {
  try {
    for (const line of readFileSync(MACHINE_ENV, "utf8").split("\n")) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) {
        return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
      }
    }
  } catch {
    /* вне сервера файла нет — законно */
  }
  return ""
}

function authUrl(): string {
  return (
    process.env.AUTH_SERVICE_URL ||
    machineEnv("AUTH_SERVICE_URL") ||
    process.env.NEXT_PUBLIC_AUTH_URL ||
    machineEnv("NEXT_PUBLIC_AUTH_URL") ||
    "http://127.0.0.1:3001"
  )
}

export type MemorySession = { email: string; roles: string[]; userId: string }

/**
 * Кто вошёл, по мнению единственной службы входа. `null` — никто.
 *
 * 🛑 ПУСТАЯ КОРЗИНА КУК — НЕ ПОВОД НЕ СПРАШИВАТЬ. Пока сервер живёт на голом IP,
 * служба входа отдаёт архитектора всем (режим онбординга); ранний выход сделал
 * бы эту страницу единственной, которая в онбординге никого не пускает.
 */
export async function whoIsThere(request: Request): Promise<MemorySession | null> {
  const cookie = request.headers.get("cookie") ?? ""
  try {
    const res = await fetch(`${authUrl()}/api/session`, {
      cache: "no-store",
      headers: cookie ? { cookie } : undefined,
    })
    if (!res.ok) return null
    // 🔒 ОТВЕТ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ: служба может ответить `200` с
    // телом без `email` — это «никто не вошёл», а не «вошёл безымянный».
    const s = (await res.json().catch(() => null)) as Partial<MemorySession> | null
    if (!s?.email) return null
    return { email: s.email, roles: Array.isArray(s.roles) ? s.roles : [], userId: s.userId ?? s.email }
  } catch {
    return null
  }
}

/** Пускать ли к стенду. Роль та же, что у ключей и терминала. */
export function isArchitect(session: MemorySession | null): boolean {
  return Boolean(session?.roles.includes("architect"))
}

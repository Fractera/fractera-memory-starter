import { NextResponse } from "next/server"
import { keyMatches } from "@/lib/api-key.mjs"
import { fracteraSession } from "@/lib/fractera/session"

// ПРИВРАТНИК ДВЕРЕЙ СТЕНДА: СЕССИЯ ЧЕЛОВЕКА ИЛИ КЛЮЧ ПАМЯТИ (189-3).
//
// 🎯 ЗАЧЕМ ЗАВЕДЁН. Страница стенда закрыта ролью `architect`, и это правильно —
// но из-за этого ПРИБОР не может прогнать её двери: у скрипта нет куки, и он
// получает переадресацию на вход. Два подшага подряд закрывались косвенной
// плоскостью — «собранное дерево на сервере» вместо настоящего вызова.
//
// 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-12: не снимать защиту, а научить двери стенда
// принимать тот ключ, который у памяти УЖЕ есть. Его слова на предложение
// открыть сервер в режиме без авторизации — выбран второй путь, «на будущее»,
// ради воспроизводимых машинных замеров.
//
// 🔒 НОВОГО КЛАССА ВЛАСТИ НЕ ПОЯВЛЯЕТСЯ, И ЭТО ГЛАВНЫЙ ДОВОД. Тот же ключ уже
// открывает `/v1/remember` и `/v1/recall`, то есть запись и чтение самой памяти.
// Стенд ходит в те же хранилища и ничего сверх них не умеет; отказать ему в
// ключе значило бы охранять окно в стене, где рядом открыта дверь.
//
// 🛑 ЧЕГО ЭТОТ ПРИВРАТНИК НЕ ДЕЛАЕТ: он не открывает СТРАНИЦУ. Экран
// по-прежнему живёт под ролью `architect` — ключом открываются только двери
// `/api/fractera/*-test`, то есть то, что зовут инструменты, а не то, что
// смотрит человек.
//
// 🔒 КЛЮЧ ПРИНИМАЕТСЯ ДВУМЯ ЗАГОЛОВКАМИ — `x-memory-key` и `Authorization:
// Bearer`, — ровно как в `server.mjs`. Третьего способа нет и не будет: два
// набора правил на один ключ разошлись бы молча.

export type BenchWho = { by: "key" | "session"; email?: string }

/**
 * Пустить или отказать.
 *
 * Возвращает `{ denied }` с готовым ответом, когда пускать нельзя, и `{ who }`,
 * когда можно. 🔒 Отказы РАЗНЫЕ и названы по-разному: `unauthorized` значит «я
 * тебя не знаю», `forbidden` — «знаю, но роль не та». Один код на оба заставил
 * бы человека гадать, входить ему заново или просить прав.
 */
export async function benchGuard(
  request: Request,
): Promise<{ denied: NextResponse; who?: never } | { denied?: never; who: BenchWho }> {
  const bearer = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "")
  const header = request.headers.get("x-memory-key") ?? ""
  if (keyMatches(header) || keyMatches(bearer)) {
    return { who: { by: "key" } }
  }

  const session = await fracteraSession()
  if (!session) {
    return { denied: NextResponse.json({ error: "unauthorized", ok: false }, { status: 401 }) }
  }
  if (!session.roles.includes("architect")) {
    return { denied: NextResponse.json({ error: "forbidden", ok: false }, { status: 403 }) }
  }
  return { who: { by: "session", email: session.email } }
}

import { NextResponse } from "next/server"
import { benchGuard } from "@/lib/bench-guard"
import { status, stop } from "@/lib/fractera/build-session.mjs"

// ДВЕРЬ СЕССИИ СТРОИТЕЛЯ: СПИТ ЛИ ТЕРМИНАЛ МАСТЕРСКОЙ, И ОСТАНОВИТЬ ЕГО (шаг 202-2).
//
// 🔒 СТАТУС СПРАШИВАЕТСЯ ДО ПОДКЛЮЧЕНИЯ, И В ЭТОМ ВЕСЬ СОН: страница узнаёт «спит» по двери, а не
// открывая сокет, — значит открытая «просто посмотреть» вкладка не рождает процесс даже случайно.
//
// 🔒 ЗАМОК ДВОЙНОЙ — `benchGuard`: сессия архитектора (человек на странице) или секрет машины (прибор на
// сервере). Секрет машины и так даёт на этой машине всё; отдельного ослабления здесь нет.
// 🛑 ИМЯ СТОИТ В `SELF_GUARDED` ПРИВРАТНИКА: иначе «ответом» была бы страница входа (закон 161).

export async function GET(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied
  return NextResponse.json({ ok: true, ...status() }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied
  const body = (await request.json().catch(() => null)) as { action?: string } | null
  if (body?.action !== "stop") {
    return NextResponse.json({ error: "unknown-action", ok: false }, { status: 400 })
  }
  return NextResponse.json({ ...stop("stopped"), ...status() }, { headers: { "Cache-Control": "no-store" } })
}

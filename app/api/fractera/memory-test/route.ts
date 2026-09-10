// @api испытательный стенд памяти: позвать её метод и увидеть ответ целиком
import { NextResponse } from "next/server"
// 🔒 ИСПОЛНИТЕЛИ ПАМЯТИ ЖИВУТ В `.mjs` И ЗОВУТСЯ ОТСЮДА НАПРЯМУЮ. Это ядро
// службы, написанное до появления страницы; переписывать его под TypeScript
// значило бы ровно то «программирование заново», которого владелец просил
// избежать. TypeScript выводит их типы сам — объявлять ничего не нужно.
import { forget_journal, journal } from "@/lib/journal-verbs.mjs"
import { people, recall, remember } from "@/lib/verbs.mjs"
import { isArchitect, whoIsThere } from "@/lib/session-http"

// ДВЕРЬ СТЕНДА — ТЕПЕРЬ ВНУТРИ САМОЙ ПАМЯТИ (178-2).
//
// 🪦 РАНЬШЕ ОНА ЖИЛА НА СЛУЖБЕ ЧАТА И ХОДИЛА К ПАМЯТИ ПО HTTP, ЧЕРЕЗ ПЕТЛЮ,
// с секретом машины. Это было единственным способом: страницы у памяти не было.
// 🔒 ТЕПЕРЬ СЕТИ В ЦЕПОЧКЕ НЕТ ВОВСЕ — исполнители зовутся прямо, как их зовёт
// собственный `server.mjs`. Цель владельца дословно: «чтобы мы прям память
// тестировали из памяти, а не из чата».
// 🛑 И ЭТО НЕ «УПРОЩЕНИЕ РАДИ СКОРОСТИ», А УСТРАНЕНИЕ ПОСРЕДНИКА, КОТОРЫЙ МОГ
// ВРАТЬ. Разбор 2026-09-10 показал: между вопросом и памятью стояли перезапуск
// чужой службы и два промаха с именами — и всё это выглядело как медлительность
// памяти.
//
// 🔒 ЗАМОК — СЕССИЯ ЧЕЛОВЕКА, РОЛЬ `architect`, тем же конвейером, что у панели,
// сайта и чата: куки → служба входа `:3001` → `{email, roles}`.
//
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

/**
 * 🔒 СЛУЖЕБНОЕ ИМЯ ЗАПИСИ ЗАВОДИТ СТЕНД САМ И НАРУЖУ НЕ ВЫНОСИТ.
 * Решение владельца 2026-09-10: «какой ещё ключ?.. я никакие ключи не даю…
 * если что-то надо сделай свою». Поля на экране нет и не будет.
 */
const BENCH_WHO = "bench-1"

/** Методы, у которых первый параметр — «чей факт». Стенд подставляет своё имя. */
const NEEDS_WHO = new Set(["remember", "recall"])

/**
 * 🔒 ИСПОЛНИТЕЛИ ПЕРЕЧИСЛЕНЫ ЗДЕСЬ ТАК ЖЕ, КАК В `server.mjs` — по имени из
 * договора. Второй список разошёлся бы с первым молча; он и остаётся вторым,
 * и это названный долг: свести их в один можно, только когда ядро памяти
 * получит типы, а это отдельное решение.
 */
// 🛑 ТИП АРГУМЕНТА НАМЕРЕННО ШИРОКИЙ. У исполнителей разные подписи: одни ждут
// `{who, text}`, другие ничего; стенд же обязан позвать ЛЮБОЙ метод договора —
// в том числе тот, что появится завтра. Сузить тип значило бы запретить стенду
// его единственное назначение.
// 🔒 ПРОВЕРКУ ДЕЛАЕТ САМА ПАМЯТЬ, И ЭТО ПРАВИЛЬНОЕ МЕСТО: она отвечает
// `need-who-and-text`, и стенд обязан ЭТОТ отказ показать, а не подменить своим.
const RUN: Record<string, (body: never) => Promise<unknown>> = {
  forget_journal,
  journal,
  people,
  recall,
  remember,
}

export async function POST(request: Request) {
  const session = await whoIsThere(request)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!isArchitect(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "bad-json", ok: false }, { status: 400 })
  }

  const method = typeof body.method === "string" ? body.method.trim() : ""
  if (!/^[a-z][a-z0-9_-]{0,40}$/.test(method)) {
    return NextResponse.json({ error: "bad-method", ok: false }, { status: 400 })
  }

  const sent = (body.body ?? {}) as Record<string, unknown>
  // 🔒 СВОЁ ИМЯ ПОДСТАВЛЯЕТСЯ, НО НЕ ЗАТИРАЕТ УКАЗАННОЕ ЯВНО: в сыром режиме
  // человек вправе назвать любое, и стенд не спорит — он показывает, что вышло.
  const payload =
    NEEDS_WHO.has(method) && !("who" in sent) ? { ...sent, who: BENCH_WHO } : sent

  const run = RUN[method] as ((body: unknown) => Promise<unknown>) | undefined
  if (!run) {
    // 🔒 ОТКАЗ ПОВТОРЯЕТ ФОРМУ САМОЙ СЛУЖБЫ: «не построено», а не «не бывает».
    // Стенд заведён в том числе для методов, которых ещё нет, и он обязан
    // показывать их отказ, а не прятать за своей ошибкой.
    return NextResponse.json(
      {
        body: {
          error: "not-built",
          hint: "этого метода в договоре нет: методы наполняются по одному, осознанно",
          ok: false,
        },
        ms: 0,
        sent: { body: payload, method },
        status: 501,
        trouble: null,
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  }

  const started = Date.now()
  try {
    const answer = await run(payload)
    return NextResponse.json(
      { body: answer, ms: Date.now() - started, sent: { body: payload, method }, status: 200, trouble: null },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (e) {
    // 🛑 ОТКАЗ ИСПОЛНИТЕЛЯ — ЭТО ОТВЕТ, А НЕ ПАДЕНИЕ СТРАНИЦЫ. Стенд для того и
    // есть, чтобы видеть, как память ведёт себя на самом деле.
    return NextResponse.json(
      {
        body: null,
        ms: Date.now() - started,
        sent: { body: payload, method },
        status: 0,
        trouble: `память отказала: ${String((e as Error).message)}`,
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  }
}

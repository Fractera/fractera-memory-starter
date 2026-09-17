// @api модели памяти: чем она думает и чем считает смысл
import { NextResponse } from "next/server"
import { EMBED_MODELS, readModels, setEmbedModel, setThinkModel, THINK_MODELS } from "@/lib/architect/models"
import { fracteraSession } from "@/lib/fractera/session"

// ДВЕРЬ НАСТРОЙКИ МОДЕЛЕЙ (189-7).
//
// 🔒 ЗАМОК — ТОЛЬКО СЕССИЯ АРХИТЕКТОРА, И ЗДЕСЬ ОН УЖЕ, ЧЕМ У СТЕНДА. Двери
// стенда пускают ещё и свои процессы по секрету машины: приборам нужно мерить.
// Здесь мерить нечего — это настройка, и менять её вправе человек, а не скрипт.
// Тот же довод, что у ключей: у настройки один хозяин.
//
// 🔒 ИМЯ СТОИТ В `SELF_GUARDED` ПРИВРАТНИКА ДО ПЕРВОЙ СБОРКИ: дверь проверяет
// сессию сама, и перехваченная привратником отдала бы переадресацию вместо JSON.
//
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

const deny = (error: string, status: number) =>
  NextResponse.json({ error, ok: false }, { status })

async function guard() {
  const session = await fracteraSession()
  if (!session) return deny("unauthorized", 401)
  if (!session.roles.includes("architect")) return deny("forbidden", 403)
  return null
}

/** Что стоит сейчас и из чего можно выбрать. */
export async function GET() {
  const denied = await guard()
  if (denied) return denied

  const state = await readModels()
  return NextResponse.json({
    ...state,
    choices: { embed: EMBED_MODELS, think: THINK_MODELS },
    ok: true,
  })
}

/** Сменить одну из моделей. */
export async function POST(request: Request) {
  const denied = await guard()
  if (denied) return denied

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return deny("bad-json", 400)
  }

  const what = String(body.what ?? "")
  const id = String(body.id ?? "")

  if (what === "think") {
    const r = setThinkModel(id)
    if (!r.ok) return deny(String(r.error), 400)
    // 🔒 «СОХРАНЕНО» РАВНО «ПРИМЕНЕНО», И ЭТО СКАЗАНО НАРУЖУ ПОЛЕМ, А НЕ
    // ПОДРАЗУМЕВАЕТСЯ: разбор читает модель в момент вызова, перезапуск не нужен.
    return NextResponse.json({ applied: "now", ok: true })
  }

  if (what === "embed") {
    const r = await setEmbedModel(id)
    if (!r.ok) return deny(String(r.error), 400)
    // 🛑 ЗДЕСЬ «СОХРАНЕНО» НЕ РАВНО «ПРИМЕНЕНО», И МОЛЧАТЬ ОБ ЭТОМ НЕЛЬЗЯ. Слой
    // данных читает окружение при старте; пока его не перезапустят, он работает
    // прежней моделью. Зелёное «готово» без этой оговорки было бы ложью.
    return NextResponse.json({ applied: "after-restart", ok: true })
  }

  return deny("unknown-target", 400)
}

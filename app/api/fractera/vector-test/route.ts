// @api стенд векторного хранилища: положить свой текст и увидеть, что легло
import { NextResponse } from "next/server"
import { forget, remember, status } from "@/lib/fractera/vectors"
import { benchGuard } from "@/lib/bench-guard"

// ДВЕРЬ СТЕНДА ВЕКТОРНОГО ХРАНИЛИЩА (189-6).
//
// 🔒 ТА ЖЕ ФОРМА, ЧТО У ГРАФА, И ЭТО ТРЕБОВАНИЕ ВЛАДЕЛЬЦА: «одной формой, а не
// второй конструкцией». Загрузка · поиск · оценка — тот же порядок, те же
// органы, тот же корпус случаев. Две конструкции разошлись бы: та, которой
// пользуются реже, отстала бы и осталась с прежним видом ответа.
//
// 🔒 ЗАМОК ОБЩИЙ — `benchGuard`: сессия архитектора или секрет машины. Ключ
// памяти сюда не подходит: наружу открыт только договор.
//
// 🛑 ЧЕМ ЭТА ЗАГРУЗКА ОТЛИЧАЕТСЯ ОТ ГРАФОВОЙ, И ЭТО ГЛАВНОЕ, ЧТО ПОКАЖЕТ СТЕНД:
// здесь модель текст НЕ ЧИТАЕТ. Считаются только встраивания — это заметно
// дешевле и быстрее, но и знания о связях отсюда не возникает. Два хранилища
// стоят рядом именно затем, чтобы эта разница была видна числами.

const deny = (error: string, status: number) =>
  NextResponse.json({ error, ok: false }, { status })

/** Имя коллекции стенда. Жёстко наше — по нему же идёт уборка. */
export const BENCH_COLLECTION = "memory-bench"

/** Что лежит в коллекции стенда и настроен ли склад. */
export async function GET(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  const s = await status(BENCH_COLLECTION)
  return NextResponse.json({ ...s, collection: BENCH_COLLECTION })
}

/**
 * Положить текст.
 *
 * 🔒 РЕЖЕТ НА КУСКИ ДВЕРЬ, А НЕ ЧЕЛОВЕК. Своей нарезки у склада нет: длинный
 * текст уехал бы в один вектор и размазал бы смысл, а очень длинный превысил бы
 * предел модели. Режем по абзацам — они и есть естественная единица смысла;
 * слишком короткие прилепляются к соседу, иначе склад наполнится обрывками,
 * близкими ко всему сразу.
 */
export async function POST(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return deny("bad-json", 400)
  }

  const text = String(body.text ?? "").trim()
  const source = String(body.source ?? "").trim() || `bench-${Date.now()}`
  if (!text) return deny("empty-text", 400)

  const parts: string[] = []
  for (const raw of text.split(/\n\s*\n/)) {
    const piece = raw.trim().replace(/\s+/g, " ")
    if (!piece) continue
    if (piece.length < 80 && parts.length > 0) parts[parts.length - 1] += ` ${piece}`
    else parts.push(piece)
  }
  if (parts.length === 0) return deny("empty-text", 400)

  const started = Date.now()
  let stored = 0
  let dims = 0
  for (const [i, piece] of parts.entries()) {
    const r = await remember({
      collection: BENCH_COLLECTION,
      id: `${source}-${i}`,
      text: piece,
    })
    if (r.ok) {
      stored += 1
      dims = r.dims ?? dims
    }
  }
  const ms = Date.now() - started

  if (stored === 0) return deny("store-unreachable", 502)

  return NextResponse.json({
    // 🔒 ЦЕНА НАЗЫВАЕТСЯ ЧИСЛОМ И ЗДЕСЬ — иначе «дешевле графа» остаётся словами.
    dims,
    ms,
    ok: true,
    parts: parts.length,
    source,
    stored,
  })
}

/** Забыть всё, что положил стенд. Имя коллекции снаружи не принимается. */
export async function DELETE(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  const r = await forget(BENCH_COLLECTION)
  return NextResponse.json({ ok: r.ok, removed: r.removed })
}

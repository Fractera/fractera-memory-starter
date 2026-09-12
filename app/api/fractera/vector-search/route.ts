// @api стенд векторного хранилища: спросить по смыслу и увидеть близость числом
import { NextResponse } from "next/server"
import { NEAR, recall } from "@/lib/fractera/vectors"
import { noteRun } from "@/lib/cases.mjs"
import { benchGuard } from "@/lib/bench-guard"
import { BENCH_COLLECTION } from "../vector-test/route"

// ДВЕРЬ ПОИСКА ПО СМЫСЛУ (189-6).
//
// 🔒 ЗДЕСЬ ЕСТЬ ТО, ЧЕГО НЕТ У ГРАФА: ЧИСЛО БЛИЗОСТИ. Значит именно здесь можно
// честно отличить «нашёл» от «вернул ближайшее» — и потому `found` у этой двери
// означает НЕ «ответ не пустой», а «нашлось хотя бы одно попадание ближе
// порога».
//
// ✗ ЭТО ЛЕЧЕНИЕ ДЕФЕКТА, НАЙДЕННОГО ИСПЫТАНИЕМ ГРАФА В ТОТ ЖЕ ДЕНЬ: там мерка
// «нашлось» считала находкой любой ответ длиннее восьмидесяти знаков — и
// показала «5 из 5» на корпусе, где половина вопросов была без ответа. Прибор,
// который не умеет провалиться, бесполезен.
//
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

const deny = (error: string, status: number) =>
  NextResponse.json({ error, ok: false }, { status })

export async function POST(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return deny("bad-json", 400)
  }

  const question = String(body.question ?? "").trim()
  if (!question) return deny("empty-question", 400)

  const started = Date.now()
  const r = await recall({ collection: BENCH_COLLECTION, k: 5, query: question })
  const askMs = Date.now() - started

  if (!r.ok) return deny("store-unreachable", 502)

  // 🔒 «НАШЛОСЬ» ЗНАЧИТ «ЕСТЬ ПОПАДАНИЕ БЛИЖЕ ПОРОГА», А НЕ «СКЛАД ЧТО-ТО ВЕРНУЛ».
  // Склад возвращает ближайшее всегда — пустого ответа у него не бывает.
  const found = r.near.length > 0
  const best = r.pieces[0]

  const noted = await noteRun({
    askMs,
    entities: r.near.length,
    found,
    keywords: null,
    legacy: false,
    // Модель здесь не думает вовсе: считаются только встраивания вопроса.
    modelTurn: "none",
    question,
    store: "vector",
    wordsMs: 0,
  })

  return NextResponse.json({
    askMs,
    caseId: noted.ok ? noted.id : null,
    found,
    near: r.near,
    // 🛑 ДАЛЬНЕЕ ПОКАЗЫВАЕТСЯ ТОЖЕ, И ЭТО НЕ ШУМ: «ближайшее было 0.21» и «склад
    // пуст» — разные ответы, и человек обязан их различать.
    nearest: best ? { score: best.score, text: best.text.slice(0, 400) } : null,
    ok: true,
    threshold: NEAR,
    total: r.pieces.length,
  })
}

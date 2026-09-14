// @api стенд ссылок памяти: найти сохранённую ссылку по смыслу вопроса — только среди ссылок, ответ формы объекта
import { NextResponse } from "next/server"
import { benchGuard } from "@/lib/bench-guard"
import { noteRun } from "@/lib/cases.mjs"
import { find, OBJECT_NEAR } from "@/lib/fractera/objects"

// ДВЕРЬ ПОИСКА ССЫЛОК (195-8).
//
// 🪦 ФОРМА ДВЕРИ `object-search` (192-1) — законы те же: `found` значит «есть ближе порога», дальние не выбрасываются, а считаются.
// 🔒 ИЩЕТ ТОЛЬКО СРЕДИ ССЫЛОК (род `web`), НО ТЕМ ЖЕ СКЛАДОМ И ТЕМ ЖЕ ПОРОГОМ, ЧТО ОБЪЕКТЫ. Слово владельца (паспорт §20.6 ①): «Найди
// среди тех которые я ранее анализировал… я получаю также как если бы объектом полное описание краткое описание и самому ссылку».
// 🛑 ПОРОГ `OBJECT_NEAR` ИЗМЕРЕН НА КАРТОЧКАХ ОБЪЕКТОВ (192), НА ССЫЛКАХ — НЕТ. Числа близости уходят экрану и прибору целиком.
// 🔒 ПРОГОН ПРИБОРА В КОРПУС СЛУЧАЕВ ЧЕЛОВЕКА НЕ ПОПАДАЕТ — признак полем `probe`, а не словом в вопросе.
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

const deny = (error: string, status: number) => NextResponse.json({ error, ok: false }, { status })

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
  const probe = body.probe === true

  const started = Date.now()
  const r = await find({ k: 5, kind: "web", question })
  const askMs = Date.now() - started
  if (!r.ok) return deny("store-unreachable", 502)

  const found = r.near.length > 0
  const best = r.hits[0]
  const noted = probe
    ? { id: null, ok: false }
    : await noteRun({
        askMs,
        entities: r.near.length,
        found,
        keywords: null,
        legacy: false,
        modelTurn: "none",
        question,
        store: "link",
        wordsMs: 0,
      })

  return NextResponse.json({
    askMs,
    caseId: noted.ok ? noted.id : null,
    found,
    hits: r.hits,
    lost: r.lost,
    near: r.near,
    nearest: best ? { id: best.id, name: best.name, score: best.score } : null,
    ok: true,
    threshold: OBJECT_NEAR,
    total: r.hits.length,
  })
}

// @api стенд объектного хранилища: найти вещь по смыслу вопроса и увидеть близость числом
import { NextResponse } from "next/server"
import { find, OBJECT_NEAR } from "@/lib/fractera/objects"
import { noteRun } from "@/lib/cases.mjs"
import { benchGuard } from "@/lib/bench-guard"

// ДВЕРЬ ПОИСКА ОБЪЕКТА (192-1).
//
// 🔒 `found` ЗНАЧИТ «ЕСТЬ ОБЪЕКТ БЛИЖЕ ПОРОГА», А НЕ «СКЛАД ЧТО-ТО ВЕРНУЛ» — тот
// же закон, что у вектора (189-6): склад карточек пустого ответа не знает, у
// него всегда есть ближайшее.
//
// 🔒 НАРУЖУ ЕДЕТ ПРЕДМЕТ, А НЕ ЦИТАТА: id, имя, род, размер, описание. Содержимое
// достаёт соседняя дверь `object-open` — отдельным шагом, потому что документ
// бывает длиннее всего, что стоит нести в ответе поиска.
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
  // 🔒 ПРОГОН ПРИБОРА В КОРПУС СЛУЧАЕВ ЧЕЛОВЕКА НЕ ПОПАДАЕТ — признак полем, а не
  // словом в вопросе: вопрос уезжает в эмбеддинг, и метка исказила бы измеряемое.
  const probe = body.probe === true

  const started = Date.now()
  const r = await find({ k: 5, question })
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
        store: "object",
        wordsMs: 0,
      })

  return NextResponse.json({
    askMs,
    caseId: noted.ok ? noted.id : null,
    found,
    // 🛑 КАРТОЧКИ БЕЗ ФАЙЛА НАЗЫВАЮТСЯ ЧИСЛОМ: объект стёрли мимо памяти.
    lost: r.lost,
    near: r.near,
    nearest: best ? { id: best.id, name: best.name, score: best.score } : null,
    ok: true,
    threshold: OBJECT_NEAR,
    total: r.hits.length,
    // Все кандидаты с числами — прибору нужны и дальние, чтобы мерить зазор.
    hits: r.hits,
  })
}

// @api корпус случаев стенда: прогоны, их цена и вердикт человека
import { NextResponse } from "next/server"
import { caseBook, forgetProbeCases, judge } from "@/lib/cases.mjs"
import { benchGuard } from "@/lib/bench-guard"

// ДВЕРЬ КОРПУСА СЛУЧАЕВ (189-5).
//
// 🎯 «затем получить оценку того что найдено» — третья треть заказа владельца.
//
// 🔒 ВЕРДИКТ ПРИХОДИТ СНАРУЖИ, ОТ ЧЕЛОВЕКА (паспорт §11). Дверь не умеет
// ставить вердикт сама и не имеет для этого никакого пути: модель,
// пересказывающая собственную работу, ошибается в свою пользу, и в этом
// проекте за такое уже заплачено — служба Telegram верила агенту на слово о
// его же работе, и закон «считать по записям прогона» не исполнялся ни дня.
//
// 🔒 ЗАМОК ТОТ ЖЕ, ЧТО У ОБЕИХ ДВЕРЕЙ СТЕНДА, И ИМЯ СТОИТ В `SELF_GUARDED`
// ПРИВРАТНИКА ДО ПЕРВОЙ СБОРКИ, а не после отладки.
//
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

const deny = (error: string, status: number) =>
  NextResponse.json({ error, ok: false }, { status })

/** Последние случаи и сводка. */
export async function GET(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  const book = await caseBook(25)
  return NextResponse.json(book)
}

/** Поставить вердикт прогону. */
export async function POST(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return deny("bad-json", 400)
  }

  const id = Number(body.id ?? 0)
  if (!id) return deny("no-case", 400)

  const result = await judge({
    id,
    verdict: String(body.verdict ?? ""),
    why: String(body.why ?? ""),
  })
  if (!result.ok) return deny(String(result.error ?? "refused"), 400)
  return NextResponse.json({ ok: true })
}

/**
 * Убрать случаи прибора — ТОЛЬКО по его метке, и она обязана прийти.
 *
 * 🛑 ПУСТАЯ МЕТКА ОТВЕРГАЕТСЯ, И ЭТО ГРАНИЦА, А НЕ ПРОВЕРКА ФОРМЫ. `DELETE` без
 * условия стёр бы корпус целиком — то есть все вердикты, которые человек
 * ставил руками. В соседней службе прибор, стиравший по хранилищу, уже снёс
 * живую память владельца.
 */
export async function DELETE(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  const mark = new URL(request.url).searchParams.get("mark") ?? ""
  if (!mark.trim()) return deny("empty-mark", 400)

  const result = await forgetProbeCases(mark)
  if (!result.ok) return deny(String(result.error ?? "refused"), 400)
  return NextResponse.json({ ok: true })
}

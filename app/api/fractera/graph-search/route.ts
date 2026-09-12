// @api стенд графа знаний: спросить и увидеть, чем ответ обошёлся
import { NextResponse } from "next/server"
import { ask, forgetDocuments } from "@/lib/fractera/knowledge"
import { keywordsFor } from "@/lib/keywords"
import { noteRun } from "@/lib/cases.mjs"
import { benchGuard } from "@/lib/bench-guard"

// ДВЕРЬ ПОИСКА ПО ГРАФУ (189-4).
//
// 🎯 ВТОРАЯ ТРЕТЬ ЗАКАЗА ВЛАДЕЛЬЦА: «затем найти и заранее сохранённого». И его
// же утверждение о цене, ради которого весь шаг: «после этого модель отвечает
// мгновенно».
//
// 🔒 КЛЮЧЕВЫЕ СЛОВА ДАЁМ МЫ, И ЭТО ГЛАВНОЕ ОТЛИЧИЕ ОТ ПРЕЖНЕГО КОДА. Без них
// движок сам зовёт `gpt-4o-mini`, чтобы вытащить слова из вопроса: 3538 мс
// против 666 мс, измерено. Прежний `ask()` чата слов не слал — чтение платило
// ход модели МОЛЧА, и никто этого не видел, потому что повторные вопросы
// попадали в кэш движка.
//
// 🔒 ПОЭТОМУ У ДВЕРИ ЕСТЬ РЕЖИМ `legacy` — НЕ РАДИ СОВМЕСТИМОСТИ, А РАДИ
// ДОКАЗАТЕЛЬСТВА. Один и тот же вопрос двумя путями: с нашими словами и без.
// Прибор, у которого оба исхода дают одно число, измеряет не то, что утверждает;
// здесь разница видна прямо на экране.
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
  const legacy = body.legacy === true
  // 🔒 ПРОГОН ПРИБОРА В ЧЕЛОВЕЧЕСКИЙ КОРПУС НЕ ПОПАДАЕТ (найдено 2026-09-13).
  // ✗ Оплачено сразу: приборы за день положили туда 65 записей, и все они
  // числились «ждут вашего вердикта». Вкладка оценки, заваленная чужими
  // прогонами, бесполезна человеку ровно так же, как пустая.
  // 🛑 ПОМЕТИТЬ САМ ВОПРОС БЫЛО НЕЛЬЗЯ: у вектора текст вопроса уезжает в
  // эмбеддинг, и метка исказила бы то самое, что прибор измеряет. Значит признак
  // едет отдельным полем, а не внутри слов.
  const probe = body.probe === true

  // 🔒 СБОР СЛОВ МЕРЯЕТСЯ ОТДЕЛЬНО ОТ ВОПРОСА К ГРАФУ. Иначе непонятно, за что
  // заплачены секунды: за нашу подготовку или за чужую службу. Разделённые,
  // они отвечают на разные вопросы — и чинятся в разных местах.
  const startedWords = Date.now()
  const kw = legacy ? { high: [], low: [], matched: [] } : await keywordsFor(question)
  const wordsMs = Date.now() - startedWords

  const startedAsk = Date.now()
  const answer = await ask(question, "hybrid", {
    context: true,
    high: kw.high,
    low: kw.low,
  })
  const askMs = Date.now() - startedAsk

  if (!answer.available) {
    return NextResponse.json({ error: "graph-unreachable", ok: false }, { status: 502 })
  }

  // 🔒 ЧТО ИМЕННО ВЕРНУЛ ГРАФ, СЧИТАЕТСЯ ПО ЕГО ЖЕ ОТВЕТУ, А НЕ ОБЪЯВЛЯЕТСЯ.
  // Пустой контекст — законный исход («не нашлось»), и он обязан отличаться от
  // отказа службы: первое чинится другим вопросом, второе — поднятием службы.
  const context = String(answer.answer ?? "")
  const entities = (context.match(/Knowledge Graph Data \(Entity\)/g) ?? []).length
  const found = context.replace(/\s+/g, "").length > 80

  // 🔒 ПРОГОН ЛОЖИТСЯ В КОРПУС СЛУЧАЕВ СРАЗУ, А НЕ ПО НАЖАТИЮ ВЕРДИКТА (189-5).
  // Человек судит не всегда — а цена уже измерена, и потерять её значит
  // потерять половину знания о прогоне. Вердикт придёт позже и прикрепится по
  // номеру; прогон без вердикта числится НЕЗАВЕРШЁННЫМ, а не удачным.
  // 🛑 ОТКАЗ ЗАПИСИ НЕ ЛОМАЕТ ОТВЕТ: человек спрашивал граф, а не наш учёт.
  // Молчать о нём при этом нельзя — поэтому наружу едет `caseId: null`.
  const noted = probe ? { id: null, ok: false } : await noteRun({
    askMs,
    entities,
    found,
    keywords: legacy ? null : kw,
    legacy,
    modelTurn: legacy ? "unknown" : "none",
    question,
    store: "graph",
    wordsMs,
  })

  return NextResponse.json({
    askMs,
    caseId: noted.ok ? noted.id : null,
    context,
    entities,
    found,
    keywords: legacy ? null : { high: kw.high, low: kw.low, matched: kw.matched },
    legacy,
    // 🛑 УТВЕРЖДЕНИЕ О ХОДЕ МОДЕЛИ ДЕЛАЕТСЯ ТОЛЬКО ТАМ, ГДЕ ОНО ОБОСНОВАНО.
    // Прислали слова — движку нечего извлекать, и ход не нужен. Не прислали —
    // мы НЕ ЗНАЕМ, звал он модель или ответил из кэша, и так и сказано.
    modelTurn: legacy ? "unknown" : "none",
    ok: true,
    wordsMs,
  })
}

/**
 * Забыть то, что положил стенд.
 *
 * 🔒 ПРЕФИКС ЖЁСТКО НАШ И НЕ ПРИХОДИТ СНАРУЖИ. `forgetDocuments("")` совпал бы
 * со ВСЕМИ документами графа, включая чужие; приняв префикс параметром, дверь
 * стала бы кнопкой «стереть всё знание» для любого, у кого есть ключ.
 * ✗ В соседней службе прибор, стиравший по хранилищу, а не по своей метке,
 * снёс живую память владельца. Здесь эта возможность закрыта конструкцией.
 */
export async function DELETE(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  const result = await forgetDocuments("bench/")
  return NextResponse.json({ ok: true, ...result })
}

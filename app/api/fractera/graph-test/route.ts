// @api стенд графа знаний: положить свой текст и увидеть, что из него родилось
import { NextResponse } from "next/server"
import {
  graphWork,
  knowledgeDocuments,
  knowledgeReady,
  labels,
  learn,
} from "@/lib/fractera/knowledge"
import { benchGuard } from "@/lib/bench-guard"

// ДВЕРЬ СТЕНДА ГРАФА ЗНАНИЙ (189-2).
//
// 🎯 ЗАКАЗ ВЛАДЕЛЬЦА 2026-09-12, ДОСЛОВНО: «пользователь мог загрузить свои
// данные нажать преобразовать и сохранить хранилище затем найти и заранее
// сохранённого затем получить оценку того что найдено». Здесь первая треть:
// загрузить и увидеть, что родилось.
//
// 🔒 ЗАМОК — СЕССИЯ ЧЕЛОВЕКА (роль `architect`) ЛИБО КЛЮЧ ПАМЯТИ (189-3), и
// дверь проверяет его САМА, общим привратником `lib/bench-guard.ts`. Ключ здесь
// затем, чтобы приборы могли прогнать стенд без браузера: два подшага подряд
// закрывались косвенной плоскостью, потому что у скрипта нет куки.
//
// 🔒 ПРОВЕРЯЯ ЗАМОК САМА, ДВЕРЬ ОБЯЗАНА СТОЯТЬ В `SELF_GUARDED` ПРИВРАТНИКА.
// Перехваченная им, она отдаст переадресацию, островок прочитает HTML вместо
// JSON — и человек увидит «граф не отвечает» там, где истекла его сессия.
// ✗ В этой службе такое уже стоило владельцу петли на кнопке «Войти» (180).
//
// 🔒 ДОРОГА К ГРАФУ — ЧЕРЕЗ СЛОЙ ДАННЫХ, а не напрямую к движку: так это уже
// сделано у чата, и у памяти не появляется ни второго адреса, ни второго ключа.
//
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

/** Кому отказано и почему — словами, которые островок покажет как есть. */
const deny = (error: string, status: number) =>
  NextResponse.json({ error, ok: false }, { status })

/**
 * Что сейчас в графе.
 *
 * 🔒 ДВА ЧИСЛА, А НЕ ОДНО: документы говорят, что мы ПОЛОЖИЛИ, метки — что граф
 * из этого ИЗВЛЁК. Совпадение первого без второго и есть тот случай, когда
 * «загрузилось» выглядит успехом, а искать потом нечего.
 */
export async function GET(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  const ready = await knowledgeReady()
  if (!ready) {
    return NextResponse.json({
      documents: [],
      labels: 0,
      ok: true,
      ready: false,
    })
  }

  // 🔒 ТРИ ОТВЕТА НА ОДИН ВОПРОС «ЧТО ПРОИСХОДИТ», И КАЖДЫЙ О СВОЁМ: документы —
  // что мы положили, метки — что граф извлёк, работа — чем это ему обошлось.
  const [docs, names, work] = await Promise.all([knowledgeDocuments(), labels(), graphWork()])
  return NextResponse.json({
    documents: docs,
    labels: names.length,
    labelSample: names.slice(0, 12),
    ok: true,
    ready: true,
    work,
  })
}

/**
 * Положить свой текст в граф.
 *
 * 🔒 ЯКОРЬ ОБЯЗАТЕЛЕН, И ЭТО НЕ ФОРМАЛЬНОСТЬ ФОРМЫ. Закон перенесённого файла:
 * запись без якоря граф примет, а найти её не сможет никто — вопрос приходит от
 * имени, и связи с именем у такой записи нет. Отказ здесь дешевле, чем
 * документ, который существует и недостижим.
 *
 * 🔒 ОТКАЗ ГРАФА ВОЗВРАЩАЕТСЯ КАК ЕСТЬ, А НЕ ПОДМЕНЯЕТСЯ СВОИМ. `learn()` уже
 * различает «пустой текст», «нет якоря» и «служба недостижима» — стенд обязан
 * показать именно это различие.
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
  const source = String(body.source ?? "").trim()
  const anchors = (Array.isArray(body.anchors) ? body.anchors : [])
    .map((a) => String(a ?? "").trim())
    .filter(Boolean)

  if (!text) return deny("empty-text", 400)
  if (anchors.length === 0) return deny("no-anchor", 400)

  // 🔒 СНИМОК «ДО» СНИМАЕТСЯ ЗДЕСЬ, А НЕ ВСПОМИНАЕТСЯ ПОТОМ. Доказательство
  // «граф вырос» — это РАЗНИЦА, и вторую её половину взять задним числом уже
  // нельзя: к тому времени граф другой.
  const before = (await labels()).length

  // 🔒 ИМЯ ИСТОЧНИКА ПЕЧАТАЕМ МЫ, И У НЕГО СВОЙ ПРЕФИКС. По нему потом находят
  // своё, чтобы забыть именно его: прибор убирает за собой по своей метке, а не
  // по хранилищу. Тот же закон, что у `forgetDocuments()`.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const name = source ? `bench/${source}` : `bench/${anchors[0]}-${stamp}`

  const started = Date.now()
  const result = await learn({
    anchors,
    origin: "стенд графа знаний, страница памяти",
    source: name,
    text,
  })
  const ms = Date.now() - started

  if (!result.accepted) {
    return NextResponse.json({ error: result.refused ?? "refused", ok: false }, { status: 502 })
  }

  return NextResponse.json({
    anchors,
    labelsBefore: before,
    ms,
    ok: true,
    source: name,
    // 🛑 «ПРИНЯТО» И «ПОСТРОЕНО» — РАЗНЫЕ УТВЕРЖДЕНИЯ: связи граф строит в фоне.
    // Поэтому здесь честное «принято», а рост меток экран досматривает сам.
    state: "accepted",
  })
}

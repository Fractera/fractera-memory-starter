// @api стенд ссылок памяти: открыть страницы по адресам ИИ-браузером и увидеть извлечённое — в память ничего не пишется
import { NextResponse } from "next/server"
import { benchGuard } from "@/lib/bench-guard"
import { readLinks } from "@/lib/fractera/web"

// ДВЕРЬ СТЕНДА ССЫЛОК (195-1).
//
// 🪦 ПЕРЕНЕСЕНА С ДВЕРИ `read-test` СЛУЖБЫ ИИ-БРАУЗЕРА (196-3) — закон владельца «скопировать, перенести и адаптировать».
// Адаптаций две: замок — `benchGuard`, как у всех дверей стенда памяти (сессия архитектора или секрет машины, чтобы прибор
// прогонял дверь без браузера); чтение — `readLinks`, один путь памяти к браузеру.
// 🔒 В ПАМЯТЬ НИЧЕГО НЕ ПИШЕТСЯ: запись в четыре хранилища — подшаг 195-2. Эта дверь только показывает, что досталось.
// 🔒 ЭКРАНУ ОТДАЁТСЯ НАЧАЛО HTML И ТЕКСТА, А ДЛИНЫ — ЦЕЛИКОМ: десять страниц по 5 МБ в браузер человека — это зависшая
// вкладка, а не проверка. Полное значение видно в `html_length`/`text_length`.
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

const PREVIEW_CHARS = 20_000

export async function POST(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  let body: { urls?: unknown }
  try {
    body = (await request.json()) as { urls?: unknown }
  } catch {
    return NextResponse.json({ error: "bad-json", ok: false }, { status: 400 })
  }

  const { body: answer, status } = await readLinks(body.urls)
  if (Array.isArray(answer.results)) {
    answer.results = answer.results.map((x) => ({
      ...x,
      html: typeof x.html === "string" ? x.html.slice(0, PREVIEW_CHARS) : x.html,
      text: typeof x.text === "string" ? x.text.slice(0, PREVIEW_CHARS) : x.text,
    }))
  }
  return NextResponse.json(answer, { headers: { "Cache-Control": "no-store" }, status })
}

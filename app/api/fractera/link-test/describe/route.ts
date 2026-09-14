// @api стенд ссылок памяти: открыть ссылку браузером целиком, снять снимок и описать его моделью до сохранения
import { NextResponse } from "next/server"
import { benchGuard } from "@/lib/bench-guard"
import { describe } from "@/lib/describe.mjs"
import { getSavedByUrl } from "@/lib/messages.mjs"
import { pageRefusal, readLinks, snapshotName, snapshotOf } from "@/lib/fractera/web"

// ДВЕРЬ «ПОЛУЧИТЬ ОПИСАНИЕ» СТЕНДА ССЫЛОК (195-2).
//
// 🪦 ФОРМА ДВЕРИ `object-test/describe` (194-2), адаптированная к ссылке: вместо присланного файла — снимок, снятый браузером.
// 🔒 ПОВТОРНАЯ ССЫЛКА ПО УМОЛЧАНИЮ — «НИЧЕГО НЕ ДЕЛАЕМ, ВОЗВРАЩАЕМ ТО, ЧТО УЖЕ ЕСТЬ» (паспорт §20.6 ②). Уже сохранённая ссылка
// отдаёт номер строки без браузера и без модели: ход подписки не тратится на то, что уже лежит.
// 🔒 СТРАНИЦА ЧИТАЕТСЯ ЗАНОВО И ЦЕЛИКОМ: экран стенда держит только начало текста и HTML (20 000 знаков), а снимок и описание
// обязаны видеть всё. Цена названа: страница открывается второй раз.
// 🔒 СТРАНИЦА, КОТОРУЮ САЙТ НЕ ОТДАЛ (код ≥ 400), НЕ ОПИСЫВАЕТСЯ (195-9): отказ `page-refused` с кодом и заголовком — до снимка и до
// хода модели. ✗ Иначе проверка Vercel на ботов легла бы в память под адресом статьи.
// 🔒 ОПИСАНИЕ НИЧЕГО НЕ СОХРАНЯЕТ. Снимок уезжает экрану; человек правит оба поля и только потом нажимает «Сохранить в память».
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

const deny = (error: string, status: number, why?: unknown) =>
  NextResponse.json({ error, ok: false, ...(why ? { why: String(why).slice(0, 300) } : {}) }, { status })

export async function POST(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  let body: { html?: unknown; url?: unknown }
  try {
    body = (await request.json()) as { html?: unknown; url?: unknown }
  } catch {
    return deny("bad-json", 400)
  }
  const url = String(body.url ?? "").trim()
  if (!url) return deny("empty-url", 400)

  const existing = (await getSavedByUrl(url)) as { id?: number } | null
  if (existing?.id) return NextResponse.json({ existing: Number(existing.id), ok: true })

  const read = await readLinks([url])
  const page = Array.isArray(read.body.results) ? read.body.results[0] : undefined
  if (!page) return deny(read.body.error ?? "browser-no-results", read.status >= 400 ? read.status : 502, read.body.why)
  if (page.error) return deny(String(page.error), 422, page.why)
  const refused = pageRefusal(page.status, page.title)
  if (refused) return deny(refused.error, 422, refused.why)

  const snapshot = snapshotOf(page, { html: body.html === true })
  const name = snapshotName(url)
  const r = await describe({ bytes: new TextEncoder().encode(snapshot), kind: "web", mime: "text/markdown", name, url })
  if (!r.ok) return deny(r.refusal, 502, r.why)
  return NextResponse.json({ ...r, name, snapshot, snapshotChars: snapshot.length, url })
}

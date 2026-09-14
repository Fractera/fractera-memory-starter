// @api стенд ссылок памяти: открыть ссылку браузером целиком (а ролик YouTube — официальным API), снять снимок и описать моделью
import { NextResponse } from "next/server"
import { benchGuard } from "@/lib/bench-guard"
import { describe } from "@/lib/describe.mjs"
import { getSavedByUrl } from "@/lib/messages.mjs"
import { pageRefusal, readLinks, snapshotName, snapshotOf } from "@/lib/fractera/web"
import { readVideo, YOUTUBE_REFUSALS } from "@/lib/fractera/youtube"
import { youtubeId } from "@/lib/youtube-chapters.mjs"

// ДВЕРЬ «ПОЛУЧИТЬ ОПИСАНИЕ» СТЕНДА ССЫЛОК (195-2, ролики — 195-4).
//
// 🪦 ФОРМА ДВЕРИ `object-test/describe` (194-2), адаптированная к ссылке: вместо присланного файла — снимок, снятый браузером.
// 🔒 РОЛИК YOUTUBE ИДЁТ ОФИЦИАЛЬНЫМ API, А НЕ БРАУЗЕРОМ (195-4, решение владельца «Подтверждаю»): `videos.list` отвечает за полсекунды, стоит
// 1 единицу из 10 000 в день и НЕ зависит от выборочной проверки YouTube на ботов. Главы из описания дают ответ «на какой минуте про это
// говорили» без всякой расшифровки.
// 🔒 ПОВТОРНАЯ ССЫЛКА ПО УМОЛЧАНИЮ — «НИЧЕГО НЕ ДЕЛАЕМ, ВОЗВРАЩАЕМ ТО, ЧТО УЖЕ ЕСТЬ» (паспорт §20.6 ②). У ролика повтор ищется по
// КАНОНИЧЕСКОМУ адресу: `youtu.be/…`, `/shorts/…` и ссылка с меткой времени — один и тот же ролик.
// 🔒 СТРАНИЦА ЧИТАЕТСЯ ЗАНОВО И ЦЕЛИКОМ: экран стенда держит только начало текста и HTML (20 000 знаков), а снимок и описание обязаны видеть всё.
// 🔒 СТРАНИЦА, КОТОРУЮ САЙТ НЕ ОТДАЛ (код ≥ 400), НЕ ОПИСЫВАЕТСЯ (195-9): отказ `page-refused` — до снимка и до хода модели.
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

const deny = (error: string, status: number, why?: unknown) =>
  NextResponse.json({ error, ok: false, ...(why ? { why: String(why).slice(0, 300) } : {}) }, { status })

/** Какой код HTTP у отказа ролика: вина присланного и вина настроек различаются (400), состояние Google — 502. */
function statusOfVideoRefusal(error: string): number {
  if (error === YOUTUBE_REFUSALS.NOT_FOUND) return 404
  if (error === YOUTUBE_REFUSALS.KEY_MISSING || error === YOUTUBE_REFUSALS.NOT_YOUTUBE) return 400
  if (error === YOUTUBE_REFUSALS.KEY_REJECTED) return 403
  if (error === YOUTUBE_REFUSALS.QUOTA) return 429
  return 502
}

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

  // ── ролик YouTube: официальный API, браузер не зовётся ──────────────────────
  if (youtubeId(url)) {
    const video = await readVideo(url)
    if (!video.ok) return deny(video.error, statusOfVideoRefusal(video.error), video.why)
    const existing = (await getSavedByUrl(video.watchUrl)) as { id?: number } | null
    if (existing?.id) return NextResponse.json({ existing: Number(existing.id), ok: true })
    const name = `youtube-${video.id}.md`
    const r = await describe({ bytes: new TextEncoder().encode(video.snapshot), kind: "web", mime: "text/markdown", name, url: video.watchUrl })
    if (!r.ok) return deny(r.refusal, 502, r.why)
    return NextResponse.json({
      ...r,
      askedSeconds: video.askedSeconds,
      chapterOfAsked: video.chapterOfAsked,
      chapters: video.chapters,
      name,
      snapshot: video.snapshot,
      snapshotChars: video.snapshot.length,
      source: "youtube-api",
      thumbnail: video.thumbnail,
      url: video.watchUrl,
      videoTitle: video.title,
    })
  }

  // ── обычная страница: настоящий браузер ────────────────────────────────────
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
  return NextResponse.json({ ...r, name, snapshot, snapshotChars: snapshot.length, source: "ai-browser", url })
}

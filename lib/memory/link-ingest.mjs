// ССЫЛКИ `remember` — СТРАНИЦЫ И РОЛИКИ YOUTUBE.
//
// NODE STEP 596-5 — NOT ON A NODE YET, SAID, NOT FAKED. On the former server a web page was read by the AI browser
// (`/service/ai-browser`) and a YouTube video by the YouTube Data API through the stand's inner doors; the page then went the way of
// a file. A Fractera node has no AI browser element, and those inner doors did not move. So every link gets its fate named in
// `objects` — «reading links is not built on the node» — and the phrase itself is kept as usual. The checks of the field
// (a video in `links`, a page in `youtube`) stay: they are about what was sent, not about the reader.
import { youtubeId } from "./youtube-chapters.mjs"

/** Отказы рода ссылки — рождаются здесь, до обращения к хранилищам. */
export const LINK_REFUSALS = {
  IS_YOUTUBE: "link-is-youtube",
  NOT_YOUTUBE: "youtube-not-youtube",
  NOT_BUILT: "links-not-built-on-node",
}

/**
 * Положить ссылки одного рода.
 *
 * @param {string[]} urls — принятое проверкой формы `params.mjs`
 * @param {{ who: string, want: "web" | "youtube" }} opts — чей это разговор и какой род ожидает поле
 * @returns {Promise<Array<{ url: string, ok: boolean, kind: "web" | "youtube", error?: string, why?: string }>>}
 */
export async function ingestLinks(urls, { want }) {
  const out = []
  for (const raw of urls) {
    const url = String(raw ?? "").trim()
    const isVideo = youtubeId(url) !== null
    if (want === "web" && isVideo) {
      out.push({ error: LINK_REFUSALS.IS_YOUTUBE, kind: want, ok: false, url, why: "это ролик YouTube — его место в поле youtube" })
      continue
    }
    if (want === "youtube" && !isVideo) {
      out.push({ error: LINK_REFUSALS.NOT_YOUTUBE, kind: want, ok: false, url, why: "это не ролик YouTube — обычной странице место в поле links" })
      continue
    }
    out.push({
      error: LINK_REFUSALS.NOT_BUILT,
      kind: want,
      ok: false,
      url,
      why:
        want === "youtube"
          ? "ролики YouTube память на этом узле пока не разбирает — фраза записана, ссылка в ней сохранена текстом"
          : "страницы память на этом узле пока не читает (на узле нет ИИ-браузера) — фраза записана, ссылка в ней сохранена текстом",
    })
  }
  return out
}

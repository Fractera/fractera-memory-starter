// ССЫЛКИ ВНУТРИ «СКАЗАТЬ»: СТРАНИЦЫ И РОЛИКИ YOUTUBE ТЕМ ЖЕ ПУТЁМ, ЧТО СТЕНД ССЫЛОК (200-5).
//
// 🎯 Слово владельца 2026-09-14: вложения — включения в глаголы; «обычная ссылка YouTube ссылка сделай валидацию если в
// обычную ссылку ставит ссылку от YouTube а в YouTube ставит обычную ссылку чтобы ты не проходила».
//
// 🔒 ВТОРОГО ПУТИ ЗАПИСИ НЕТ. Человек на стенде ссылок делает два хода — «Получить описание» (`link-test/describe`) и
// «Сохранить» (`link-ingest`), — и здесь те же две двери по петле с секретом машины, той же формой полей. Ролик
// читает официальный API YouTube, страницу — ИИ-браузер: это решает дверь описания, а не этот модуль.
// 🔒 РОД АДРЕСА ПРОВЕРЯЕТСЯ ДО ДВЕРЕЙ, И ОТКАЗ ЗВУЧИТ У КАЖДОГО АДРЕСА СВОЙ: ролик в `links` получает `link-is-youtube`,
// не ролик в `youtube` — `youtube-not-youtube`, и в память не ложится ничего; соседние адреса идут своим чередом.
// 🔒 ОБЛОЖКА РОЛИКА И СНИППЕТ СТРАНИЦЫ НЕ КЛАДУТСЯ: на стенде они едут только с согласия человека, а у внешнего
// зовущего шага согласия нет — лишний объект в памяти был бы решением, которого никто не принимал.
// 🔒 ПОВТОРНЫЙ АДРЕС НЕ КЛАДЁТСЯ ЗАНОВО: обе двери отвечают `existing`, и судьба называет прежнюю строку.

import { request } from "node:http"
import { doorJson } from "./loopback.mjs"
import { machineEnv } from "./store.mjs"
import { youtubeId } from "./youtube-chapters.mjs"

const PORT = Number(process.env.PORT ?? 3700)

/** Отказы рода ссылки — рождаются здесь, до обращения к дверям. */
export const LINK_REFUSALS = {
  IS_YOUTUBE: "link-is-youtube",
  NOT_YOUTUBE: "youtube-not-youtube",
}

/**
 * POST формы во внутреннюю дверь по петле.
 * 🔒 `node:http`, А НЕ `fetch`: у `fetch` предел ожидания заголовков 300 с, а сохранение идёт в четыре хранилища.
 * @param {string} path
 * @param {FormData} form
 * @returns {Promise<{ json: any, status: number }>}
 */
async function doorForm(path, form) {
  const secret = process.env.DATA_SECRET || machineEnv("DATA_SECRET")
  if (!secret) return { json: { error: "no-machine-secret", ok: false }, status: 0 }
  // Тело формы собирает сам `Response`: граница частей и длина — его, а не наши.
  const packed = new Response(form)
  const type = packed.headers.get("content-type") ?? "multipart/form-data"
  const bytes = Buffer.from(await packed.arrayBuffer())
  return new Promise((resolve) => {
    const req = request(
      {
        headers: { "content-length": bytes.length, "content-type": type, "x-data-secret": secret },
        host: "127.0.0.1",
        method: "POST",
        path,
        port: PORT,
      },
      (res) => {
        let raw = ""
        res.setEncoding("utf8")
        res.on("data", (d) => { raw += d })
        res.on("end", () => {
          try {
            resolve({ json: JSON.parse(raw), status: res.statusCode ?? 0 })
          } catch {
            resolve({ json: { error: "inside-memory", ok: false }, status: res.statusCode ?? 0 })
          }
        })
      },
    )
    req.on("error", (e) => resolve({ json: { error: "inside-memory", ok: false, why: String(e.message).slice(0, 200) }, status: 0 }))
    req.end(bytes)
  })
}

/**
 * Положить ссылки одного рода.
 *
 * @param {string[]} urls — принятое проверкой формы `params.mjs`
 * @param {{ who: string, want: "web" | "youtube" }} opts — чей это разговор и какой род ожидает поле
 * @returns {Promise<Array<{ url: string, ok: boolean, kind: "web" | "youtube", messageId?: number, id?: string, title?: string, existing?: boolean, error?: string, why?: string }>>}
 */
export async function ingestLinks(urls, { who, want }) {
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

    const { json: d } = await doorJson("/api/fractera/link-test/describe", { url })
    if (d?.ok && d.existing) {
      out.push({ existing: true, kind: want, messageId: Number(d.existing), ok: true, url })
      continue
    }
    if (!d?.ok) {
      out.push({ error: d?.error ?? "inside-memory", kind: want, ok: false, url, ...(d?.why ? { why: String(d.why) } : {}) })
      continue
    }

    // 🔒 ТЕ ЖЕ ПОЛЯ, ЧТО ШЛЁТ СТЕНД ССЫЛОК (`link-bench.client.tsx`, «Сохранить»): саммари — в `about`.
    const form = new FormData()
    form.append("file", new Blob([String(d.snapshot ?? "")], { type: "text/markdown" }), String(d.name ?? "web-page.md"))
    form.append("url", String(d.url ?? url))
    form.append("about", String(d.summary ?? ""))
    form.append("full", String(d.full ?? ""))
    form.append("title", String(d.title ?? ""))
    form.append("tags", JSON.stringify(Array.isArray(d.tags) ? d.tags : []))
    form.append("anchors", JSON.stringify(Array.isArray(d.anchors) ? d.anchors : []))
    form.append("described_by", String(d.described_by ?? ""))
    form.append("describe_ms", String(d.ms ?? 0))
    form.append("language", String(d.language ?? "und"))
    form.append("source", "api")
    form.append("author", who)
    form.append("who", who)

    const { json: k } = await doorForm("/api/fractera/link-ingest", form)
    out.push(
      k?.ok
        ? {
            kind: want,
            messageId: k.existing ? Number(k.existing) : k.messageId,
            ok: true,
            url: String(d.url ?? url),
            ...(k.existing ? { existing: true } : { id: k.object?.id, title: d.title }),
          }
        : { error: k?.error ?? "inside-memory", kind: want, ok: false, url, ...(k?.why ? { why: String(k.why) } : {}) },
    )
  }
  return out
}

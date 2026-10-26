// ВЛОЖЕНИЯ `remember` — ТЕМ ЖЕ ПУТЁМ, ЧТО `keep_object` (194-16).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13 на вопрос «Что делать с полем media у /v1/remember?» — «Через ingest».
// ✗ ЧЕМ ОПЛАЧЕНО: до этого `media` проверялось по форме, отвечало `accepted` со словами «вложения приняты и
// записаны в объектное хранилище» — и не читалось никем. Файл молча выбрасывался с отчётом об успехе.
//
// 🔒 ВТОРОГО ПУТИ ЗАПИСИ НЕТ: каждый адрес и каждый длинный текст идут в один приём вещи (`fractera/object-ingest.ts`) — там
// скачивание с защитой от петли и частной сети, описание моделью и четыре хранилища. NODE STEP 596-5: on the former server that
// reception was an inner door reached over the loopback; inside one Next server it is a function call.
// 🔒 СУДЬБА КАЖДОГО ВЛОЖЕНИЯ НАЗЫВАЕТСЯ: не лёгшее вложение не роняет фразу и не прячется — оно стоит в `objects`
// с причиной. Вложения идут по одному: описание моделью тяжёлое, и параллельные ходы делили бы одну подписку.

import { ingestBytes, ingestUrl } from "./fractera/object-ingest"

/**
 * Положить ДЛИННЫЙ ТЕКСТ объектом — тот же путь, что у присланного файла (206-2).
 *
 * 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-15: «max 2000 words for vector and for lightRAG , if more only for
 * object store». Значит длинная фраза не режется на куски и не размазывается по вектору: она
 * остаётся ЦЕЛОЙ вещью с идентификатором, описанием и карточкой поиска.
 */
export async function keepLongText({ text, who, via, at = new Date() }) {
  const body = String(text ?? "")
  const stamp = at.toISOString().replace(/[:.]/g, "-")
  const name = `${who}-${stamp}.txt`
  const { json } = await ingestBytes(new Uint8Array(Buffer.from(body, "utf8")), "text/plain", name, {
    author: who,
    name,
    source: via ? `сказано в ${via}` : "сказано памяти",
    title: `Сказанное ${at.toISOString().slice(0, 10)}`,
    who,
  })
  return json?.ok
    ? { id: json.object?.id, messageId: json.messageId, ok: true }
    : { ok: false, refused: json?.error ?? "inside-memory", why: json?.why }
}

/**
 * Принять вложения фразы.
 * @param {Array<{url?: string}>} media — принятое проверкой формы `params.mjs`
 * @param {{ who: string, author?: string, source?: string }} from
 * @returns {Promise<Array<{url: string, ok: boolean, id?: string, messageId?: number, title?: string, kind?: string, error?: string, why?: string}>>}
 */
export async function ingestMedia(media, from) {
  const out = []
  for (const m of media) {
    const url = typeof m?.url === "string" ? m.url.trim() : ""
    if (!url) {
      out.push({ error: "no-url", ok: false, url: "", why: "вложение без адреса: память скачивает файлы только по url" })
      continue
    }
    const { json } = await ingestUrl(url, { author: from.author ?? from.who, source: from.source ?? "api", who: from.who })
    out.push(
      json.ok
        ? { id: json.object?.id, kind: json.kind, messageId: json.messageId, ok: true, summary: json.summary, title: json.title, url }
        : { error: json.error ?? "inside-memory", ok: false, url, ...(json.why ? { why: json.why } : {}) },
    )
  }
  return out
}

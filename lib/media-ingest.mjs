// ВЛОЖЕНИЯ `remember` — ТЕМ ЖЕ ПУТЁМ, ЧТО `keep_object` (194-16).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13 на вопрос «Что делать с полем media у /v1/remember?» — «Через ingest».
// ✗ ЧЕМ ОПЛАЧЕНО: до этого `media` проверялось по форме, отвечало `accepted` со словами «вложения приняты и
// записаны в объектное хранилище» — и не читалось никем. Файл молча выбрасывался с отчётом об успехе.
//
// 🔒 ВТОРОГО ПУТИ ЗАПИСИ НЕТ: каждый адрес уходит по петле (`loopback.mjs`) в ту же дверь `object-ingest`, в которую
// договор проводит `keep_object`. Там же скачивание с защитой от петли и частной сети, описание моделью и четыре
// хранилища.
// 🔒 СУДЬБА КАЖДОГО ВЛОЖЕНИЯ НАЗЫВАЕТСЯ: не лёгшее вложение не роняет фразу и не прячется — оно стоит в `objects`
// с причиной. Вложения идут по одному: описание моделью тяжёлое, и параллельные ходы делили бы одну подписку.

import { doorForm, doorJson } from "./loopback.mjs"

/**
 * Положить ДЛИННЫЙ ТЕКСТ объектом — тот же путь, что у присланного файла (206-2).
 *
 * 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-15: «max 2000 words for vector and for lightRAG , if more only for
 * object store». Значит длинная фраза не режется на куски и не размазывается по вектору: она
 * остаётся ЦЕЛОЙ вещью с идентификатором, описанием и карточкой поиска.
 * 🔒 ПУТЬ ОДИН И ТОТ ЖЕ: дверь `object-ingest`, четыре хранилища или ничего. Своё сохранение текста
 * рядом было бы вторым писателем объектов.
 */
export async function keepLongText({ text, who, via, at = new Date() }) {
  const body = String(text ?? "")
  const stamp = at.toISOString().replace(/[:.]/g, "-")
  const { json } = await doorForm("/api/fractera/object-ingest", {
    fields: {
      author: who,
      name: `${who}-${stamp}.txt`,
      source: via ? `сказано в ${via}` : "сказано памяти",
      title: `Сказанное ${at.toISOString().slice(0, 10)}`,
      who,
    },
    file: { bytes: Buffer.from(body, "utf8"), name: `${who}-${stamp}.txt`, type: "text/plain" },
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
    const { json } = await doorJson("/api/fractera/object-ingest", {
      author: from.author ?? from.who,
      source: from.source ?? "api",
      url,
      who: from.who,
    })
    out.push(
      json.ok
        ? { id: json.object?.id, kind: json.kind, messageId: json.messageId, ok: true, title: json.title, url }
        : { error: json.error ?? "inside-memory", ok: false, url, ...(json.why ? { why: json.why } : {}) },
    )
  }
  return out
}

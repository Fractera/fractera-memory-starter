// ВЛОЖЕНИЯ `remember` — ТЕМ ЖЕ ПУТЁМ, ЧТО `keep_object` (194-16).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13 на вопрос «Что делать с полем media у /v1/remember?» — «Через ingest».
// ✗ ЧЕМ ОПЛАЧЕНО: до этого `media` проверялось по форме, отвечало `accepted` со словами «вложения приняты и
// записаны в объектное хранилище» — и не читалось никем. Файл молча выбрасывался с отчётом об успехе.
//
// 🔒 ВТОРОГО ПУТИ ЗАПИСИ НЕТ: каждый адрес уходит по петле в ту же дверь `object-ingest`, в которую договор проводит
// `keep_object`. Там же скачивание с защитой от петли и частной сети, описание моделью и четыре хранилища.
// Этот модуль — на `.mjs` при `server.mjs`, логика объектов — на `.ts` под Next, и мост между ними один: петля
// с секретом машины. Тот же путь у рук агента.
// 🔒 СУДЬБА КАЖДОГО ВЛОЖЕНИЯ НАЗЫВАЕТСЯ: не лёгшее вложение не роняет фразу и не прячется — оно стоит в `objects`
// с причиной. Вложения идут по одному: описание моделью тяжёлое, и параллельные ходы делили бы одну подписку.

import { request } from "node:http"
import { machineEnv } from "./store.mjs"

const PORT = Number(process.env.PORT ?? 3700)

function postJson(path, body, secret) {
  return new Promise((resolve) => {
    const text = JSON.stringify(body)
    const req = request(
      {
        headers: {
          "content-length": Buffer.byteLength(text),
          "content-type": "application/json",
          "x-data-secret": secret,
        },
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
    req.end(text)
  })
}

/**
 * Принять вложения фразы.
 * @param {Array<{url?: string, id?: string}>} media — принятое проверкой формы `params.mjs`
 * @param {{ who: string, author?: string, source?: string }} from
 * @returns {Promise<Array<{url: string, ok: boolean, id?: string, messageId?: number, title?: string, kind?: string, error?: string, why?: string}>>}
 */
export async function ingestMedia(media, from) {
  const secret = process.env.DATA_SECRET || machineEnv("DATA_SECRET")
  const out = []
  for (const m of media) {
    const url = typeof m?.url === "string" ? m.url.trim() : ""
    if (!url) {
      out.push({ error: "no-url", ok: false, url: "", why: "вложение без адреса: память скачивает файлы только по url" })
      continue
    }
    if (!secret) {
      out.push({ error: "no-machine-secret", ok: false, url })
      continue
    }
    const { json } = await postJson(
      "/api/fractera/object-ingest",
      { author: from.author ?? from.who, source: from.source ?? "api", url, who: from.who },
      secret,
    )
    out.push(
      json.ok
        ? { id: json.object?.id, kind: json.kind, messageId: json.messageId, ok: true, title: json.title, url }
        : { error: json.error ?? "inside-memory", ok: false, url, ...(json.why ? { why: json.why } : {}) },
    )
  }
  return out
}

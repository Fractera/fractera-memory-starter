// МОСТ ДОГОВОРА В ДВЕРИ ПАМЯТИ ПО ПЕТЛЕ (194-17).
//
// 🔒 ОДИН МОСТ НА ВСЕХ, КТО ЖИВЁТ ПРИ `server.mjs`: вложения `remember`, `find_objects`, `open_object`. Логика
// объектов — на `.ts` под Next, эти модули — на `.mjs`, и связь между ними одна: запрос на `127.0.0.1` с секретом
// машины. Второй способ дотянуться до объектов разошёлся бы с дверями стенда молча.
// 🔒 ОТВЕТ ДВЕРИ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ HTTP: отказ живёт в `{ok:false, error}`, и зовущему он нужен словами.

import { request } from "node:http"
import { machineEnv } from "./store.mjs"

const PORT = Number(process.env.PORT ?? 3700)

/**
 * POST JSON во внутреннюю дверь.
 * @param {string} path — путь двери, например `/api/fractera/object-search`
 * @param {Record<string, unknown>} body
 * @returns {Promise<{ json: any, status: number }>}
 */
export function doorJson(path, body) {
  const secret = process.env.DATA_SECRET || machineEnv("DATA_SECRET")
  if (!secret) return Promise.resolve({ json: { error: "no-machine-secret", ok: false }, status: 0 })
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
 * POST формы с файлом во внутреннюю дверь (206-2).
 *
 * 🔒 ТОТ ЖЕ МОСТ, ЧТО У JSON, И ТА ЖЕ ДВЕРЬ: длинный текст кладётся объектом ровно тем же путём, что
 * присланный человеком файл. Второй способ положить объект разошёлся бы с первым на первой правке.
 *
 * @param {string} path
 * @param {{ file: { bytes: Buffer|Uint8Array, name: string, type: string }, fields?: Record<string, string> }} input
 */
export async function doorForm(path, input) {
  const secret = process.env.DATA_SECRET || machineEnv("DATA_SECRET")
  if (!secret) return { json: { error: "no-machine-secret", ok: false }, status: 0 }
  const form = new FormData()
  for (const [k, v] of Object.entries(input.fields ?? {})) {
    if (v !== undefined && v !== null && v !== "") form.append(k, String(v))
  }
  form.append(
    "file",
    new Blob([input.file.bytes], { type: input.file.type || "application/octet-stream" }),
    input.file.name,
  )
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}${path}`, {
      body: form,
      headers: { "x-data-secret": secret },
      method: "POST",
    })
    const json = await res.json().catch(() => ({ error: "inside-memory", ok: false }))
    return { json, status: res.status }
  } catch (e) {
    return { json: { error: "inside-memory", ok: false, why: String(e?.message ?? e).slice(0, 200) }, status: 0 }
  }
}

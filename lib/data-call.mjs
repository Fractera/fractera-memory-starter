// ОДИН ВЫЗОВ СЛОЯ ДАННЫХ — ОДИН АДРЕС, ОДИН СЕКРЕТ, ОДНА ПРОВЕРКА ОТВЕТА.
//
// 🔒 ОБЩЕЕ, А НЕ КОПИЯ В КАЖДОМ МОДУЛЕ. Два собственных `fetch` разошлись бы на первой правке адреса
// или замка — и разошлись бы МОЛЧА: неверно позвавший модуль печатает не отказ, а провал проверки,
// и виноватой выглядит способность.
//
// 🔒 ОТВЕТ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ HTTP: слой данных отвечает `200` с `{ok:false}` на
// отвергнутый запрос — правка «прошла бы» молча (закон 161).

import { machineEnv } from "./store.mjs"

export const DATA_URL = process.env.REMOTE_DATA_URL || machineEnv("REMOTE_DATA_URL") || "http://localhost:3300"
const DATA_SECRET = process.env.DATA_SECRET || machineEnv("DATA_SECRET") || ""

export async function dataCall(path, body, method = "POST") {
  if (!DATA_SECRET) return { ok: false, error: "no-data-secret" }
  let res
  try {
    res = await fetch(`${DATA_URL}${path}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { "Content-Type": "application/json", "X-Data-Secret": DATA_SECRET },
      method,
    })
  } catch (e) {
    return { ok: false, error: "data-unreachable", why: String(e.message) }
  }
  const parsed = await res.json().catch(() => null)
  if (!res.ok || !parsed || parsed.ok === false) {
    return { ok: false, error: `data-${res.status}`, why: String(parsed?.error ?? parsed?.message ?? "").slice(0, 200) }
  }
  return { ok: true, body: parsed }
}

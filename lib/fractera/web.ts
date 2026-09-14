import { dataService } from "@/lib/fractera/data-service"

// ЧТЕНИЕ ССЫЛОК ЧЕРЕЗ ИИ-БРАУЗЕР (195-1, путь — 195-7).
//
// 🔒 ПАМЯТЬ НЕ ОТКРЫВАЕТ СТРАНИЦЫ САМА: она зовёт договор службы ИИ-браузера `/v1/read` — тот же, что у чужих программ. Второй
// путь чтения проверял бы себя, а не браузер, и обходил бы его запрет адресов машины (три слоя, шаг 196).
// 🔒 ПУТЬ — «ОДНА ДВЕРЬ» СЛОЯ ДАННЫХ `/service/ai-browser/*`, А НЕ ПОРТ БРАУЗЕРА (решение владельца 2026-09-14: «Маршрут слоя
// данных»; его слова: «любые другие микро сервисы могут обращаться к нему только через API»). Порта браузера в памяти нет:
// где живёт браузер, знает слой данных, как он знает граф и карту. У памяти один адрес и один ключ — те же, что для данных.
// 🔒 ОТКАЗЫ РАЗЛИЧАЮТСЯ ПО ТОМУ, КТО МОЛЧИТ: слой данных не ответил — `data-unreachable`; слой ответил, что браузер за ним
// молчит (`503 … did not answer`), — `browser-unreachable`. Страница не открылась — это `error` внутри `results`, у браузера.

export type LinkReadBody = {
  ok?: boolean
  error?: string
  why?: string
  limit?: number
  failed?: number
  results?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export const AI_BROWSER_ROUTE = "/service/ai-browser"

export async function readLinks(urls: unknown, base: string = dataService().url): Promise<{ status: number; body: LinkReadBody }> {
  const { key } = dataService()
  if (!key) return { body: { error: "no-machine-secret", ok: false }, status: 500 }

  let r: Response
  try {
    r = await fetch(`${base}${AI_BROWSER_ROUTE}/v1/read`, {
      body: JSON.stringify({ urls }),
      cache: "no-store",
      headers: { "content-type": "application/json", "x-data-secret": key },
      method: "POST",
    })
  } catch (e) {
    return { body: { error: "data-unreachable", ok: false, why: String((e as Error).message).slice(0, 200) }, status: 502 }
  }

  // 🔒 ОТВЕТ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ: отказ договора приходит телом с `error`, и экран обязан его назвать.
  const body = (await r.json().catch(() => ({ error: "bad-answer", ok: false }))) as LinkReadBody
  if (r.status === 503 && typeof body.error === "string" && body.error.includes("did not answer")) {
    return { body: { error: "browser-unreachable", ok: false, why: body.error.slice(0, 200) }, status: 502 }
  }
  return { body, status: r.status }
}

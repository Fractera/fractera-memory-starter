import { machineEnv } from "@/lib/fractera/machine-env"

// ЧТЕНИЕ ССЫЛОК ЧЕРЕЗ ИИ-БРАУЗЕР (195-1).
//
// 🔒 ПАМЯТЬ НЕ ОТКРЫВАЕТ СТРАНИЦЫ САМА: она зовёт договор службы ИИ-браузера `/v1/read` по петле — тот же, что у чужих
// программ. Второй путь чтения проверял бы себя, а не браузер, и обходил бы его запрет адресов машины (три слоя, шаг 196).
// 🔒 СЕКРЕТ МАШИНЫ, А НЕ КЛЮЧ СЛУЖБЫ `fab_…`: ключ выдаётся ЧУЖИМ инструментам, свои процессы ходят секретом (закон 185).
// Читается тем же порядком, что у слоя данных: своё окружение сильнее файла машины.
// 🔒 АДРЕС ПЕРЕОПРЕДЕЛЯЕТСЯ `AI_BROWSER_URL` ИЛИ ПАРАМЕТРОМ — чтобы отказ «браузер недоступен» проверялся прибором на пустом
// порту, не останавливая живую службу.
// 🔒 НЕДОСТУПНЫЙ БРАУЗЕР — НАЗВАННЫЙ ОТКАЗ `browser-unreachable`, А НЕ ПАДЕНИЕ: экран обязан отличать «браузер не ответил»
// от «страница не открылась» (у той свой `error` внутри `results`).

export type LinkReadBody = {
  ok?: boolean
  error?: string
  why?: string
  limit?: number
  failed?: number
  results?: Array<Record<string, unknown>>
  [key: string]: unknown
}

const DEFAULT_BASE = "http://127.0.0.1:3800"

export function aiBrowserBase(): string {
  return process.env.AI_BROWSER_URL || DEFAULT_BASE
}

export async function readLinks(urls: unknown, base: string = aiBrowserBase()): Promise<{ status: number; body: LinkReadBody }> {
  const secret = process.env.DATA_SECRET || machineEnv("DATA_SECRET") || ""
  if (!secret) return { body: { error: "no-machine-secret", ok: false }, status: 500 }

  try {
    const r = await fetch(`${base}/v1/read`, {
      body: JSON.stringify({ urls }),
      cache: "no-store",
      headers: { "content-type": "application/json", "x-data-secret": secret },
      method: "POST",
    })
    // 🔒 ОТВЕТ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ: отказ договора приходит телом с `error`, и экран обязан его назвать.
    const body = (await r.json()) as LinkReadBody
    return { body, status: r.status }
  } catch (e) {
    return {
      body: { error: "browser-unreachable", ok: false, why: String((e as Error).message).slice(0, 200) },
      status: 502,
    }
  }
}

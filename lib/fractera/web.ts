import { dataService } from "@/lib/fractera/data-service"

// ЧТЕНИЕ ССЫЛОК ЧЕРЕЗ ИИ-БРАУЗЕР (195-1, путь — 195-7) И СНИМОК ИЗВЛЕЧЁННОГО (195-2).
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

type Listed = { items?: unknown[]; total?: number }

/** Списки ответа браузера в порядке снимка — подписи по-русски, как всё, что читает модель описания. */
const LISTS: ReadonlyArray<readonly [string, string]> = [
  ["headings", "Заголовки"],
  ["links", "Ссылки"],
  ["buttons", "Кнопки"],
  ["forms", "Формы"],
  ["fields", "Поля"],
  ["images", "Картинки"],
  ["videos", "Видео"],
  ["audios", "Звук"],
  ["iframes", "Фреймы"],
  ["blocked", "Отвергнуто браузером (адреса машины)"],
]

/**
 * Снимок извлечённого — Markdown-файл, который ложится в объектное хранилище как объект (195-2).
 *
 * 🔒 ОБЪЁМ ПО УМОЛЧАНИЮ — ТЕКСТ, СТРУКТУРА И МЕДИА ПО АТРИБУТАМ; ИТОГОВЫЙ HTML — ТОЛЬКО ПО ПРОСЬБЕ. Решение владельца (паспорт
 * §20.6 ③): «по умолчанию первый вариант в случае если пользователь настаивает на детальном сохранении… нужно сохранить вторую версию».
 * 🔒 MARKDOWN, А НЕ JSON: модель читает его как документ, карточка поиска берёт его начало (заголовок, адрес, текст), просмотрщик
 * объекта показывает его без своей вёрстки.
 */
export function snapshotOf(page: Record<string, unknown>, opts: { html?: boolean } = {}): string {
  const s = (v: unknown) => (v == null || v === "" ? "—" : String(v))
  const lines: string[] = [
    `# ${s(page.title)}`,
    "",
    `- Адрес: ${s(page.url)}`,
    `- Итоговый адрес: ${s(page.final_url)}`,
    `- Код ответа: ${s(page.status)}`,
    `- Язык: ${s(page.lang)}`,
    `- Канонический адрес: ${s(page.canonical)}`,
    `- Страница дождалась load: ${page.load_reached === false ? "нет — снято то, что успело отрисоваться" : "да"}`,
    `- Снимок снят: ${new Date().toISOString()}`,
    `- Объём снимка: ${opts.html ? "полный — с итоговым HTML" : "стандартный — текст, структура, медиа по атрибутам"}`,
  ]
  if (page.meta && typeof page.meta === "object") {
    lines.push("", "## Мета", "", "```json", JSON.stringify(page.meta, null, 2), "```")
  }
  lines.push("", "## Весь видимый текст", "", s(page.text))
  if (page.text_truncated) lines.push("", `(текст обрезан службой браузера: всего ${s(page.text_length)} знаков)`)
  for (const [key, label] of LISTS) {
    const l = page[key] as Listed | undefined
    if (!l) continue
    lines.push("", `## ${label} — ${l.total ?? 0}`)
    if (l.items?.length) lines.push("", "```json", JSON.stringify(l.items, null, 2), "```")
    if ((l.total ?? 0) > (l.items?.length ?? 0)) lines.push("", `(в снимке ${l.items?.length ?? 0} из ${l.total})`)
  }
  if (opts.html && typeof page.html === "string") {
    lines.push("", `## Итоговый HTML — ${s(page.html_length)} знаков`, "", "````html", page.html, "````")
    if (page.html_truncated) lines.push("", "(HTML обрезан службой браузера)")
  }
  return `${lines.join("\n")}\n`
}

/**
 * Страница, которую сайт не отдал (195-9): код ответа 400 и выше — не страница, а отказ сайта.
 *
 * 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-14: «да, делай защиту от 403». ✗ Найдено на его экране: neon.com с адреса сервера отдал «Vercel Security
 * Checkpoint» (403), и описание легло бы в память под адресом статьи — а повтор ссылки потом возвращал бы эту заглушку как сохранённое.
 * 🔒 ОДНО ПРАВИЛО НА ОБЕ ДВЕРИ И НА ЭКРАН: описание, сохранение и карточка спрашивают его, а не сравнивают код каждый по-своему.
 * 🛑 ПРОВЕРКУ НА БОТОВ С КОДОМ 200 ЭТО НЕ ЛОВИТ (страница «Just a moment…» бывает и такой) — названо в ТЗ 195-9.
 */
export function pageRefusal(status: unknown, title: unknown): { error: "page-refused"; why: string } | null {
  const code = Number(status)
  if (!Number.isFinite(code) || code < 400) return null
  const name = typeof title === "string" && title.trim() ? ` · ${title.trim().slice(0, 120)}` : ""
  return { error: "page-refused", why: `${code}${name}` }
}

/** Код ответа из снимка — строка `- Код ответа: NNN`, которую печатает `snapshotOf`. Нет строки — `null`. */
export function statusOfSnapshot(snapshot: string): number | null {
  const m = /^- Код ответа: (\d{3})$/m.exec(snapshot)
  return m ? Number(m[1]) : null
}

/** Имя файла снимка: `web-<хост-и-путь>.md` — латиница, цифры и дефисы, до 80 знаков. */
export function snapshotName(url: string): string {
  let slug = ""
  try {
    const u = new URL(url)
    slug = `${u.hostname}${u.pathname}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)
  } catch {
    // не адрес — имя по умолчанию
  }
  return `web-${slug || "page"}.md`
}

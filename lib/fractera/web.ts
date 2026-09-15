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
 * 🔒 ПО УМОЛЧАНИЮ — ОПИСАНИЕ И СТРУКТУРА, БЕЗ ВСЕГО ТЕКСТА СТРАНИЦЫ (195-13). Решение владельца 2026-09-14, дословно: «из требования по работе
 * с ссылками убираем необходимость извлекать и сохранять и темы полностью… только описание и структуру».
 * ✗ ОПЛАЧЕНО ЕГО ЖЕ ЭКРАНОМ (запись 35): в снимок уходил весь текст, и полное описание ролика вышло пересказом спонсоров и ссылок. **Что
 * положено в снимок, то и станет описанием** — объём снимка есть решение о том, что память будет знать.
 * 🛑 ИТОГОВЫЙ HTML В ПАМЯТЬ НЕ ПОПАДАЕТ НИКОГДА — НИ ПО УМОЛЧАНИЮ, НИ ПО ОТМЕТКЕ. Слово владельца 2026-09-14, дословно: «Я тебе дал задание не
 * тащить итоговый HTML, вот забивает много памяти и совершенно не нужен ты проигнорировал это задание его нужно убрать и из YouTube и из
 * обычного ссылки». 🪦 Этим отменяется «детальный объём» паспорта §3 ③ в части HTML: страница весом 268 КБ занимала в складе столько же,
 * сколько сотня описаний, и ни один вопрос к памяти по ней не отвечается.
 * ✗ Моя ошибка: на первое его указание я спрятал HTML за отметку вместо того, чтобы убрать. Отметка оставляет способность живой — а он просил
 * её убрать.
 * 🔒 ОТМЕТКА ОСТАЛАСЬ ТОЛЬКО ДЛЯ ВИДИМОГО ТЕКСТА (`whole`): текст читается человеком и моделью, HTML — нет.
 * 🔒 MARKDOWN, А НЕ JSON: модель читает его как документ, карточка поиска берёт его начало, просмотрщик показывает без своей вёрстки.
 */
export function snapshotOf(page: Record<string, unknown>, opts: { whole?: boolean } = {}): string {
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
    `- Объём снимка: ${opts.whole ? "описание, структура и весь видимый текст" : "описание и структура; весь текст страницы не сохраняется"}`,
    `- Длина текста на странице: ${s(page.text_length)} знаков${opts.whole ? "" : " (в снимок не входит)"}`,
    `- Итоговый HTML: ${s(page.html_length)} знаков — в память не сохраняется никогда (решение владельца)`,
  ]
  const thumb = pageThumbnail(page)
  if (thumb) lines.push(`- Сниппет страницы: ${thumb}`)
  if (page.meta && typeof page.meta === "object") {
    lines.push("", "## Мета", "", "```json", JSON.stringify(page.meta, null, 2), "```")
  }
  if (opts.whole) {
    lines.push("", "## Весь видимый текст", "", s(page.text))
    if (page.text_truncated) lines.push("", `(текст обрезан службой браузера: всего ${s(page.text_length)} знаков)`)
  }
  for (const [key, label] of LISTS) {
    const l = page[key] as Listed | undefined
    if (!l) continue
    lines.push("", `## ${label} — ${l.total ?? 0}`)
    if (l.items?.length) lines.push("", "```json", JSON.stringify(l.items, null, 2), "```")
    if ((l.total ?? 0) > (l.items?.length ?? 0)) lines.push("", `(в снимке ${l.items?.length ?? 0} из ${l.total})`)
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

/**
 * Сниппет страницы — её собственная картинка предпросмотра (195-13).
 *
 * 🎯 СЛОВО ВЛАДЕЛЬЦА: «сниппет любого сайта или YouTube видео если он существует нужно показать» картинкой. У ролика её называет API, у обычной
 * страницы — её же мета: `og:image`, затем `twitter:image`.
 * 🔒 БЕРЁТСЯ ИЗ МЕТА СТРАНИЦЫ, А НЕ УГАДЫВАЕТСЯ ПО ШАБЛОНУ. Существование адреса проверяет тот, кто будет его скачивать (закон 195-4: адрес,
 * названный чужой стороной, проверяется фактом) — здесь мы только называем его.
 */
export function pageThumbnail(page: Record<string, unknown>): string | null {
  const meta = (page.meta ?? {}) as Record<string, unknown>
  for (const name of ["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"]) {
    const v = meta[name]
    if (typeof v === "string" && /^https?:\/\//i.test(v.trim())) return v.trim()
  }
  return null
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

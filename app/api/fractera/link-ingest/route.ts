// @api стенд ссылок памяти: сохранить описанную ссылку в четыре хранилища тем же приёмом, что объект
import { NextResponse } from "next/server"
import { benchGuard } from "@/lib/bench-guard"
import { getSavedByUrl, linkMessages } from "@/lib/messages.mjs"
import { keep } from "@/lib/fractera/objects"
import { fetchUrl } from "@/lib/fractera/fetch-url"
import { pageRefusal, statusOfSnapshot } from "@/lib/fractera/web"

// ДВЕРЬ «СОХРАНИТЬ В ПАМЯТЬ» СТЕНДА ССЫЛОК (195-2).
//
// 🔒 ТОТ ЖЕ `keep()`, ЧТО У ОБЪЕКТА, И ТА ЖЕ РАСКЛАДКА. Слово владельца: «абсолютно одинаковое решение что для объекта что для
// ссылки. Делай как мы уже сделали раньше с объектом хранилищем». Снимок с полным описанием → объектное хранилище; карточка из
// саммари и начала снимка → вектор; полное описание с адресом и происхождением → граф; саммари, род `web` и адрес → строка таблицы.
// 🪦 ФОРМА ДВЕРИ `object-test` POST (194-4): поля формы, автор из замка. Отличия: род `web`, адрес обязателен, повтор проверяется.
// 🔒 ПОВТОР ПРОВЕРЯЕТСЯ И ЗДЕСЬ, А НЕ ТОЛЬКО ПРИ ОПИСАНИИ: между «Получить описание» и «Сохранить» ту же ссылку мог сохранить
// кто-то другой. По умолчанию — «ничего не делаем, возвращаем то, что уже есть» (паспорт §3 ②).
// 🔒 СНИМОК СТРАНИЦЫ, КОТОРУЮ САЙТ НЕ ОТДАЛ, НЕ СОХРАНЯЕТСЯ (195-9): код читается из самого снимка — ворота стоят и здесь, иначе
// прямой вызов двери положил бы заглушку в память мимо двери описания.
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

const deny = (error: string, status: number, why?: string) =>
  NextResponse.json({ error, ok: false, ...(why ? { why } : {}) }, { status })

export async function POST(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return deny("bad-form", 400)
  }

  const file = form.get("file")
  if (!(file instanceof Blob)) return deny("empty-file", 400)
  const text = (k: string) => {
    const v = form.get(k)
    return typeof v === "string" && v.trim() ? v.trim() : undefined
  }
  const list = (k: string): string[] | undefined => {
    const v = form.get(k)
    if (typeof v !== "string") return undefined
    try {
      const parsed: unknown = JSON.parse(v)
      return Array.isArray(parsed) ? parsed.map(String) : undefined
    } catch {
      return undefined
    }
  }

  const url = text("url")
  if (!url) return deny("empty-url", 400)

  const bytes = new Uint8Array(await file.arrayBuffer())
  // 🔒 У СНИМКА РОЛИКА СТРОКИ «Код ответа» НЕТ ВОВСЕ, И ЭТО ЗАКОННО: его снял официальный API, а не браузер. Ворота кода пропускают такой
  // снимок (`null` — не отказ), и проверяют только снимки страниц (195-9).
  const refused = pageRefusal(statusOfSnapshot(new TextDecoder("utf-8").decode(bytes)), null)
  if (refused) return deny(refused.error, 422, refused.why)

  const existing = (await getSavedByUrl(url)) as { id?: number } | null
  if (existing?.id) return NextResponse.json({ existing: Number(existing.id), ok: true })

  const name = String(form.get("name") ?? (file as File).name ?? "").trim()
  const ms = Number(text("describe_ms"))
  const author = text("author") ?? ("email" in gate.who && gate.who.email ? gate.who.email : "прибор (секрет машины)")
  const r = await keep({
    about: String(form.get("about") ?? "").trim(),
    anchors: list("anchors"),
    author,
    bytes,
    described_by: text("described_by"),
    describe_ms: Number.isFinite(ms) ? ms : undefined,
    full: text("full"),
    kind: "web",
    language: text("language"),
    mime: "text/markdown",
    name,
    source: text("source") ?? "stand",
    tags: list("tags"),
    title: text("title"),
    url,
    who: text("who"),
  })
  if (!r.ok) {
    const ours = r.error === "no-name" || r.error === "empty-file" || r.error === "no-about" || r.error.includes("no-anchor")
    return NextResponse.json({ error: r.error, messageId: r.messageId ?? null, ok: false }, { status: ours ? 400 : 502 })
  }
  // 🔒 ОБЛОЖКА РОЛИКА — ОТДЕЛЬНЫЙ ОБЪЕКТ, СВЯЗАННЫЙ С ЗАПИСЬЮ РОЛИКА (195-4, слово владельца: «сохранить его как связанное изображение»).
  // Адрес обложки называет сам API (`snippet.thumbnails`), а не шаблон `maxresdefault.jpg`: большие размеры есть не у всех роликов.
  // 🛑 НЕУДАЧА ОБЛОЖКИ НЕ ОТМЕНЯЕТ РОЛИК: ролик уже лежит во всех четырёх хранилищах, и откатывать его из-за картинки значило бы терять
  // главное ради второстепенного. Причина называется полем `thumbnail` ответа, а не молчанием.
  const thumbUrl = text("thumbnail")
  let thumbnail: { error?: string; messageId?: number; why?: string } | null = null
  if (thumbUrl) {
    const got = await fetchUrl(thumbUrl)
    if (!got.ok) {
      thumbnail = { error: got.error, why: got.why }
    } else {
      const kept = await keep({
        about: `Обложка ролика «${text("title") ?? name}» на YouTube. Источник: ${thumbUrl}`,
        anchors: list("anchors"),
        author,
        bytes: got.bytes,
        kind: "image",
        mime: got.mime,
        name: got.name,
        source: text("source") ?? "stand",
        title: `Обложка: ${text("title") ?? name}`,
        url: thumbUrl,
        who: text("who"),
      })
      if (!kept.ok) thumbnail = { error: kept.error }
      else {
        const linked = await linkMessages(kept.messageId, r.messageId)
        thumbnail = linked.ok ? { messageId: kept.messageId } : { error: `link-failed: ${linked.error}`, messageId: kept.messageId }
      }
    }
  }

  return NextResponse.json({ cardChars: r.cardChars, messageId: r.messageId, ms: r.ms, object: r.card, ok: true, thumbnail })
}

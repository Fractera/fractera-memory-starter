// @api стенд объектного хранилища: положить файл целиком и увидеть, что легло
import { NextResponse } from "next/server"
import { forget, keep, messageView, objectView, status } from "@/lib/fractera/objects"
import { benchGuard } from "@/lib/bench-guard"

// ДВЕРЬ СТЕНДА ОБЪЕКТНОГО ХРАНИЛИЩА (192-1).
//
// 🔒 ТА ЖЕ ФОРМА, ЧТО У ГРАФА И ВЕКТОРА: `GET` — что лежит, `POST` — положить,
// `DELETE` — забыть своё. Замок тот же — `benchGuard`: сессия архитектора или
// секрет машины; ключ памяти сюда не подходит, наружу открыт только договор.
//
// 🔒 ЭТОЙ ЖЕ ДВЕРЬЮ КЛАДЁТ ОБЪЕКТ И АГЕНТ ПАМЯТИ (`keep_object`, 192-4). У
// человека на стенде и у агента обязан быть ОДИН путь, иначе стенд проверяет не
// то, чем работает агент (закон §11).
//
// 🛑 ЧЕМ ЭТА ЗАГРУЗКА ОТЛИЧАЕТСЯ ОТ СОСЕДНИХ: текст не режется на куски и модель
// его не читает. Вещь ложится целиком, а искать её будут по карточке — имени,
// описанию и началу содержимого.
//
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

const deny = (error: string, status: number) =>
  NextResponse.json({ error, ok: false }, { status })

// 🪦 ПРЕДЕЛ 20 МБ СНЯТ 2026-09-13 СЛОВОМ ВЛАДЕЛЬЦА («не должно быть никакого лимита по килобайтам»).
// 🛑 Физические пределы названы: nginx и слой данных принимают файл до 200 МБ.

export async function GET(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied
  // 194-5: `?message=<n>` — что легло в память по номеру сообщения; без параметра — прежний список.
  // 194-9: `?object=<id>` — то же про найденный объект; строки может не быть (`row: null`), и это не отказ.
  const objectId = new URL(request.url).searchParams.get("object")
  if (objectId !== null) {
    const v = await objectView(objectId)
    if (!v.ok) return deny(v.error, v.error === "store-unreachable" ? 502 : v.error === "no-id" ? 400 : 404)
    return NextResponse.json(v)
  }
  const message = new URL(request.url).searchParams.get("message")
  if (message !== null) {
    const v = await messageView(Number(message))
    if (!v.ok) return deny(v.error, v.error === "store-unreachable" ? 502 : v.error === "no-id" ? 400 : 404)
    return NextResponse.json(v)
  }
  return NextResponse.json(await status())
}

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

  const name = String(form.get("name") ?? (file as File).name ?? "").trim()
  const about = String(form.get("about") ?? "").trim()
  const bytes = new Uint8Array(await file.arrayBuffer())

  // 194-4: всё, что сказала модель и поправил человек, едет вместе с файлом.
  const text = (k: string) => {
    const v = form.get(k)
    return typeof v === "string" && v.trim() ? v.trim() : undefined
  }
  /** Массив из JSON-строки формы. Не массив — `undefined`, а не пустой список: «не передано» ≠ «пусто». */
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
  const ms = Number(text("describe_ms"))

  // 194-13: кто прислал — из самого замка, а не со слов формы: у сессии это email архитектора, у прибора —
  // секрет машины. Поле `author` формы берётся первым только для приборов и будущих входов (API, Telegram).
  const author = text("author") ?? ("email" in gate.who && gate.who.email ? gate.who.email : "прибор (секрет машины)")
  const r = await keep({
    about,
    anchors: list("anchors"),
    author,
    source: text("source") ?? "stand",
    bytes,
    described_by: text("described_by"),
    describe_ms: Number.isFinite(ms) ? ms : undefined,
    full: text("full"),
    language: text("language"),
    mime: file.type,
    name,
    tags: list("tags"),
    title: text("title"),
    who: text("who"),
  })
  if (!r.ok) {
    // 🔒 ОТКАЗ ГРАФА ИЗ-ЗА ЯКОРЕЙ — ВИНА ПРИСЛАННОГО (400); ОТКАЗ ХРАНИЛИЩ — ИХ СОСТОЯНИЕ (502).
    const ours = r.error === "no-name" || r.error === "empty-file" || r.error === "no-about" || r.error.includes("no-anchor")
    return NextResponse.json({ error: r.error, messageId: r.messageId ?? null, ok: false }, { status: ours ? 400 : 502 })
  }
  return NextResponse.json({ cardChars: r.cardChars, messageId: r.messageId, ms: r.ms, object: r.card, ok: true })
}

/**
 * Забыть. Без тела — всё, что лежит в объектах памяти; с `{ids}` — только эти.
 * Имя коллекции снаружи не принимается.
 */
export async function DELETE(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  let ids: string[] | undefined
  try {
    const body = (await request.json()) as { ids?: unknown }
    if (Array.isArray(body.ids)) ids = body.ids.map(String)
  } catch {
    // Пустое тело — законный вызов «забыть всё своё».
  }
  const r = await forget(ids)
  return NextResponse.json(r, { status: r.ok ? 200 : 502 })
}

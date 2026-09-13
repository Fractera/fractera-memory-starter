// @api стенд объектного хранилища: положить файл целиком и увидеть, что легло
import { NextResponse } from "next/server"
import { forget, keep, status } from "@/lib/fractera/objects"
import { benchGuard } from "@/lib/bench-guard"

// ДВЕРЬ СТЕНДА ОБЪЕКТНОГО ХРАНИЛИЩА (192-1).
//
// 🔒 ТА ЖЕ ФОРМА, ЧТО У ГРАФА И ВЕКТОРА: `GET` — что лежит, `POST` — положить,
// `DELETE` — забыть своё. Замок тот же — `benchGuard`: сессия архитектора или
// секрет машины; ключ памяти сюда не подходит, наружу открыт только договор.
//
// 🔒 ЭТОЙ ЖЕ ДВЕРЬЮ КЛАДЁТ ОБЪЕКТ И АГЕНТ ПАМЯТИ (`keep_object`, 192-4). У
// человека на стенде и у агента обязан быть ОДИН путь, иначе стенд проверяет не
// то, чем работает агент (закон §19).
//
// 🛑 ЧЕМ ЭТА ЗАГРУЗКА ОТЛИЧАЕТСЯ ОТ СОСЕДНИХ: текст не режется на куски и модель
// его не читает. Вещь ложится целиком, а искать её будут по карточке — имени,
// описанию и началу содержимого.
//
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

const deny = (error: string, status: number) =>
  NextResponse.json({ error, ok: false }, { status })

/** Предел файла стенда. Слой данных принимает 200 МБ; стенду и агенту столько не нужно. */
const MAX_BYTES = 20 * 1024 * 1024

export async function GET(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied
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
  if (file.size > MAX_BYTES) return deny("too-large", 413)

  const name = String(form.get("name") ?? (file as File).name ?? "").trim()
  const about = String(form.get("about") ?? "").trim()
  const bytes = new Uint8Array(await file.arrayBuffer())

  const r = await keep({ about, bytes, mime: file.type, name })
  if (!r.ok) {
    const code = r.error === "store-unreachable" ? 502 : r.error === "card-failed" || r.error === "store-refused" ? 502 : 400
    return deny(r.error, code)
  }
  return NextResponse.json({ cardChars: r.cardChars, ms: r.ms, object: r.card, ok: true })
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

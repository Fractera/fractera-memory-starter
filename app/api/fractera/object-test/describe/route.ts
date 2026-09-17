// @api стенд объектного хранилища: описать выбранный файл моделью до сохранения
import { NextResponse } from "next/server"
import { describe } from "@/lib/describe.mjs"
import { benchGuard } from "@/lib/bench-guard"

// ДВЕРЬ «ПОЛУЧИТЬ ОПИСАНИЕ» (194-2).
//
// 🔒 ЗАМОК ТОТ ЖЕ, ЧТО У СОСЕДНЕЙ ДВЕРИ ЗАГРУЗКИ — `benchGuard`: сессия архитектора или секрет машины.
// Каждое нажатие тратит ход подписки владельца; открыть это ключом памяти значило бы отдать квоту наружу.
//
// 🔒 ОПИСАНИЕ НИЧЕГО НЕ СОХРАНЯЕТ. Файл живёт только во временной папке на время вызова; человек
// читает и правит оба поля и только потом нажимает «Сохранить объект» (194-4).
//
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

  const name = String(form.get("name") ?? (file as File).name ?? "").trim()
  const bytes = new Uint8Array(await file.arrayBuffer())

  const r = await describe({ bytes, mime: file.type, name })
  if (!r.ok) {
    const status = r.refusal === "describe-kind-unsupported" || r.refusal === "describe-empty-file" ? 400 : 502
    return deny(r.refusal, status, r.why)
  }
  return NextResponse.json(r)
}

// @api стенд объектного хранилища: открыть объект памяти по идентификатору
import { NextResponse } from "next/server"
import { open, OPEN_LIMIT } from "@/lib/fractera/objects"
import { benchGuard } from "@/lib/bench-guard"

// ДВЕРЬ ОТКРЫТИЯ ОБЪЕКТА (192-1).
//
// 🔒 ОТКАЗЫ ПОИМЁННЫ, И ИХ ЧЕТЫРЕ РАЗНЫХ: такого id нет · id есть, но объект не
// памяти (снимок Telegram, значок проекта) · файл пропал со склада · склад не
// отвечает. Все четыре чинятся по-разному и не сводятся в «не удалось».
// 🔒 ДВОИЧНЫЙ ОБЪЕКТ — НЕ ОТКАЗ: приходит карточка и `text: null`, а зовущий
// обязан сказать «этот род не читаю», а не молчать.
//
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

const deny = (error: string, status: number) =>
  NextResponse.json({ error, ok: false }, { status })

export async function POST(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return deny("bad-json", 400)
  }

  const r = await open({ from: Number(body.from ?? 0), id: String(body.id ?? "") })
  if (!r.ok) {
    const code = r.error === "store-unreachable" ? 502 : r.error === "no-id" ? 400 : 404
    return deny(r.error, code)
  }
  return NextResponse.json({ ...r, limit: OPEN_LIMIT })
}

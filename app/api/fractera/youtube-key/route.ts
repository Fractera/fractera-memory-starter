// @api ключ YouTube Data API: состояние, запись в склад секретов машины и живая проверка у Google
import { NextResponse } from "next/server"
import { checkYoutubeKey, readYoutubeKeyState, saveYoutubeKey } from "@/lib/architect/youtube-key"
import { fracteraSession } from "@/lib/fractera/session"

// ДВЕРЬ КЛЮЧА YOUTUBE (195-4).
//
// 🔒 ЗАМОК — ТОЛЬКО РОЛЬ `architect`, КАК У КЛЮЧА OPENAI И ANTHROPIC: ключ — это квота владельца, и тот, кто его меняет, распоряжается ею.
// Дверь зовёт `fracteraSession()` сама, поэтому её имя стоит в `SELF_GUARDED` привратника ДО первой сборки: перехваченная, она отдала бы
// страницу входа, а островок прочитал бы HTML вместо JSON.
// 🛑 НАРУЖУ КЛЮЧ НЕ ВЫХОДИТ НИКОГДА — только признак «задан» и последние четыре знака.
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

const deny = (error: string, status: number) => NextResponse.json({ error, ok: false }, { status })

async function architect() {
  const session = await fracteraSession()
  if (!session) return { denied: deny("unauthorized", 401) }
  if (!session.roles.includes("architect")) return { denied: deny("forbidden", 403) }
  return { email: session.email }
}

export async function GET() {
  const gate = await architect()
  if (gate.denied) return gate.denied
  return NextResponse.json({ ok: true, ...readYoutubeKeyState() })
}

export async function POST(request: Request) {
  const gate = await architect()
  if (gate.denied) return gate.denied

  let body: { check?: unknown; key?: unknown }
  try {
    body = (await request.json()) as { check?: unknown; key?: unknown }
  } catch {
    return deny("bad-json", 400)
  }

  // Проверка ключа, который уже лежит в складе: «похож» и «принят Google» — разные утверждения.
  if (body.check === true) {
    const r = await checkYoutubeKey()
    return NextResponse.json(r, { status: r.ok ? 200 : 200 })
  }

  const saved = saveYoutubeKey(String(body.key ?? ""))
  if (!saved.ok) return deny(saved.error ?? "refused", saved.error === "store-refused" ? 502 : 400)
  // 🔒 СРАЗУ ПОСЛЕ ЗАПИСИ — ЖИВАЯ ПРОВЕРКА: человек узнаёт об отвергнутом ключе здесь, а не на первой ссылке через час.
  const check = await checkYoutubeKey()
  return NextResponse.json({ check, ok: true, ...readYoutubeKeyState() })
}

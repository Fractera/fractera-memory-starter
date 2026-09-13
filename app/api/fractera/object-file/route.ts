// @api стенд объектного хранилища: отдать сам файл объекта памяти в браузер
import { fileOf } from "@/lib/fractera/objects"
import { benchGuard } from "@/lib/bench-guard"

// ДВЕРЬ ФАЙЛА ОБЪЕКТА (194-5).
//
// 🔒 КЛЮЧ СКЛАДА ОСТАЁТСЯ НА СЕРВЕРЕ: браузер получает байты через эту дверь, а не адрес медиатеки.
// Закон чата 96: приватный файл отдаётся своим маршрутом.
// 🔒 ОТДАЁТСЯ ТОЛЬКО СВОЁ: у объекта обязана быть карточка в коллекции памяти. Снимок из Telegram
// или значок проекта в той же медиатеке через эту дверь не открываются.
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

export async function GET(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied

  const id = new URL(request.url).searchParams.get("id") ?? ""
  const r = await fileOf(id)
  if (!r.ok) {
    const status = r.error === "store-unreachable" ? 502 : r.error === "no-id" ? 400 : 404
    return Response.json({ error: r.error, ok: false }, { status })
  }
  return new Response(r.body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(r.name)}`,
      "Content-Type": r.mime || "application/octet-stream",
    },
  })
}

// @api испытательный стенд памяти: позвать её ПУБЛИЧНЫЙ API и увидеть запрос и ответ целиком
import { lookup } from "node:dns/promises"
import { networkInterfaces } from "node:os"
import { NextResponse } from "next/server"
import { maskKey, readKey } from "@/lib/api-key.mjs"
import { publicMemoryUrl } from "@/lib/fractera/auth-url"
// 🔒 СЕССИЯ СПРАШИВАЕТСЯ ТЕМ ЖЕ ПОМОЩНИКОМ, ЧТО У ЧАТА, — СКОПИРОВАННЫМ ДОСЛОВНО.
import { fracteraSession } from "@/lib/fractera/session"

// ДВЕРЬ СТЕНДА — ПРОВОДНИК В ПУБЛИЧНЫЙ `/v1/*` (200-1, форма с файлами — 200-5).
//
// 🔒 СТЕНД ЗОВЁТ ПАМЯТЬ ТЕМ ЖЕ ПУТЁМ, ЧТО ЛЮБАЯ ПРОГРАММА: nginx → `server.mjs` →
// замок ключа → проверка обязательных по договору → исполнитель. Слово владельца
// 2026-09-14: «it most important page , which for test must have API request ,
// but not direct call as another pages». Адрес — публичный домен (его выбор).
// 🪦 До 200-1 дверь импортировала исполнителей ядра памяти и звала их напрямую
// (178-2): замок ключа, проверка обязательных и отказы договора стендом не
// проходились, а методов было пять из восьми. Восстанавливается из git.
//
// 🔒 КЛЮЧ ПАМЯТИ ЖИВЁТ ТОЛЬКО НА СЕРВЕРЕ (закон 185): экран видит его маску.
// 🛑 И УХОДИТ ОН ТОЛЬКО АДРЕСУ ЭТОЙ МАШИНЫ. Адрес выводится из заголовка `Host`,
// а заголовок пишет клиент: подделанный `Host` увёл бы ключ на чужой сервер.
// Поэтому домен разрешается и сверяется с адресами собственных интерфейсов
// (измерено 2026-09-14: публичный IP стоит на `eth0`); перенаправления не
// выполняются — ключ не едет следом за `Location`.
//
// 🔒 ФОРМА С ФАЙЛАМИ (200-5) ИДЁТ ПОТОКОМ И ТОЛЬКО В `remember`: у стенда три глагола, и вложения — включение в «Сказать».
// Тело не разбирается и не собирается в память двери — оно течёт в `/v1/remember` как пришло, с той же границей частей.
//
// 🔒 ЗАМОК ДВЕРИ — СЕССИЯ ЧЕЛОВЕКА, РОЛЬ `architect`, конвейером панели и сайта.
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

/** Служебное имя стенда: первое в списке людей на экране (183-3). */
export const BENCH_WHO = "bench-1"

const NO_STORE = { "Cache-Control": "no-store" }

/** Ход модели на глубине идёт минутами; nginx держит `proxy_read_timeout 86400`. */
const LONG_MS = 600_000

type Stream = { body: ReadableStream<Uint8Array>; contentType: string; length: string | null }
type Call = { json?: unknown; path: string; stream?: Stream; verb: "DELETE" | "GET" | "POST" }

function thisMachine(): Set<string> {
  const out = new Set<string>(["127.0.0.1", "::1"])
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) out.add(a.address)
  }
  return out
}

async function publicBase(request: Request): Promise<{ base: string; refused: string | null }> {
  const h = request.headers
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? ""
  const proto = h.get("x-forwarded-proto") ?? "https"
  const base = publicMemoryUrl(host, proto)
  let hostname: string
  try {
    hostname = new URL(base).hostname.replace(/^\[|\]$/g, "")
  } catch {
    return { base, refused: "bad-host" }
  }
  try {
    const found = await lookup(hostname, { all: true })
    const mine = thisMachine()
    if (!found.length || !found.every((f) => mine.has(f.address))) {
      return { base, refused: "host-not-this-machine" }
    }
  } catch {
    return { base, refused: "host-not-resolved" }
  }
  return { base, refused: null }
}

/** Файл объекта не собирается в память двери: считаются байты, тело уходит в никуда. */
async function countBytes(r: Response): Promise<number> {
  const reader = r.body?.getReader()
  if (!reader) return 0
  let n = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return n
    n += value.byteLength
  }
}

async function callPublic(request: Request, call: Call) {
  const { base, refused } = await publicBase(request)
  const key = readKey()
  const url = `${base}${call.path}`
  const payload = call.json === undefined ? undefined : JSON.stringify(call.json)
  const contentType = call.stream ? call.stream.contentType : payload !== undefined ? "application/json" : null

  // 🔒 ЭКРАН ВИДИТ РОВНО ОТПРАВЛЕННОЕ: адрес, заголовки (ключ маской), тело.
  const shown: Record<string, string> = {}
  if (contentType) shown["content-type"] = contentType
  if (key) shown["x-memory-key"] = maskKey(key) ?? "fmk_…"
  const shownBody = call.stream ? { multipart: true, bytes: call.stream.length } : (call.json ?? null)
  const sentRequest = { body: shownBody, headers: shown, method: call.verb, url }
  const sent = { body: shownBody, method: call.path.replace(/^\/v1\//, "") }

  if (refused) {
    return NextResponse.json(
      {
        body: null,
        ms: 0,
        request: sentRequest,
        sent,
        status: 0,
        trouble: `адрес ${base} не указывает на эту машину — ключ памяти туда не отправлен (${refused})`,
      },
      { headers: NO_STORE }
    )
  }

  // 🛑 НЕТ КЛЮЧА — ЗОВЁМ БЕЗ НЕГО: отказ `no-access` есть ответ договора, и стенд
  // обязан его показать, а не подменить своей ошибкой.
  const headers: Record<string, string> = {}
  if (contentType) headers["content-type"] = contentType
  if (call.stream?.length) headers["content-length"] = call.stream.length
  if (key) headers["x-memory-key"] = key

  const started = Date.now()
  try {
    // 🔒 ПОТОК ТЕЛА ТРЕБУЕТ `duplex: "half"` — без него `fetch` узла отказывается слать `ReadableStream`.
    const init: RequestInit & { duplex?: "half" } = {
      body: call.stream ? call.stream.body : payload,
      cache: "no-store",
      headers,
      method: call.verb,
      redirect: "manual",
      signal: AbortSignal.timeout(LONG_MS),
      ...(call.stream ? { duplex: "half" as const } : {}),
    }
    const r = await fetch(url, init)
    const type = r.headers.get("content-type") ?? ""
    let body: unknown
    if (type.includes("application/json")) {
      const text = await r.text()
      try {
        body = JSON.parse(text)
      } catch {
        body = { raw: text.slice(0, 4000) }
      }
    } else if (type.startsWith("text/")) {
      body = { content_type: type, raw: (await r.text()).slice(0, 4000) }
    } else {
      body = {
        bytes: await countBytes(r),
        content_disposition: r.headers.get("content-disposition"),
        content_type: type || null,
      }
    }
    return NextResponse.json(
      { body, ms: Date.now() - started, request: sentRequest, sent, status: r.status, trouble: null },
      { headers: NO_STORE }
    )
  } catch (e) {
    return NextResponse.json(
      {
        body: null,
        ms: Date.now() - started,
        request: sentRequest,
        sent,
        status: 0,
        trouble: `публичный API памяти не ответил: ${String((e as Error).message)}`,
      },
      { headers: NO_STORE }
    )
  }
}

async function gate(): Promise<NextResponse | null> {
  const session = await fracteraSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!session.roles.includes("architect")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  return null
}

/** Строка каталога чтения → путь договора. Незнакомое не зовётся вовсе. */
function catalogPath(get: string): string | null {
  // 🪦 206-6: `tables` и `tables/<имя>` убраны вместе с дверьми каталога.
  // 🔒 207-6: КАТАЛОГИ — ТОЖЕ АДРЕСА. «Кто мне писал» и рассказ памяти о работе перестали быть
  // глаголами, и стенд зовёт их так же, как любая чужая программа, — иначе экран проверяет не то.
  if (get === "sources" || get === "journal") return `/v1/${get}`
  if (get === "health" || get === "contract") return `/v1/${get}`
  const file = /^objects\/([^/]+)\/file$/.exec(get)
  if (file) return `/v1/objects/${encodeURIComponent(file[1])}/file`
  return null
}

/**
 * `{ method, body }` — метод договора, тело уезжает КАК НАБРАНО.
 * `{ get }` — строка каталога: `health` · `contract` · `objects/<id>/file`.
 * `multipart/form-data` с `?method=remember` — «Сказать» с файлами, потоком (200-5).
 */
export async function POST(request: Request) {
  const refused = await gate()
  if (refused) return refused

  const type = request.headers.get("content-type") ?? ""
  if (type.toLowerCase().startsWith("multipart/form-data")) {
    const method = new URL(request.url).searchParams.get("method")
    if (method !== "remember" || !request.body) {
      return NextResponse.json({ error: "bad-method", ok: false }, { status: 400 })
    }
    return callPublic(request, {
      path: "/v1/remember",
      stream: { body: request.body, contentType: type, length: request.headers.get("content-length") },
      verb: "POST",
    })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "bad-json", ok: false }, { status: 400 })
  }

  // 🔒 207-6: СТИРАНИЕ ЖУРНАЛА СТАЛО АДРЕСОМ, А НЕ ГЛАГОЛОМ, и зовётся своим методом HTTP.
  // Отдельное имя в теле («del») нужно потому, что одно и то же слово «journal» означает теперь
  // два разных действия — прочитать и стереть, — и различает их метод, а не путь.
  // 🔒 214-2: СЛОВА БЕЗ ГЛАГОЛА. Стенд шлёт их сюда с пометкой `unsorted`, а дверь ведёт на адрес
  // БЕЗ имени глагола: память относит их сама. Имя глагола здесь не подставляется — иначе стенд
  // решал бы за неё, и проверялось бы не то, чем пользуется человек.
  if (body.unsorted === true) {
    return callPublic(request, { json: body.body ?? {}, path: "/v1", verb: "POST" })
  }

  if (body.del === "journal") {
    return callPublic(request, { path: "/v1/journal", verb: "DELETE" })
  }

  if (typeof body.get === "string") {
    const path = catalogPath(body.get)
    if (!path) return NextResponse.json({ error: "bad-get", ok: false }, { status: 400 })
    return callPublic(request, { path, verb: "GET" })
  }

  // 🔒 ИМЯ МЕТОДА НЕ СВЕРЯЕТСЯ СО СПИСКОМ: метод вне договора получает отказ
  // `not-built` ОТ САМОЙ ПАМЯТИ. Образец лишь не даёт имени стать чужим путём.
  const method = typeof body.method === "string" ? body.method.trim() : ""
  if (!/^[a-z][a-z0-9_-]{0,40}$/.test(method)) {
    return NextResponse.json({ error: "bad-method", ok: false }, { status: 400 })
  }
  return callPublic(request, { json: body.body ?? {}, path: `/v1/${method}`, verb: "POST" })
}

// 🪦 ЗДЕСЬ БЫЛ `GET` — он обслуживал ТОЛЬКО каталог таблиц: список имён и
// описание одного имени. Убран 206-6 вместе с предметом. История — пересказом:
// с 178-1 стенд звал `GET`, а дверь его не держала; журнал nginx 2026-09-14
// показал 14 обращений и все `405`, и раздел стоял пустым всё это время.

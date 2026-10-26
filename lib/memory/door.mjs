// THE CONTRACT'S DOORS ON A FRACTERA NODE — `/v1/*` (node step 596-2).
//
// The same addresses, order, lock and refusals as the former `server.mjs` of the memory, now inside the element's Next server
// (`app/v1/[[...path]]/route.ts` calls `handleV1`). What changed, and only this:
// - the lock: a process of THIS node — the node key `X-Node-Key` (every element's door, `lib/node-key.ts`) or the node's data secret
//   `X-Data-Secret`. The memory's own outside key (`fmk_…`, revoked by a button on the former stand) did not move: nothing of the
//   person's memory is reached from outside the node;
// - from the internet nothing: a call through the Cloudflare tunnel carries `cf-ray` and gets 404, even with a key — the same rule as
//   the doors of the data layer (`lib/data-store/auth.mjs` of the data element);
// - a phrase with files (`multipart/form-data`) is read right here, no inner door over the loopback.
// 🔒 `GET /v1/health` stays open on the machine: it says «alive» and nothing about a person.
// 🔒 The verbs are named by the contract (`METHODS`), never by a second list here: a second list drifts from the contract silently.
import { timingSafeEqual } from "node:crypto"
import { contract, CONTRACT_VERSION, METHODS, SERVICE } from "./contract.mjs"
import { say } from "./words.mjs"
import { remember, recall } from "./verbs.mjs"
import { feedback } from "./feedback.mjs"
import { sources } from "./sources.mjs"
import { state } from "./state.mjs"
import { signals } from "./signals.mjs"
import { whichVerb, whichVerbWords } from "./which-verb.mjs"
import { forget_journal, journal } from "./journal-verbs.mjs"
import { open_object } from "./object-verbs.mjs"
import { rememberText } from "./answer-text.mjs"
import { AUTH, parseSource } from "./source.mjs"
import { fileOf, ingest } from "./fractera/objects"

const STARTED_AT = new Date().toISOString()
const RUN = { feedback, recall, remember }

function json(status, body) {
  return new Response(JSON.stringify(body), {
    headers: { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" },
    status,
  })
}

function same(given, expected) {
  if (!given || !expected) return false
  const a = Buffer.from(String(given))
  const b = Buffer.from(String(expected))
  return a.length === b.length && timingSafeEqual(a, b)
}

/** How the caller proved itself: a process of this node (node key or data secret) — or nobody. */
function authKind(req) {
  if (same(req.headers.get("x-node-key"), process.env.SETTINGS_SECRET)) return AUTH.MACHINE
  if (same(req.headers.get("x-data-secret"), process.env.DATA_SECRET)) return AUTH.MACHINE
  return null
}

/** How the request arrived — a measured fact from the headers, never from the body (211-2). */
function seenOf(req) {
  return { host: req.headers.get("x-forwarded-host") ?? req.headers.get("host"), proto: req.headers.get("x-forwarded-proto") ?? "http" }
}

async function readJson(req) {
  try {
    const raw = await req.text()
    if (raw.length > 1e6) return null
    return JSON.parse(raw || "{}")
  } catch {
    return null
  }
}

/** A phrase with files: JSON in the part `payload`, the files in the parts `files` (the former inner door remember-ingest). */
async function rememberWithFiles(req, auth) {
  const refuse = (status, body) => json(status, { ok: false, ...body, objects: [], text: String(body.what_happened ?? "") })
  let form
  try {
    form = await req.formData()
  } catch {
    return refuse(400, { error: "bad-json", what_happened: say("bad-json") })
  }
  let payload = {}
  const raw = form.get("payload")
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object")
      payload = parsed
    } catch {
      return refuse(400, { error: "bad-json", what_happened: say("bad-json") })
    }
  }
  const lang = typeof payload.lang === "string" ? payload.lang : undefined
  const declared = METHODS.find((m) => m.name === "remember")
  const missing = (declared?.params ?? []).filter((p) => p.required && !payload[p.name]).map((p) => p.name)
  if (missing.length) {
    return refuse(400, { error: "missing-params", missing, what_happened: say("missing-params", lang, { names: missing.join(", ") }) })
  }
  const who = typeof payload.who === "string" && payload.who.trim() ? payload.who.trim() : "architect"
  let sourcePath = null
  if (payload.from !== undefined) {
    const parsed = parseSource(payload.from)
    if (!parsed.ok) return refuse(400, { error: parsed.error ?? "bad-source", what_happened: parsed.why ?? "bad source" })
    sourcePath = parsed.text ?? null
  }
  const files = form.getAll("files").filter((f) => typeof f === "object" && f !== null && typeof f.arrayBuffer === "function")
  const fates = []
  for (const file of files) {
    const name = file.name || "file"
    const r = await ingest({
      author: who,
      bytes: new Uint8Array(await file.arrayBuffer()),
      mime: file.type,
      name,
      source: "api",
      source_path: sourcePath,
      who,
    })
    fates.push(
      r.ok
        ? { id: r.card?.id, kind: r.kind, messageId: r.messageId, name, ok: true, title: r.title }
        : { error: r.error, name, ok: false, ...(r.why ? { why: r.why } : {}) },
    )
  }
  const answer = await remember({ ...payload, auth, seen: seenOf(req) })
  const objects = [...fates, ...(Array.isArray(answer.objects) ? answer.objects : [])]
  const keptWhole = answer.kept_whole
  const ru = lang !== "en"
  const kept = keptWhole?.ok
    ? keptWhole.where === "objects"
      ? ru ? "текст длинный — сохранён целиком отдельной вещью." : "the text was long — kept whole as one thing."
      : keptWhole.where === "graph+vector"
        ? ru ? "сказанное целиком — в связях и в поиске по смыслу." : "everything said — in the graph and in semantic search."
        : ru ? "сказанное целиком — в связях." : "everything said — in the knowledge graph."
    : ""
  const text = rememberText({
    kept,
    lang,
    noted: answer.noted,
    objects,
    trouble: answer.refusal ? answer.what_happened : null,
    what_happened: answer.what_happened,
  })
  return json(200, { ...answer, objects, text })
}

/** The file of a stored thing, streamed with its own type and name. */
async function objectFile(id) {
  const r = await fileOf(id)
  if (!r.ok) {
    const status = r.error === "store-unreachable" ? 502 : r.error === "no-id" ? 400 : 404
    return json(status, { error: r.error, ok: false })
  }
  return new Response(r.body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(r.name)}`,
      "Content-Type": r.mime || "application/octet-stream",
    },
  })
}

/** One entry for every `/v1` request. */
export async function handleV1(req) {
  // From the internet — nothing, even with a key (the tunnel stamps `cf-ray`).
  if (req.headers.get("cf-ray")) return json(404, { error: "Not found" })
  const url = new URL(req.url)
  const path = url.pathname.replace(/\/+$/, "") || "/"
  const lang = url.searchParams.get("lang") ?? undefined

  if (req.method === "GET" && path === "/v1/health") {
    return json(200, { methods: contract().methods.length, ok: true, service: SERVICE, startedAt: STARTED_AT, version: CONTRACT_VERSION })
  }

  const auth = authKind(req)
  if (!auth) return json(401, { error: "no-access", ok: false, what_happened: say("no-access", lang) })

  if (req.method === "GET" && path === "/v1/contract") return json(200, { ...contract(), ok: true })
  if (req.method === "GET" && path === "/v1/state") return json(200, state(seenOf(req)))
  if (req.method === "GET" && path === "/v1/signals") {
    const out = await signals({ lang })
    return json(out.ok ? 200 : 502, out)
  }
  if (req.method === "GET" && path === "/v1/sources") {
    const out = await sources({ lang })
    return json(out.ok ? 200 : 502, out)
  }
  if (req.method === "GET" && path === "/v1/journal") {
    const out = await journal({ lang })
    return json(out.ok ? 200 : 502, out)
  }
  if (req.method === "DELETE" && path === "/v1/journal") {
    const out = await forget_journal({ lang })
    return json(out.ok ? 200 : 502, out)
  }
  if (req.method === "GET" && /^\/v1\/objects\/[^/]+$/.test(path)) {
    const id = decodeURIComponent(path.split("/")[3] ?? "")
    const from = Number(url.searchParams.get("from") ?? 0) || 0
    const opened = await open_object({ from, id })
    return json(opened.ok ? 200 : 404, opened)
  }
  if (req.method === "GET" && /^\/v1\/objects\/[^/]+\/file$/.test(path)) {
    return objectFile(decodeURIComponent(path.split("/")[3] ?? ""))
  }

  // A phrase with files — before the JSON branch: the body must stay unread for the form.
  if (req.method === "POST" && path === "/v1/remember" && String(req.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data")) {
    return rememberWithFiles(req, auth)
  }

  // Words with no verb: memory picks one of the three and says how it read them, first line of the text (214-1).
  if (req.method === "POST" && path === "/v1") {
    const body = await readJson(req)
    if (!body) return json(400, { error: "bad-json", ok: false, what_happened: say("bad-json") })
    const text = typeof body.text === "string" ? body.text.trim() : ""
    if (!text) {
      return json(400, { error: "need-text", objects: [], ok: false, text: say("need-text", body.lang), what_happened: say("need-text", body.lang) })
    }
    const picked = whichVerb(text)
    const out = await RUN[picked.verb]({ ...body, ...(picked.about ? { about: picked.about } : {}), auth, seen: seenOf(req), text })
    const how = whichVerbWords(picked, body.lang)
    return json(200, { ...out, read_as: { verb: picked.verb, why: picked.why }, text: [how, out.text].filter(Boolean).join("\n") })
  }

  if (req.method === "POST" && path.startsWith("/v1/")) {
    const name = path.slice(4)
    const declared = METHODS.find((m) => m.name === name)
    if (declared) {
      const shaped = (what) => (declared.output ? { objects: [], text: what } : {})
      const body = await readJson(req)
      if (!body) return json(400, { error: "bad-json", ok: false, what_happened: say("bad-json"), ...shaped(say("bad-json")) })
      const missing = declared.params.filter((p) => p.required && !body[p.name]).map((p) => p.name)
      if (missing.length) {
        const what = say("missing-params", body.lang, { names: missing.join(", ") })
        return json(400, { error: "missing-params", missing, ok: false, what_happened: what, ...shaped(what) })
      }
      try {
        // the kind of key is set by the server, never by the body: a sent `auth` is overwritten (207-2)
        return json(200, await RUN[name]({ ...body, auth, seen: seenOf(req) }))
      } catch (e) {
        return json(500, {
          error: "inside-memory",
          ok: false,
          what_happened: say("inside-memory", body.lang),
          why: String(e?.message ?? e).slice(0, 200),
          ...shaped(say("inside-memory", body.lang)),
        })
      }
    }
  }

  // «Not built» and «does not exist» are different answers: a name the contract does not declare is not built.
  return json(501, { error: "not-built", ok: false, what_happened: say("not-built"), version: CONTRACT_VERSION })
}

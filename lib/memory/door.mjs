// THE CONTRACT'S DOORS ON A FRACTERA NODE — `/v1/*` (node step 596-2).
//
// The same addresses, order, lock and refusals as the former `server.mjs` of the memory, now inside the element's Next server
// (`app/v1/[[...path]]/route.ts` calls `handleV1`). What changed, and only this:
// - the lock: a process of THIS node — 654-5: the node's data key `X-Data-Secret` (the node, the main agent: every space) or an
//   element's own key `X-Element-Key` (that element alone, its space is the key's id). The node key `X-Node-Key` opens the memory no
//   more: every custom element holds it until step 655, and with it any of them could name any `from` (the hole 650-main D4 left
//   open). The memory's own outside key (`fmk_…`, revoked by a button on the former stand) did not move: nothing of the person's memory
//   is reached from outside the node;
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
import { elementOf } from "./element-key.mjs"
import { inSpace, spaceOf } from "./space.mjs"
import { fileOf, ingest, markOwnPrivate } from "./fractera/objects"
import { checkReminder, setReminder } from "./reminder.mjs"
import { takeBackupNotice } from "./think.mjs"

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

/**
 * How the caller proved itself (654-5): the node's data key — the node (the main agent sees every space); an element's own key — that
 * element alone. A presented element key is checked first and a bad one is refused, never read as «the node»; the node key `X-Node-Key`
 * is no key here any more. The owner, 2026-11-05: «DATA_SECRET сейчас, другой — 655».
 * @returns {{ auth: string, element: string | null } | { refusal: Response } | null}
 */
function callerKey(req, lang) {
  const presented = req.headers.get("x-element-key")
  if (presented) {
    const id = elementOf(presented, process.env.DATA_SECRET)
    if (!id) return { refusal: json(401, { error: "bad_element_key", ok: false, what_happened: say("bad-element-key", lang) }) }
    return { auth: AUTH.MACHINE, element: id }
  }
  if (same(req.headers.get("x-data-secret"), process.env.DATA_SECRET)) return { auth: AUTH.MACHINE, element: null }
  return null
}

const unnamed = (from) => from === undefined || from === null || from === "" || (Array.isArray(from) && from.length === 0)

/** 654-5: an element's own key may leave `from` out — it is the key's id; the node's calls are left as they came. */
function withOwnFrom(body, element) {
  return element && unnamed(body?.from) ? { ...body, from: [element] } : body
}

/** How the request arrived — a measured fact from the headers, never from the body (211-2). */
function seenOf(req) {
  return { host: req.headers.get("x-forwarded-host") ?? req.headers.get("host"), proto: req.headers.get("x-forwarded-proto") ?? "http" }
}

/**
 * 650-1: who calls — the space of the call: `from` of a JSON body or a form, `?source=` of a GET or a DELETE (`?from=` of an object
 * is its text offset). 🔒 Without a caller — a refusal, never «every space»: an element that left it out would read them all.
 * @returns {{ ctx: { space: string, all: boolean } } | { refusal: Response }}
 */
function callerOf(from, element = null, lang) {
  const parsed = parseSource(element && unnamed(from) ? [element] : (from ?? []))
  if (!parsed.ok) return { refusal: json(400, { error: parsed.error ?? "source-required", objects: [], ok: false, text: parsed.why, what_happened: parsed.why }) }
  // 654-5: with an element's own key the space IS the key's id — a `from` naming another element, `build` or `core` is refused.
  if (element && parsed.path[0] !== element) {
    const why = say("space-not-yours", lang, { from: parsed.path[0] })
    return { refusal: json(403, { error: "space-not-yours", objects: [], ok: false, text: why, what_happened: why }) }
  }
  const space = spaceOf(parsed.path)
  if (!space.ok) return { refusal: json(400, { error: space.error, objects: [], ok: false, text: space.why, what_happened: space.why }) }
  return { ctx: space }
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

/**
 * 636: a phrase with `remind` — the phrase is kept as always, then its reminder goes into the memory's own calendar (`reminder.mjs`).
 * A phrase the memory did not keep gets no reminder: the calendar never holds what the memory does not have. A phrase kept whole
 * whose thinking failed (✗ 2026-11-03 on the owner's node: `think-no-money`, an OpenAI key with no balance) is kept — its reminder
 * stands: a reminder never waits for the facts.
 */
function withReminder(answer, remind, phrase, lang) {
  const kept = (answer?.ok !== false && !answer?.refusal) || answer?.kept_whole?.ok === true
  if (!kept) return { ...answer, reminder: { ok: false, error: "not-kept" } }
  const r = setReminder(remind, phrase, lang)
  return { ...answer, reminder: r, text: [answer?.text, r.ok ? r.line : r.why].filter(Boolean).join("\n") }
}

/** 636-9: an answer that used the backup channel (the Anthropic subscription) carries its warning, once a day (`think.mjs`). */
function withNotice(answer, lang) {
  const notice = takeBackupNotice(lang)
  return notice ? { ...answer, notice: "backup-subscription", text: [answer?.text, notice].filter(Boolean).join("\n") } : answer
}

/** A phrase with files: JSON in the part `payload`, the files in the parts `files` (the former inner door remember-ingest). */
async function rememberWithFiles(req, auth, element) {
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
  payload = withOwnFrom(payload, element)
  const lang = typeof payload.lang === "string" ? payload.lang : undefined
  const declared = METHODS.find((m) => m.name === "remember")
  const missing = (declared?.params ?? []).filter((p) => p.required && !payload[p.name]).map((p) => p.name)
  if (missing.length) {
    return refuse(400, { error: "missing-params", missing, what_happened: say("missing-params", lang, { names: missing.join(", ") }) })
  }
  const remindCheck = payload.remind !== undefined ? checkReminder(payload.remind) : null
  if (remindCheck && !remindCheck.ok) return refuse(400, { error: remindCheck.error, what_happened: remindCheck.why })
  const who = typeof payload.who === "string" && payload.who.trim() ? payload.who.trim() : "architect"
  // 650-1: the caller is required — its files and its phrase go into its space (654-5: an element's key is its caller).
  const caller = callerOf(payload.from, element, lang)
  if (caller.refusal) return caller.refusal
  const sourcePath = parseSource(payload.from).text ?? null
  return inSpace(caller.ctx, () => rememberWithFilesIn({ auth, form, lang, payload, refuse, remindCheck, req, sourcePath, who }))
}

/** The rest of a phrase with files, inside the caller's space (650-1). */
async function rememberWithFilesIn({ auth, form, lang, payload, refuse, remindCheck, req, sourcePath, who }) {
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
  let answer
  try {
    answer = await remember({ ...payload, auth, seen: seenOf(req) })
  } catch (e) {
    // 596-5: a throw inside the verb is a named refusal with the fates of the files already laid, never an empty 500.
    return json(500, {
      error: "inside-memory",
      objects: fates,
      ok: false,
      text: say("inside-memory", lang),
      what_happened: say("inside-memory", lang),
      why: String(e?.message ?? e).slice(0, 200),
    })
  }
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
  const out = { ...answer, objects, text }
  return json(200, withNotice(remindCheck ? withReminder(out, payload.remind, payload.text, lang) : out, lang))
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

  const key = callerKey(req, lang)
  if (key?.refusal) return key.refusal
  if (!key) return json(401, { error: "no-access", ok: false, what_happened: say("no-access", lang) })
  const { auth, element } = key
  // 654-2: the memory's files marked private in the storage — once; a no-op after the first pass finished (`markOwnPrivate`).
  void markOwnPrivate()

  if (req.method === "GET" && path === "/v1/contract") return json(200, { ...contract(), ok: true })
  if (req.method === "GET" && path === "/v1/state") return json(200, state(seenOf(req)))
  // 650-1: every verb below works in the caller's space; `?source=` names the caller.
  const scoped = (run) => {
    const caller = callerOf(url.searchParams.get("source") || undefined, element, lang)
    return caller.refusal ?? inSpace(caller.ctx, run)
  }
  if (req.method === "GET" && path === "/v1/signals") {
    return scoped(async () => {
      const out = await signals({ lang })
      return json(out.ok ? 200 : 502, out)
    })
  }
  if (req.method === "GET" && path === "/v1/sources") {
    return scoped(async () => {
      const out = await sources({ lang })
      return json(out.ok ? 200 : 502, out)
    })
  }
  if (req.method === "GET" && path === "/v1/journal") {
    return scoped(async () => {
      const out = await journal({ lang })
      return json(out.ok ? 200 : 502, out)
    })
  }
  if (req.method === "DELETE" && path === "/v1/journal") {
    return scoped(async () => {
      const out = await forget_journal({ lang, space: url.searchParams.get("space") || undefined })
      return json(out.ok ? 200 : 502, out)
    })
  }
  if (req.method === "GET" && /^\/v1\/objects\/[^/]+$/.test(path)) {
    return scoped(async () => {
      const id = decodeURIComponent(path.split("/")[3] ?? "")
      const from = Number(url.searchParams.get("from") ?? 0) || 0
      const opened = await open_object({ from, id })
      return json(opened.ok ? 200 : 404, opened)
    })
  }
  if (req.method === "GET" && /^\/v1\/objects\/[^/]+\/file$/.test(path)) {
    return scoped(() => objectFile(decodeURIComponent(path.split("/")[3] ?? "")))
  }

  // A phrase with files — before the JSON branch: the body must stay unread for the form.
  if (req.method === "POST" && path === "/v1/remember" && String(req.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data")) {
    return rememberWithFiles(req, auth, element)
  }

  // Words with no verb: memory picks one of the three and says how it read them, first line of the text (214-1).
  if (req.method === "POST" && path === "/v1") {
    const read = await readJson(req)
    if (!read) return json(400, { error: "bad-json", ok: false, what_happened: say("bad-json") })
    const body = withOwnFrom(read, element)
    const text = typeof body.text === "string" ? body.text.trim() : ""
    if (!text) {
      return json(400, { error: "need-text", objects: [], ok: false, text: say("need-text", body.lang), what_happened: say("need-text", body.lang) })
    }
    const caller = callerOf(body.from, element, body.lang)
    if (caller.refusal) return caller.refusal
    const picked = whichVerb(text)
    const out = await inSpace(caller.ctx, () => RUN[picked.verb]({ ...body, ...(picked.about ? { about: picked.about } : {}), auth, seen: seenOf(req), text }))
    const how = whichVerbWords(picked, body.lang)
    return json(200, withNotice({ ...out, read_as: { verb: picked.verb, why: picked.why }, text: [how, out.text].filter(Boolean).join("\n") }, body.lang))
  }

  if (req.method === "POST" && path.startsWith("/v1/")) {
    const name = path.slice(4)
    const declared = METHODS.find((m) => m.name === name)
    if (declared) {
      const shaped = (what) => (declared.output ? { objects: [], text: what } : {})
      const read = await readJson(req)
      if (!read) return json(400, { error: "bad-json", ok: false, what_happened: say("bad-json"), ...shaped(say("bad-json")) })
      const body = withOwnFrom(read, element)
      const missing = declared.params.filter((p) => p.required && !body[p.name]).map((p) => p.name)
      if (missing.length) {
        const what = say("missing-params", body.lang, { names: missing.join(", ") })
        return json(400, { error: "missing-params", missing, ok: false, what_happened: what, ...shaped(what) })
      }
      const caller = callerOf(body.from, element, body.lang)
      if (caller.refusal) return caller.refusal
      // 636: «remember» with `remind` — the time is checked first: a wrong time is a refusal, and the phrase is not kept without it.
      const remindCheck = name === "remember" && body.remind !== undefined ? checkReminder(body.remind) : null
      if (remindCheck && !remindCheck.ok) return json(400, { error: remindCheck.error, ok: false, what_happened: remindCheck.why, ...shaped(remindCheck.why) })
      try {
        // the kind of key is set by the server, never by the body: a sent `auth` is overwritten (207-2)
        const out = await inSpace(caller.ctx, () => RUN[name]({ ...body, auth, seen: seenOf(req) }))
        return json(200, withNotice(remindCheck ? withReminder(out, body.remind, body.text, body.lang) : out, body.lang))
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

// THE NODE AROUND THE MEMORY (node step 596-2, 596-3). One place that knows where this element stands on a Fractera node and how it
// reaches the stores of the node's data layer; every other module of the memory asks here instead of keeping its own copy.
//
// - ELEMENT_DIR and SERVICE_DATA_DIR are absolute paths the node's installer writes into .env.local: a built Next server works from
//   inside its build, so a path counted from process.cwd() or from this file would live inside the build and die at the next rebuild
//   (node law 259-260).
// - The OpenAI key: the core's first, then this element's own (node law 336) — read at every call, so a key saved on the node's screen
//   works from the next call. It computes only vectors and voice transcripts; thinking never goes to OpenAI (owner 2026-09-09).
// - Vectors: the vector element of this node counts nothing itself (no key of its own, `configured: false`) and takes ready vectors;
//   their model and size are the element's (`GET /vectors/status`), so a stored vector and a question's vector are of one kind — the
//   same rule as the core's diary vectors (step 595-8b).
// - The graph: the graph element (LightRAG, no language model), in the memory's own space `memory` — the person's facts never mix with
//   the skills and studied products of the shared graph (step 596-1). Its port is asked of the node registry, never written as a number.
import { existsSync, readFileSync } from "node:fs"
import { isAbsolute, join, resolve } from "node:path"

export const ELEMENT_DIR = process.env.ELEMENT_DIR || process.cwd()

/** Where the memory keeps its own files (journal, label index, neighbours) — outside every build. */
export const DATA_DIR = (() => {
  const d = String(process.env.SERVICE_DATA_DIR || "").trim()
  return d && isAbsolute(d) ? d : join(ELEMENT_DIR, "data")
})()

/** The node's folder: an element lives at <node>/WEB4-ITEMS/<kind>/<id>; null outside a node (a bare clone). */
export const NODE_DIR = (() => {
  const up = resolve(ELEMENT_DIR, "..", "..", "..")
  return existsSync(join(up, "WEB4-ITEMS")) ? up : null
})()

/** The memory's space in the graph element (596-1); a probe may name its own. */
export const GRAPH_SPACE = String(process.env.MEMORY_GRAPH_SPACE || "memory").trim() || "memory"

/** Values of one env file; a missing file is an empty object; a BOM never breaks the first name. */
export function envFile(path) {
  const out = {}
  try {
    for (const line of readFileSync(path, "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith("#") || !t.includes("=")) continue
      const i = t.indexOf("=")
      out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    }
  } catch { /* no file — a legal state */ }
  return out
}

/** OpenAI key: the core's .env.local first, then this element's .env.local, then the process environment (law 336). */
export function openAiKey() {
  const files = [...(NODE_DIR ? [join(NODE_DIR, ".env.local")] : []), join(ELEMENT_DIR, ".env.local")]
  for (const f of files) {
    const key = envFile(f).OPENAI_API_KEY
    if (key) return key
  }
  return process.env.OPENAI_API_KEY || ""
}

/** The node registry: services[] with id, port, kind. Empty outside a node. */
export function registry() {
  if (!NODE_DIR) return { services: [] }
  try {
    const raw = readFileSync(join(NODE_DIR, "WEB4-ITEMS-REGISTRY", "web4-items.json"), "utf8").replace(/^﻿/, "")
    const r = JSON.parse(raw)
    return { ...r, services: Array.isArray(r.services) ? r.services : [] }
  } catch {
    return { services: [] }
  }
}

/** The port of an element of this node — from the registry, the node's own record of where each element stands. */
export function portOf(id) {
  const s = registry().services.find((e) => e.id === id)
  return Number(s?.port) > 0 ? Number(s.port) : null
}

const DATA_URL = () => process.env.REMOTE_DATA_URL || (portOf("data") ? `http://127.0.0.1:${portOf("data")}` : "")
const DATA_SECRET = () => process.env.DATA_SECRET || ""
const NODE_KEY = () => process.env.SETTINGS_SECRET || ""

async function json(url, init, ms) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) })
  const body = await r.json().catch(() => null)
  return { body, status: r.status }
}

// ── VECTORS ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

let vectorKind = null

/** The vector element's model and size, asked once per process. */
export async function vectorModel() {
  if (vectorKind) return vectorKind
  const r = await json(`${DATA_URL()}/vectors/status`, { headers: { "X-Data-Secret": DATA_SECRET() } }, 4000)
  if (r.status !== 200 || !r.body?.model || !r.body?.dims) throw new Error("the vector element did not name its model")
  vectorKind = { model: String(r.body.model), dims: Number(r.body.dims) }
  return vectorKind
}

/** Vectors of texts in the vector element's model and size. Throws a named reason: no key, refused key, OpenAI's words. */
export async function vectorsOf(texts) {
  const key = openAiKey()
  if (!key) throw new Error("no OpenAI key: save it on the node's screen")
  const { model, dims } = await vectorModel()
  const r = await json("https://api.openai.com/v1/embeddings", {
    body: JSON.stringify({ dimensions: dims, input: texts, model }),
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    method: "POST",
  }, 30000)
  if (r.status === 401) throw new Error("OpenAI refused the key (401): replace it on the node's screen")
  if (r.status !== 200) throw new Error(`embeddings answered ${r.status}: ${String(r.body?.error?.message ?? "").slice(0, 200)}`)
  return (r.body?.data ?? []).sort((a, b) => a.index - b.index).map((d) => d.embedding)
}

/** One vector, or null with the reason — callers keep going without it and say what failed. */
export async function vectorOf(text) {
  try {
    const [v] = await vectorsOf([String(text ?? "")])
    return Array.isArray(v) ? { ok: true, vector: v } : { ok: false, why: "no vector came back" }
  } catch (e) {
    return { ok: false, why: String(e?.message ?? e).slice(0, 240) }
  }
}

// ── GRAPH ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Call a door of the graph element in the memory's space; the answer read whole (200 with ok:false is a refusal too). */
export async function graphCall(door, body, ms = 200000) {
  const port = portOf("graph")
  if (!port) return { ok: false, error: "graph-unknown", why: "the graph element is not in this node's registry" }
  if (!NODE_KEY()) return { ok: false, error: "no-node-key", why: "SETTINGS_SECRET is not set for this element" }
  try {
    const r = await json(`http://127.0.0.1:${port}/api/${door}`, {
      body: JSON.stringify({ space: GRAPH_SPACE, ...body }),
      headers: { "Content-Type": "application/json", "X-Node-Key": NODE_KEY() },
      method: "POST",
    }, ms)
    if (r.status !== 200 || !r.body || r.body.ok === false) {
      return { ok: false, error: `graph-${r.status}`, why: String(r.body?.reason ?? r.body?.detail ?? r.body?.error ?? "").slice(0, 240) }
    }
    return { ok: true, body: r.body }
  } catch (e) {
    return { ok: false, error: "graph-unreachable", why: String(e?.message ?? e).slice(0, 240) }
  }
}

/** A document name of the memory → the graph's `file_path`: LightRAG keeps only the last segment of a path, so «/» becomes «:». */
export const graphPathOf = (docName) => String(docName ?? "").replace(/\//g, ":")
/** And back: the graph's `file_path` of a memory document → its document name (the key of its table row and vector). */
export const docNameOf = (graphPath) => String(graphPath ?? "").replace(/:/g, "/")

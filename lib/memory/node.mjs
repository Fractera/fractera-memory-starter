// THE NODE AROUND THE MEMORY (node step 596-2, 596-3). One place that knows where this element stands on a Fractera node and how it
// reaches the stores of the node's data layer; every other module of the memory asks here instead of keeping its own copy.
//
// - ELEMENT_DIR and SERVICE_DATA_DIR are absolute paths the node's installer writes into .env.local: a built Next server works from
//   inside its build, so a path counted from process.cwd() or from this file would live inside the build and die at the next rebuild
//   (node law 259-260).
// - The OpenAI key: the core's first, then this element's own (node law 336) — read at every call, so a key saved on the node's screen
//   works from the next call. It serves the thinking call when the node has one (597-2) and voice transcripts; it counts no vector
//   (626-6).
// - Vectors: the memory counts none (626-6). It sends TEXTS to the vector element of this node (`text` to store, `query` to search),
//   and the vector element counts them through the node's `embeddings` element (MiniLM-L12, 384 numbers, on this computer) — the
//   same rule as the core's diary (626-4). The memory asks `embeddings` itself one thing only: whether it counts at all, before the
//   thinking call of «remember» (`embeddingsUsable`).
// - The graph: the graph element (LightRAG, no language model), in the memory's own space `memory` — the person's facts never mix with
//   the skills and studied products of the shared graph (step 596-1). Its port is asked of the node registry, never written as a number.
//   The one call to the SHARED graph is a read: the node's skills base, for a request no service of the node handles (step 598-3).
import { existsSync, readFileSync } from "node:fs"
import { isAbsolute, join, resolve } from "node:path"
import { graphSpaceOf } from "./space.mjs"

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

const NODE_KEY = () => process.env.SETTINGS_SECRET || ""

async function json(url, init, ms) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) })
  const body = await r.json().catch(() => null)
  return { body, status: r.status }
}

// ── EMBEDDINGS ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The node's embeddings element: the installer's neighbour address first, the registry's port otherwise; empty — not on this node. */
const EMBEDDINGS_URL = () =>
  String(process.env.EMBEDDINGS_URL || "").trim().replace(/\/+$/, "") ||
  (portOf("embeddings") ? `http://127.0.0.1:${portOf("embeddings")}` : "")

/**
 * Whether the node's `embeddings` element can count vectors now (626-6): `{ usable: true, model, dims, status }` or
 * `{ usable: false, why }`. One local call (`GET /api/embed-status`, the node key) before the thinking call of «remember»: the facts
 * of that call go to the graph and the phrase to the vector store, both count through `embeddings`, and a model turn whose result can
 * land nowhere is the waste the owner named (2026-11-02, «бессмысленную работу»).
 * 🔒 A model still loading (`idle`, `loading`) is usable: its vector calls wait for the load, a few seconds after a start. Only a
 * failed load, a refused key or no answer at all refuse — a refusal of a node that is just starting would lose the facts of a phrase
 * sent in that minute for nothing.
 */
export async function embeddingsUsable() {
  const base = EMBEDDINGS_URL()
  if (!base) return { usable: false, why: "the node has no embeddings element (EMBEDDINGS_URL is empty, the registry names none)" }
  try {
    const r = await json(`${base}/api/embed-status`, { headers: { "X-Node-Key": NODE_KEY() } }, 4000)
    if (r.status !== 200 || !r.body?.status) return { usable: false, why: `embeddings answered ${r.status}` }
    if (r.body.status === "failed") return { usable: false, why: `the embeddings model did not load: ${String(r.body.error ?? "").slice(0, 200)}` }
    return { dims: Number(r.body.dims), model: String(r.body.model), status: String(r.body.status), usable: true }
  } catch (e) {
    return { usable: false, why: `embeddings did not answer: ${String(e?.cause?.code ?? e?.message ?? e).slice(0, 200)}` }
  }
}

// ── GRAPH ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Call a door of the graph element in the memory's space; the answer read whole (200 with ok:false is a refusal too).
 * `space: null` — the node's shared graph (598-3: a query of the skills base only; the memory never writes there). */
// 650-1: by default — the graph space of the call: `memory` for the main agent, `memory-<element>` for an element.
export async function graphCall(door, body, ms = 200000, { space = graphSpaceOf(GRAPH_SPACE) } = {}) {
  const port = portOf("graph")
  if (!port) return { ok: false, error: "graph-unknown", why: "the graph element is not in this node's registry" }
  if (!NODE_KEY()) return { ok: false, error: "no-node-key", why: "SETTINGS_SECRET is not set for this element" }
  if (!space && door !== "graph-query") return { ok: false, error: "shared-graph-read-only", why: "the memory only reads the node's shared graph" }
  try {
    const r = await json(`http://127.0.0.1:${port}/api/${door}`, {
      body: JSON.stringify(space ? { space, ...body } : body),
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

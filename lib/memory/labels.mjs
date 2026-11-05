// THE LABEL INDEX OF THE MEMORY'S GRAPH SPACE (node step 596-3).
//
// The former LightRAG server answered «which entity names contain this word» in 41–280 ms with no model (`/graph/label/search`), and
// `read.mjs` checks every name of a question THAT way before asking the graph: the graph cannot say «I don't know» — on any name it
// returns its nearest entities (measured 201-2, and again 596-1 on the node's shared graph). The node's graph element has no label
// search and runs Python for every call (~2 s), so the memory keeps the names it gave the graph itself: every entity it sent with a
// successful insert lands here, in `<SERVICE_DATA_DIR>/graph-labels.json`, outside git and every build.
// 🛑 It is an index of the graph, not knowledge: a name here that the graph no longer holds only makes the graph answer «nothing».
import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { DATA_DIR } from "./node.mjs"
import { fileTail, seesAll } from "./space.mjs"

// 650-1: у каждого пространства свой индекс — `graph-labels.json` у главного агента, `graph-labels--<id>.json` у элемента; кто видит все
// пространства, тот читает каждый файл. Имя, данное графу элемента, иначе «находилось» бы в вопросе другого элемента.
const fileOf = (tail = fileTail()) => join(DATA_DIR, `graph-labels${tail}.json`)
const FILES_RE = /^graph-labels(--[a-z0-9-]+)?\.json$/

function filesToRead() {
  if (!seesAll()) return [fileOf()]
  try {
    return readdirSync(DATA_DIR).filter((n) => FILES_RE.test(n)).map((n) => join(DATA_DIR, n))
  } catch {
    return [fileOf("")]
  }
}

function read(FILE = fileOf()) {
  try {
    const r = JSON.parse(readFileSync(FILE, "utf8").replace(/^﻿/, ""))
    return r && typeof r.labels === "object" ? r : { labels: {} }
  } catch {
    return { labels: {} }
  }
}

/** Add the names of one insert; written whole through a temporary file, so a crash never leaves half a file. */
export function addLabels(names, source) {
  const index = read()
  const at = new Date().toISOString()
  for (const name of names ?? []) {
    const n = String(name ?? "").trim()
    if (!n) continue
    const key = n.toLowerCase()
    const was = index.labels[key]
    index.labels[key] = { last: at, n: (was?.n ?? 0) + 1, name: was?.name ?? n, source: source ?? was?.source ?? null }
  }
  try {
    mkdirSync(DATA_DIR, { recursive: true })
    const FILE = fileOf()
    const tmp = `${FILE}.tmp`
    writeFileSync(tmp, JSON.stringify(index, null, 1), "utf8")
    renameSync(tmp, FILE)
  } catch { /* the index is a convenience: the insert itself already happened */ }
}

/** Names of the graph that contain the given word (case-insensitive), as the former label search answered: up to `limit`. */
export function labelsLike(word, limit = 5) {
  const w = String(word ?? "").trim().toLowerCase()
  if (!w) return []
  const out = []
  for (const file of filesToRead()) {
    for (const [key, v] of Object.entries(read(file).labels)) {
      if (key.includes(w) && !out.includes(v.name)) out.push(v.name)
      if (out.length >= limit) return out
    }
  }
  return out
}

/** How many names the index holds — for the state door. */
export function labelCount() {
  return filesToRead().reduce((n, file) => n + Object.keys(read(file).labels).length, 0)
}

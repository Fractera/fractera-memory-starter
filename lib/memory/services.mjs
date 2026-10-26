// WHO I AM AND WHO STANDS NEXT TO ME — ON A FRACTERA NODE (node step 596-2).
//
// On the former server the memory read its own description from `OWN-SERVICE-PROPS.json` (a type from the core) and its neighbours
// from the panel's service map, cached on disk. On a node there is no panel and the node itself is the record of its elements: the
// registry `<node>/WEB4-ITEMS-REGISTRY/web4-items.json` (ids, ports, addresses, what each provides). So:
// - I am `memory` — the element of the node's deep memory; my port is the one this process listens on;
// - my neighbours are the registry's elements, plus the two callers that are not elements: `build` (the node's main agent) and
//   `core` (the node's core) — the first segment of a caller's `from` path must be one of them;
// - read from disk at every call (one small file), so an element born or removed a minute ago is known without a restart, and
//   nothing is asked of another process when this one starts.
// 🛑 THREE STATES, NOT TWO, as before: neighbours known · the registry unreadable (said in words) · outside a node (a bare clone) —
// an empty list there means «I do not know», never «nobody is here».
import { NODE_DIR, registry } from "./node.mjs"

/** Me: the deep memory of this node. Planned port — the one the node gave this element. */
export const OWN_ID = "memory"
export const OWN_PROPS = {
  id: OWN_ID,
  auth: "node-key",
  api: "/v1",
  port: Number(process.env.PORT) || null,
  subdomain: null,
  topics: ["memory", "remember", "recall", "remind", "запомни", "напомни", "память"],
}
export const OWN_PROPS_ERROR = null

/** Callers that are not elements of the registry, yet speak to the memory: the node's main agent and its core. */
const NODE_CALLERS = [
  { id: "build", topics: [], note: "the main agent of the node" },
  { id: "core", topics: [], note: "the core of the node" },
]

function neighbours() {
  const services = registry().services
  return services
    .filter((s) => typeof s?.id === "string" && s.id && s.id !== OWN_ID)
    .map((s) => ({
      id: s.id,
      address: s.address ?? null,
      port: Number(s.port) || null,
      // the words that mean «this is about that element»: what it provides (`provides` of the registry)
      topics: Array.isArray(s.provides) ? s.provides.map(String) : [],
      manage: null,
      channels: null,
    }))
}

/** Whether the neighbours are known at all — false outside a node. */
export let NEIGHBOURS_KNOWN = Boolean(NODE_DIR)
export let NEIGHBOURS_STATE = NODE_DIR
  ? { age_s: 0, fresh: true, known: true, silent: 0, why: "read from the node registry" }
  : { age_s: null, fresh: false, known: false, silent: 0, why: "not on a node: the registry is not here" }

/** Every service I know of: me, the node's callers and the registry's elements — read live. */
export function services() {
  return [OWN_PROPS, ...NODE_CALLERS, ...neighbours()]
}

// `SERVICES` stays a live binding for the readers that iterate it (`elsewhere.mjs`): refreshed by `refreshNeighbours()` and at load.
export let SERVICES = services()

/** Read the registry again (it is a file on this machine: no network, no other process). */
export async function refreshNeighbours() {
  SERVICES = services()
  NEIGHBOURS_KNOWN = Boolean(NODE_DIR)
  return { ok: NEIGHBOURS_KNOWN, state: NEIGHBOURS_STATE }
}

/** In words: where the neighbours come from. */
export const neighboursWords = () =>
  NEIGHBOURS_KNOWN ? "соседи — из реестра узла" : "соседи неизвестны: память запущена не на узле"

/** The closed list of first segments of a caller's path. */
export function serviceIds() {
  return services().map((s) => s.id).filter((id) => typeof id === "string" && id.length > 0)
}

/** Whether the node knows such a caller — exact comparison, no case folding (the name goes into a column and a query). */
export function isKnownService(id) {
  return typeof id === "string" && serviceIds().includes(id)
}

/** The whole record of a service. */
export function serviceById(id) {
  return services().find((s) => s.id === id) ?? null
}

// 🪦 Каналы служб (`channels`, `CHANNEL_KINDS`) жили в описаниях служб прежнего сервера: у элементов узла их нет, и канал, которым
// пришла просьба, память больше не угадывает (596-2).
export const CHANNEL_KINDS = {}
export function channelsOf() {
  return {}
}
export function channelLink() {
  return null
}
export function channelOfService() {
  return null
}

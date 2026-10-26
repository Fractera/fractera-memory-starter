// @api the deep memory's contract: remember, recall, feedback and its addresses (health, contract, state, sources, journal, signals, objects)
import { handleV1 } from "@/lib/memory/door.mjs"

// 596-2: the contract of the memory at its former addresses (`/v1/*`), its own lock (the node key or the node's data secret; 404 through
// the tunnel) — `lib/memory/door.mjs`. `proxy.ts` lets `/v1` through first, the way the data element lets its door roots through.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const GET = handleV1
export const POST = handleV1
export const DELETE = handleV1

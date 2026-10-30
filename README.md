# Fractera Memory

The deep memory of a Fractera node. Say «remember» and it keeps what a person said — a phrase, a photo, a PDF, a voice note; ask
«remind me about» and it answers from what people told it, with the date, the source and how sure it is. It is a native element:
it stands on the node next to the data layer, serves the node's main agent and the node's elements, and is never reached from the
internet.

It is the memory the owner built on the former server line (steps 175–227 there), moved onto the node's native element template in
node step 596: the same contract — three verbs and one answer shape — over the node's own stores.

## Using the memory

**Where it stands.** Port — the node gives it (`npm run a2a -- card memory` of the core, or the registry); never write the number into
code. Turned off by default: the node's main agent turns it on for a memory task (`npm run element:power -- memory on` in the core) and
off after it.

**The lock.** A process of this node: the node key in `X-Node-Key` (every element's door) or the node's data secret in `X-Data-Secret`.
Through the Cloudflare tunnel every address answers 404, even with a key. `GET /v1/health` is open on the machine.

**The contract.** `GET /v1/contract` serves it, generated from the code (`lib/memory/contract.mjs`) — names, parameters, which are
required, the answer shape. Read it, do not rebuild a body from memory.

| Verb | What it is |
|---|---|
| `POST /v1/remember` | say something to memory: `text` and/or files (multipart: JSON in the part `payload`, files in the parts `files`) or `media: [{url}]` |
| `POST /v1/recall` | ask memory: a question in `text`, or nothing for everything known; `depth`: standard (built), deep · extreme (declared, not built) |
| `POST /v1/feedback` | comment on a previous answer, named by its `answer_id` (`about`) |

Addresses, not verbs: `GET /v1/state` (who and where I am) · `GET /v1/sources` (who has written to me) · `GET`/`DELETE /v1/journal` ·
`GET /v1/signals` (what people said about the answers) · `GET /v1/objects/{id}` and `/file` · `GET /v1/contract` · `GET /v1/health`.
`POST /v1` with only `text` — memory picks the verb itself and says how it read the words in the first line.

```js
// on the machine's loopback; the port and the node key from the node
const base = `http://127.0.0.1:${port}`
const headers = { 'content-type': 'application/json', 'X-Node-Key': process.env.SETTINGS_SECRET }
await fetch(`${base}/v1/remember`, { method: 'POST', headers, body: JSON.stringify({ text: 'the taxi from the airport cost 40 euro', from: ['build'] }) })
const answer = await fetch(`${base}/v1/recall`, { method: 'POST', headers, body: JSON.stringify({ text: 'how much was the taxi?', from: ['build'] }) }).then((r) => r.json())
// → { ok: true, text, objects, certainty, depth_used, answer_id, … }
```

`from` is the caller's path: the first segment is an element id of this node, `build` (the main agent) or `core`; an unknown first
segment refuses the call (`unknown-service`) and nothing is written.

**Where a phrase goes.** One parsing call of OpenAI `gpt-6-luna` (the node's OpenAI key — the core's first; without a key, Claude by the
owner's subscription, Sonnet; `MEMORY_THINK_MODEL` overrides; node step 597-2) finds
the facts. Then, all through the node's data layer:

| Store | What lands there | Element |
|---|---|---|
| relational | one table `messages_that_came_into_memory` — every incoming message and every answer | data (`POST /db/migrate`) |
| vector | the phrase in the collection `memory-said`, comments in `memory-feedback`, cards of things in the objects collection | vectors (through data); the memory counts the vectors itself — the element's model and size, the core's OpenAI key first |
| graph | a ready graph (the speaker, the subjects, short values, the place; the facts as links) in the space `memory` | graph (`/api/graph-insert`, `/api/graph-query`, node step 596-1) |
| objects | whole things with their full description | storage (through data `/media`) |

Text longer than 2 000 words is kept whole as a thing and not parsed. The names of the graph's entities are indexed in
`<SERVICE_DATA_DIR>/graph-labels.json`, the journal of the memory's work is `<SERVICE_DATA_DIR>/memory-log.md` — both outside git.

**A request no service of the node handles** («I need a selling headline for my landing page»). The same parsing call gives each request
its English search words (`terms`, `themes`); the memory then looks for a ready solution (the Fractera marketplace — a stub, nothing yet)
and for a skill to build one — **the node's skills base** (node step 598-3): the licensed skills of other projects every clone of the
node brings, loaded into the node's SHARED graph (marks `skill:<source>:<skill>`). The memory only reads that graph (`space` is left out;
it never writes there) with LightRAG's own threshold 0.5 — the one the core's `skills_find` uses — so a request far from every skill
finds nothing instead of its nearest neighbour. Found → the answer's `requests[]` holds `proposal: "build-with-skill"` with up to three
`skills` (skill, source, licence, section names) and the words «в базе навыков узла есть опыт других проектов: навык copywriting проекта
coreyhaines (лицензия MIT) — …»; nothing found → `create-microservice`; the graph did not answer → the words say the base could not be
asked. The memory proposes; building is the person's decision. The step of the journal: «реестр навыков: найдено N — <skills>».

**Things.** Audio — transcript by OpenAI `whisper-1` (the core's key), then described by the thinking model; image and PDF — sent whole
inside the request (`gpt-6-luna`; Claude reads them with its Read tool when there is no key); video —
frames and sound by ffmpeg when the machine has it (otherwise a named refusal `describe-ffmpeg-failed`); code and text — analysed, never
run. A loopback or private address in `media` is refused; a web page belongs in `links`.

## What it cannot do (on a node, today)

- Links: web pages and YouTube videos are not read on the node (no AI browser element; the YouTube reading did not move) — every link
  gets `links-not-built-on-node`, the phrase is kept as usual.
- The graph cannot forget yet: the node's graph element deletes nothing, so a rolled-back thing may leave its graph document.
- `depth: deep` and `extreme` are declared and not built; the answer always names the depth it reached.
- Routing a request to another element by its words is weak on a node: the registry offers only what each element `provides`.
- No stands of the former line (memory, vector, graph, object, link benches), no own Telegram bot, no own key screens: the node's core
  gives every element its terminal, agent and keys.

## How to extend

The logic lives once, in `lib/memory/` (verbs, parsing, reading, the stores) and `lib/memory/node.mjs` (where the node and its stores
are). A new verb is a new entry of `METHODS` in `lib/memory/contract.mjs` plus its function in `RUN` of `lib/memory/door.mjs`. Changing
the embedding model means re-counting every stored vector — the owner's decision.

## The contract a replacement must keep

- `OWN-SERVICE-PROPS/` — the passport, the element's main door (`GET /api/own-service-props`); `NODE-CONTRACT.json` — what the node needs to install it.
- The port comes from the `PORT` environment variable.
- `GET /api/health` answers 200 without a session.
- Sign-in only through the node's auth element; stored data only through the node's data element.
- Public pages stay static.

A repository that does not keep this contract is refused; the node does not bend to it.

## Proven by

Node steps 596-2 … 596-5, 597-2, 597-3, 598-3 of the federal development layer (2026-10-26); their records stayed with that layer, which
the node no longer uses.

License: MIT.

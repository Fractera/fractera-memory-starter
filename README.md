# Fractera Memory

**A self-hosted, open-source memory engine for agents.** Knowledge graph built on write and read
without a model turn · spatial-temporal scope with `lat`/`lon` validated and stored on every record ·
native multimodal input — voice, images, video, PDF, pages, links — with its own object store · one
short model call per request over a feature registry, after which code and the stores do the rest.

> **How to read this document.** The engine is described whole, so it is clear what it does and how it
> is built. Anything not yet in the code says so on the spot, in **bold, in the same paragraph** — and
> the section "How a request travels" carries the full list of what exists today and what remains.
> Nothing here is promised without that mark.

Built to act as the architect's personal command centre — through a Telegram bot, a web chat or
anything else that speaks HTTP — it closes the gap between a volatile context window and real
cognitive continuity. Every request costs **one short model call** that names what the person means;
the table and the graph then answer without further model turns. Measured on a live server on
2026-09-15: **5–17 s per question**.

It ships **with its own web console** — passport, API reference with key generation, a live
playground, the work journal and settings — wired up and working from the first minute. The console
is a microservice of its own: use it, or ignore it and drive the engine head-first through the REST
API. Your server. Your data. No per-request fees to anyone.

---

## Read this first if you are comparing systems

Three capabilities are usually the ones a comparison marks as missing. In this engine they are core,
not add-ons:

### 1. Multimodality is native, not a preprocessor you bolt on

Hand memory a whole thing — as a form upload to `keep_object`, by URL, or as `media` next to a phrase — and it
describes the thing itself and keeps it in four places at once, or in none:

| Kind | What happens inside |
|---|---|
| `audio` | speech-to-text by OpenAI whisper-1 with a timestamp on every segment; the description is written from the transcript |
| `image` | read by Claude with vision: every element, its position, colours and all visible text become the full description |
| `video` | ffmpeg extracts the sound track and six frames; the track is transcribed, the frames are read on one timeline |
| `pdf` | read whole by Claude: structure, headings, content, tables row by row |
| `markdown`, `html`, `text` | read by Claude; HTML is shown as a sandboxed page and as its source |
| source code | analysed, not rewritten — what it does, what it exports and imports; stored as text, never executed |
| a link | the page is opened by a real browser (the AI-browser service); **description and structure** are kept — headings, interactive elements, media by attribute, a snippet. The final HTML is never stored |
| a YouTube video | read by the official API: title, data, the author's own chapters — which is what answers «at what minute was this said» — thumbnail and the start of the description |

The file with its full description goes to the **object store**; the summary goes to a table row and a **vector**
search card; the full description with its origin — source, author, date — goes to the **knowledge graph**. Find it
by meaning with `find_objects`, open it with `open_object`, fetch the bytes with `GET /v1/objects/{id}/file`.
Web pages are not files: a URL that answers `text/html` is refused, and pages are the job of a browser.

### 2. Geolocation is a first-class dimension, not a text tag

A scope entry carries coordinates, not just a place name:

```json
"scope": [
  { "at": "2026-09-11", "place": "Madrid", "lat": 40.4168, "lon": -3.7038, "radius_m": 500 },
  { "place": "London" }
]
```

Coordinates are validated as a pair and against the bounds of the planet — a lone latitude is half a
point, and 200 degrees of longitude is a typo that would otherwise become knowledge. They are stored
with the record and indexed. **An empty scope means «I do not know where and when» — never
«everywhere, always».**

**In development, and not to be counted on today:** retrieval by radius («what do I know within 500 m
of this point») and totals and life cycles grouped by scope. Today the coordinates of a question are
accepted and reported back in `params`, and reading does not use them; a sum is computed over all rows
of a feature, with no scope. See notes \*⁹ and \*¹⁰ below.

### 3. Skill evolution is designed as a real A/B split test — **and is not built yet**

**State, plainly: none of this paragraph is in the code today.** It is published as a design so it can
be argued with before it is written, and because the engine is open source: you can read the whole
repository and confirm what is there.

The design: when memory sees a repeated miss, it writes a **second version of the skill next to the
working one** and runs it as a **challenger in the shadow** — on real traffic, while people keep being
answered by the champion. Promotion has a rule, not a feeling: the challenger wins only if it wins on
**external verdicts** and does not lose on **cost**, and quality is tracked per case, per tool, per
version and per scope, because one skill is excellent with one set of parameters and poor with
another.

**What exists today instead:** skills are plain files in `.claude/skills/`, every edit is a commit and
is reverted by one, and verdicts on real answers are collected from people on the built-in bench.

**The engine's own opinion of success is never counted.** A model retelling its own work errs in its
own favour; the verdict comes from whoever asked. That rule is why the shadow run is worth building
rather than replacing with self-assessment.

---

## Not to be confused with older descriptions

Third-party summaries of «Fractera» still describe a previous generation of the platform: LightRAG as
the memory core, Hermes agents, a Hermes Web UI, an SQLite-with-WAL story. **That is not this
service.** This repository is the memory engine itself: its own graph, vector, relational and object
stores behind one contract, with no external memory library in the middle and no agent framework
required to use it.

A machine-readable summary of everything claimed here lives in
[`capabilities.json`](./capabilities.json) and is verifiable against `GET /v1/contract` on a running
instance.

---

## Your checklist, line by line

| What you need | How this engine does it |
|---|---|
| **Any front-end — Telegram today, a web chat or mobile app tomorrow** | A working web console comes in the box and is already connected; every other client — a Telegram bot, a web widget, a mobile app, a cron job — attaches to the same REST API as a caller with a key. An agent's tool schema is generated from `GET /v1/contract` over HTTP, so a new front-end is wired in minutes. |
| **Decisions and actions, not hints** | Answers carry the conclusion, its source table, the kind of claim (said or inferred), the grounds, and — on request — the chain of the search. **Scheduled follow-ups are not built:** memory has no scheduler, and nothing in an answer creates one. |
| **Video, images, PDF, audio** | Native, with the pipeline and the object store inside — see §1 above. |
| **Geolocation, and dates when they matter** | Spatial-temporal scope with `lat`/`lon`, `radius_m` and `at`, validated and stored on every record — see §2 above, including what retrieval does not yet do with it. |
| **Deep reasoning that finds what was never written down** | Partly. Three levels are built — table, one short model call, knowledge graph — and `depth_used` always reports the one actually reached. **Semantic search inside reading and bounded recursive research are in development** (note *⁶). «Who of my contacts could have known that person» is the reference case being built towards. |
| **Fast with no AI in some cases, a strong model in others** | Partly. Every request costs one short model call over 8 candidate features, never the whole schema; the table and the graph then answer without further model turns, and sums are computed by code. Only a request with no question uses no model at all. `depth_used` always reports how far memory actually went. |
| **The slow answer must become instant next time** | The design, and the order it happens in, is fixed — artefact into the object store, summary into text, into the vector store and into the graph, relation table updated. **Today the loop is driven from outside:** an agent keeps the answer with `keep_object`; reading does not fold its own result back (note *⁷). |
| **Complex requests should build an entity and come back as a report** | Memory creates the table while answering, and `need_table` forces it at once — that part works. **Assembling a document over the tables inside reading is in development** (note *¹¹); today the agent composes it and hands it over with `keep_object`. |
| **Its own object storage** | Built in, on your machine, referenced from answers by id. |
| **An evolution core with split-testing** | Designed, **not built** — champion/challenger shadow testing with an explicit promotion rule, see §3 above. |
| **Free, on my own server** | Self-hosted on your VPS, deployed by the installer robot. No metered API in the middle; nothing leaves the machine. |
| **A knowledge graph updated on write, nearly free on read** | Exactly the design: entities and links are built as facts arrive, and on read the graph is queried in context mode — **no model turn** — so the cheap path stays cheap. |
| **Open source, modifiable by hand** | This repository is the whole service: contract, verbs, stores, pages. Every design decision is written down next to the code that implements it. |

**What comes with it, and what stays yours.** The console ships connected: you sign in and you are
already talking to memory, generating keys, reading the journal, watching what each call cost. What
stays yours is the **product** front-end — the Telegram bot, the web chat, the mobile app your users
actually touch. The engine does not impose one, and it does not need one: the console is a separate
microservice, and the engine runs perfectly well with it switched off.

---

## Install

The **Fractera installer robot** deploys it onto your server: creates the service, gives it its port
and its place behind nginx, wires it into the machine's secret store, issues certificates, starts it
under the process manager. Minutes after you order a server you have a running memory engine with its
own pages, its own contract and its own key.

That is the whole of it: one run of the robot brings up every microservice of the platform, memory
included. There is nothing to assemble by hand and no command on this page to copy — a command
printed in a readme lives its own life and goes stale silently.

## Quick start

```bash
export MEMORY_KEY=fmk_…                       # generated on the service's API page
export MEM=https://memory.<your-domain>/v1

# tell it something a person said, in their own words
curl -s $MEM/remember -H "Content-Type: application/json" -H "x-memory-key: $MEMORY_KEY" \
  -d '{ "who": "roman", "text": "my name is Roman and I live in Madrid", "lang": "en" }'

# ask what it knows — no question means everything, and no model is called
curl -s $MEM/recall -H "Content-Type: application/json" -H "x-memory-key: $MEMORY_KEY" \
  -d '{ "who": "roman", "lang": "en" }'
```

No schema to design, no migration to run, no table to declare.

---

# API

Every method is declared in `contract.mjs` and served live at `GET /v1/contract`. The documentation
page inside the service generates itself from that same object, so it never drifts from what the
server accepts.

## Transport and authentication

```
POST https://memory.<your-domain>/v1/<verb>
Content-Type: application/json
x-memory-key: fmk_…            # or:  Authorization: Bearer fmk_…
```

One key covers reading and writing. It is shown once, stored at `/etc/fractera/memory-api-key` with
mode `0600`, compared in constant time. **Generating a new key revokes the previous one instantly.**
Calls without a valid key get `401 no-access`.

**Read the body, not the status code.** Memory answers `200` with `ok:false` for refusals it
understands and names; a non-200 status means the call never reached the verb.

## `POST /v1/remember`

| parameter | type | required | meaning |
|---|---|---|---|
| `who` | string | yes | Whose facts these are: a stable key for the person. |
| `text` | string | yes | The phrase as it was said, without paraphrasing. |
| `lang` | string | no | Language of the words meant for a person. |
| `scope` | array | no | Spatial-temporal scope: `{at, place, lat, lon, radius_m}` entries. |
| `media` | array | no | Attachments: `{url}` file addresses. Each goes the same way as `keep_object`; memory decides the kind. |
| `thread` | string | no | Continue an earlier line of reasoning. |
| `deny` | string | no | Overturn an earlier conclusion. |
| `need_table` | boolean | no | Make what is recorded its own table at once. |

Returns `what_happened` (words you can say straight to a person), `noted` (what was written down,
with `from_table` and `claim`), `params` (the fate of every optional parameter), `objects` (the fate of every
attachment) and `thread`.
On a contradiction: *«was X, now Y»* — the latest wins, out loud, with the previous value kept.

## `POST /v1/recall`

| parameter | type | required | meaning |
|---|---|---|---|
| `who` | string | yes | Who is being asked about. |
| `text` | string | no | The question in a human sentence; without it everything known comes back. |
| `lang` | string | no | Language of the words meant for a person. |
| `depth` | string | no | `standard` · `deep` · `extreme`. **Reading stops at the knowledge graph today**; `depth_used` reports the level actually reached (note \*⁶). |
| `history` | string | no | The previous conversation, when the caller has one. |
| `prior` | string | no | What has already been found before this question. |
| `want_chain` | boolean | no | Return the steps of the search. |
| `features` | array | no | Feature keys the question is about, from `GET /v1/features` — sending them skips the model call. An unknown key is refused with the nearest keys memory does have. |
| `scope` | array | no | Where and when the question is asked. Accepted, validated and reported back; **retrieval does not use the coordinates yet** (note *⁹). |

Returns `known` (each value with `from_table`, `claim`, `basis`), `not_yet_known`, `used_model`,
`depth_asked` / `depth_used`, `used_input`, `chain` and `params`.

## `POST /v1/keep_object`

A multipart form with the file in the `file` part — or JSON with `url`, and memory downloads the file itself.

| parameter | type | required | meaning |
|---|---|---|---|
| `file` | binary | file or url | The file itself, in multipart/form-data. |
| `url` | string | file or url | An http(s) file address, JSON body, up to 200 MB. Addresses inside the machine or a private network → `url-forbidden`; `text/html` → `is-a-page`. |
| `source` | string | no | Where it came from: `api` · `telegram` · …; default `api`. |
| `author` | string | no | Who sent it, in words; default `who`. |
| `who` | string | no | The person the object belongs to. |
| `title`, `summary`, `full` | string | no | Your own description; with `summary` no model is called. |
| `tags`, `anchors` | JSON array | no | Tags; graph anchors (people, places, products). |

Returns `messageId` (the row linking all four stores), `object` (id, name, size), `title`, `summary`, `kind`,
`described` and `ms`.

## `POST /v1/find_objects` and `POST /v1/open_object`

`find_objects { question }` searches by meaning with one embedding and no model turn; every result carries `id`,
`title`, `summary`, `kind`, `messageId` and `score`. `open_object { id, from? }` returns the card, the text in
parts for textual kinds, and `file` — the address to fetch the bytes from.

## Other endpoints

```
POST /v1/people           who memory knows at all
POST /v1/journal          memory's own account of its work, in plain text
POST /v1/forget_journal   erase that account; knowledge about people is untouched
GET  /v1/tables           names of everything memory keeps about a person
GET  /v1/tables/{name}    the description of one table
GET  /v1/objects/{id}/file  an object's file: the stored bytes with their type and name
GET  /v1/health           open, no key: liveness, contract version, name-quality figure
GET  /v1/contract         the machine-readable contract
```

## Multimodal and geospatial examples

```bash
# a voice message with the place it was recorded in
curl -s $MEM/remember -H "Content-Type: application/json" -H "x-memory-key: $MEMORY_KEY" \
  -d '{ "who": "roman",
        "text": "voice note from the trip",
        "media": [{ "url": "https://…/note.oga" }],
        "scope": [{ "at": "2026-09-11", "lat": 40.4168, "lon": -3.7038, "radius_m": 300 }] }'

# a contract as PDF next to a phrase: read whole, described, kept in four stores
curl -s $MEM/remember -H "Content-Type: application/json" -H "x-memory-key: $MEMORY_KEY" \
  -d '{ "who": "roman", "text": "this is the lease for the flat",
        "media": [{ "url": "https://…/lease.pdf" }] }'

# what do I know near this point
curl -s $MEM/recall -H "Content-Type: application/json" -H "x-memory-key: $MEMORY_KEY" \
  -d '{ "who": "roman", "text": "what did I spend here",
        "scope": [{ "lat": 40.4168, "lon": -3.7038, "radius_m": 1000 }] }'

# something nobody ever wrote down — allow the expensive path, ask for the chain
curl -s $MEM/recall -H "Content-Type: application/json" -H "x-memory-key: $MEMORY_KEY" \
  -d '{ "who": "roman", "text": "who of my contacts could have known the president",
        "depth": "extreme", "want_chain": true }'
```

---

# How it works

## How a request travels

Described as finished, so it is clear what memory does and how to build it. What is still in
development is marked with an asterisk and explained in the notes below.

1. **Input: what the caller sent**
   1. Required: who is speaking (`who`) and the person's phrase (`text`).
   2. The verb — optional.
      1. With a verb, the request comes to `/v1/remember` (add) or `/v1/recall` (retrieve).
      2. Without one, it comes to a single address and memory decides itself\*¹.
   3. Features from the registry — optional, for both verbs.
      1. A list of key and value; keys come from `GET /v1/features`.
      2. Retrieval accepts them as well as writing\*².
   4. Links to earlier messages — optional.
      1. The caller names earlier messages by their numbers in memory's journal\*³.
      2. Or sends a reasoning thread (`thread`), earlier turns (`history`) and what was already found (`prior`).
2. **Preliminary phase: memory works out what was not sent**
   1. The verb, the features and the links were all sent — no model is called at all.
   2. Something is missing — **one** model call covers everything missing at once, with no conversation kept\*⁴.
      1. The model receives the phrase and candidates: the 8 registry features closest in meaning, and this person's latest messages closest in meaning and time\*³.
      2. It returns the verb, the features with values, the numbers of related messages, and what the registry lacks.
      3. Code checks all of it: the verb is one of two; every key is among the candidates and every value has the right type; the message numbers exist and belong to this person.
   3. A meaning the registry does not have yet.
      1. An existing kind that fits the meaning is reused — records stay different from each other\*⁴.
      2. Nothing fits — memory creates a new kind by the column-or-table rules: a column for a single value, a table when a second value is added or the thing will grow.
      3. The registry catches up: a kind without a feature is work for the development agent, who adds the feature in a step\*⁵.
3. **Main phase: two scenarios and the learning loop**
   1. **Adding a record — in order**
      1. **Receiving the message.** It gets a number in the journal of incoming messages (`messages_that_came_into_memory`) — a phrase, a file, a link or a video — with who sent it, from where and when\*⁸. Its scope is recorded alongside: the calendar (when the thing happened, not when it arrived) and the geotag (latitude, longitude, radius, place), each with its source — said, from the file, from the device, inferred; an empty scope means «I don't know where or when»\*⁹. A link to earlier messages is recorded as «this message → that message»\*³.
      2. **Attachments become objects — all four records, or none.** Reading goes by kind (audio — `whisper-1` then a description; video — sound track and six frames; image, PDF, Markdown, HTML, text — read whole; source code — analysed, never run; a page — the AI browser; a YouTube video — the official API) → a full description, a ~50-word summary, title, tags, anchors. Record 1: the object with its full description → object store, id. Record 2: a search card (title + summary) → vector store, `memory-objects`. Record 3: a graph document with description, tags, id, summary and an origin line. Record 4: the journal row links the three; any failure rolls back what was written, and the row stays `failed` with the reason.
      3. **Values about the person — tables.** First, what is already known. The kind and form come from the registry and its 8 candidates\*⁴; an existing kind is reused letter for letter\*⁵. Every value is said or inferred with grounds. The depth rule: depth 0 and 1 may go to a table, depth 2+ only to the graph with an anchor; the year of birth, not the age. **A column:** the kind exists without a value — the value goes in; no such kind — the root table gains three columns (value, said-or-inferred, grounds), named by a phrase of at least four English words. **A second value:** a correction replaces it, the old one goes to history; an addition gives birth to a table for the kind, the first value moves in with its own time and the column is left empty on purpose; unclear — both kept as an addition, said aloud. **A table at once:** when what arrived will keep growing (a friend is a name; a teammate has a role and tomorrow a schedule) or on `need_table`; raising the form loses nothing, lowering it always loses. Exact and countable values accumulate within their scope\*¹⁰.
      4. **The knowledge graph — everything said.** An introduction with the person's name, channel, first-level anchors and feature keys, no service words · pointers to table rows · what stayed only in the graph, each with its reason · a record without an anchor is refused.
      5. **The result** goes into the answer and memory's work journal: what landed where, what was refused and why, whether a model was called.
   2. **Retrieving from memory**
      1. Related messages narrow the search: their anchors and features join the question\*³.
      2. A named feature is answered from the table; sums are computed by code.
      3. Nothing in the table — names from the question are looked up in the graph, which answers about the links with no model call.
      4. `depth: "deep"` — semantic search in the vector store, when the words of the question and of the record differ\*⁶.
      5. `depth: "extreme"` — bounded research of up to 10 minutes: hypotheses from the graph, the vectors and the model's knowledge of the world; the result and its chain are kept as an object, so a repeated question is answered from the cheap steps\*⁶\*⁷.
      6. Nothing found — «I don't know», with what is missing.
      7. A request with no question returns everything known about the person, with no model.
   3. **The learning loop — an expensive result becomes cheap knowledge**
      1. When: after deep research\*⁶, and after a computation over tables whose answer is a document\*¹¹.
      2. One order: result obtained → artefact to the object store, id → a text summary → summary to the vector store, id → summary to the graph, id → the entity's link table, if one exists (last, may be skipped) → the summary and id go out, and a repeated question is answered cheaply\*⁷.
      3. Denial of a conclusion (`deny`) is a separate input: an extra loop extends the earlier summary with «the architect rejected this»\*¹²; the conclusion is cancelled, not the fact; the refuted hypothesis is kept.
      4. Patterns the model works out become skill candidates, tested in the shadow against the current skill.
4. **Final phase: the answer**
   1. For both: `ok`, `what_happened`, `text`, `objects`; which verb was executed and who decided it\*¹; the fate of every feature; which messages the request is linked to\*³.
   2. For a write: `kept_whole`, `used_model`, `thread`.
   3. For a read: `found_by`, `depth_used`, `not_yet_known`, the chain on `want_chain`.

**\* In development — what exists today and what remains to build**

- **\*¹ A request without a verb.** Today the verb is set only by the address; the parse returns an `action` field that routes nothing. To build: a single address in the contract, routing by `action`, an answer field naming the verb and who decided.
- **\*² Features on retrieval — built.** `recall` accepts `features`, the model call is skipped when they are sent, and an unknown key comes back with the nearest keys memory does have. The mark stays here so the change is visible against the previous edition of this list.
- **\*³ Links to messages.** Today the journal can link one message to another, but only saving a link uses it (a snippet to its page); `thread`, `history` and `prior` do not point at stored messages. To build: message numbers in the contract, candidates by meaning and time, links for every phrase, their use when reading.
- **\*⁴ One call for all three determinations.** Today the call determines only features, in two ways: writing shows the model every registry kind, reading shows 8 candidates. To build: one shared parse for both verbs.
- **\*⁵ The registry catches up.** Today kinds without a feature are visible only to a probe; 27 kinds created by the model wait for their features. To build: the list on the panel page and features added by development steps.
- **\*⁶ Depth `deep` and `extreme`.** Today both are declared in the contract, and reading stops at the graph. To build: vectors inside reading and bounded research with its chain.
- **\*⁷ Keeping an expensive answer.** Today the agent can keep an answer object (`keep_object`); reading does not keep its own result. To build: the result of `extreme` kept as an object, a vector card and a graph document.
- **\*⁸ A journal row for every message.** Today only files and links get a row in `messages_that_came_into_memory`; a plain phrase goes only to the work journal. To build: a journal row for every phrase, as the first record.
- **\*⁹ The scope of a phrase and search by place.** Today scope columns and a coordinate index exist on an object's row; a phrase's scope goes only into the model prompt, and reading never uses coordinates. To build: scope in every phrase's row and radius search when reading.
- **\*¹⁰ Accumulation within scope.** Today a sum is computed over all rows of a feature, with no scope. To build: sums and histories grouped by scope.
- **\*¹¹ The learning loop after a computation.** Today only the agent can keep an answer object; reading does not assemble a document over tables or run the loop.
- **\*¹² Denial of a conclusion.** Today `deny` works only inside the same reasoning thread, as words in the model prompt; the summary is not extended and the refuted hypothesis is not kept separately.

## Four stores, one black box

Relational for values, **vector** for meaning, **knowledge graph** for connections, **object store**
for binaries. The caller never learns which of them answered: the answer names its source table, and
that is the only thing about storage that travels out. Deciding where to look stays the engine's job —
that is what keeps it a black box rather than a database under a thin cover.

## Schema that grows by itself

*«my friends Dima and Misha»* → a column and two rows. *«in the team Julia is the product manager,
Dima is the manager»* → a team table. The second value of a kind promotes a column into its own
table, carrying the first value with its origin, its claim kind and **its own timestamp** — so the
engine never reports that it learned about Misha today. Names are built through a whitelist and a
transliteration table, because a name born from a model ends up inside SQL.

## Claims and grounds

Every value carries its kind: `said` — the person stated it; `guess` — the engine inferred it, and an
inference is stored **only with its basis**, because a guess without its grounds becomes
indistinguishable from testimony within a week.

## Knowledge becomes an object, not a paragraph

Asked to summarise complex data — last month's spending, a project's state — the engine does not hand
back a wall of text. It builds the thing you asked for:

1. **Instantiates a structured entity**: a typed table with the columns the answer needs.
2. **Compiles, sorts and formats a clean Markdown artifact**, assigned its own **Object ID**.
3. **Returns a short executive summary next to the artifact**, so the answer reads well and the
   detail stays referenceable.

**Where this stands.** The object side is built: any caller — an agent included — composes the document
and hands it over with `keep_object`, and it comes back by id with its file, description and summary,
findable by meaning. **Assembling the document over the tables inside `recall` is in development**
(note \*¹¹): today reading does not build the report by itself.

## Threads of reasoning — and why continuing one is cheaper

Every answer in which the engine thought carries `thread`; send it back and the same chain continues,
with the model seeing its own earlier conclusion.

| Turn | cache created | cache read | cost |
|---|---|---|---|
| first — the thread is born | 6362 | 8204 | `0.0289` |
| second — `thread` sent back | 843 | 15305 | `0.0065` |
| third | — | 16148 | `0.0036` |

Continuing a thread is **eight times cheaper** than restating context in a fresh call.

This is what makes `deny` meaningful: overturning a conclusion only matters if you can return to the
reasoning that produced it. The conclusion is withdrawn, the grounds are kept, and the refuted
hypothesis stays on record so the same search does not reproduce it tomorrow.

## The memoization loop: the slow answer becomes the fast one

The design rule is that nothing expensive is paid for twice:

1. An expensive computation or research loop runs at the deep levels.
2. An artifact is created with its ID, alongside a concise conclusion.
3. The conclusion is indexed into the vector store, the knowledge graph and the tables.
4. The repeat question is then answered from the cheap levels.

A computed table and the output of deep research are the same case, not two.

**Where this stands. The loop is not automatic yet** (note \*⁷). Today it is driven from outside: a
caller keeps the result with `keep_object`, and what is kept is found by meaning afterwards. Reading
does not fold its own result back, and there is no answer cache — a repeated question costs the same
one short model call as the first one did.

## The evolution core: skills that improve themselves under A/B testing — **the design, not yet the code**

**State first, so nothing here is mistaken for a feature: this section describes what is being built,
and none of it runs today.** What exists now: skills are files in `.claude/skills/`, each edit is a
commit that can be reverted, and verdicts on real answers are collected from people on the built-in
bench — the corpus the comparison will need.

The design. After every cycle the engine records the facts of the run: how deep it went, how many model
turns, how many seconds, what kind of answer came out, which skills and tools were called. These are
data, not impressions.

When it detects a repeated miss, it writes a **second version of the skill next to the working one**
and runs it as a **challenger in the shadow** — on real traffic, while people keep being answered by
the **champion**. Three rules hold it together:

- **No self-evaluation.** The verdict comes from whoever asked — a human or the calling model. A
  model retelling its own work errs in its own favour, and the design refuses to rely on that.
- **Deterministic promotion.** A challenger becomes champion only when it wins on external quality
  and regresses on neither speed nor cost — measured per case, per tool, per version and per scope.
- **Versioning and safe rollback.** Every modification is a commit, and one click returns the
  instructions to the baseline version without touching the accumulated data.

## Everything it did is written down

The journal records every call — what came in, what the model returned, what was decided, **what was
dropped and why**, what went out, how long it took. A human reads it on the Journal page; an agent
reads the same document as a file.

## The console that comes with it

The engine ships with its own web interface, already wired up and protected by role-based sign-in.
It is not a demo page: it is how you operate the memory day to day.

| Screen | What it is for |
|---|---|
| **Passport** | the full design of the engine, read from disk on every request — edit the document, reload, see it |
| **API** | this reference, generated from the live contract, with the **Generate access key** button |
| **Memory test** | talk to memory with nothing in between, over the public `/v1/*` path, and see the raw answer with its timing |
| **Graph test · Vector test · Object test · Link test** | each store probed on its own — otherwise you measure the black box as a whole and cannot say which part answered |
| **Journal** | what memory did: what arrived, what was decided, what was dropped and why |
| **OpenAI subscription · Settings** | keys and switches of the service itself |
| **Terminal · Build workshop** | a live shell on the server, and Claude Code opened in the service folder with its steps, skills and instruction |

**What the playground is for**, in three lines: execute direct API requests against the memory core
with no front-end abstraction in the way; inspect raw JSON payloads, execution timings and exact
model token usage; verify the request body before committing a line of client code.

**The playground deserves its own paragraph.** Its controls mirror the API one to one — depth in
plain words, conversation history, previous findings, the reasoning thread with a button that lifts
the identifier from the last answer, the denial field, scope as cards with *«add an entry»*, the
demand for a table, uploads for everything that is not text. Above the send button it shows **the
exact request body about to leave**: the single panel that answers the question every integration
eventually asks — did the service ignore my parameter, or did my client never send it?

**And all of it is optional.** The console is a microservice beside the engine, not a layer in front
of it: nothing in the API path depends on it, and an installation that never opens a browser behaves
identically.

## How it compares

Two comparisons: one against the categories of memory tooling, one against a ready-made assistant
built on a different philosophy.

| Capability | **Fractera Memory** | Standard RAG frameworks | MemGPT / Letta | Mem0 / Zep |
|---|---|---|---|---|
| Storage architecture | Hybrid: graph + vector + relational + object store | Vector DB only | Relational / text files | Vector plus a basic graph |
| Zero-token reads | Only a request with no question; every other read costs one short model call | No | No | Partial |
| Native multimodality | Built in: audio, video, PDF, images | Requires external parsers | Requires external parsers | Text focused |
| Spatial proximity indexing | lat/lon and radius_m validated and stored on every record; radius search in development | Text matching only | Function calling only | Basic metadata |
| Skill evolution | Champion / challenger A/B testing (designed and published, in development) | None | Manual prompt edits | None |
| Self-hosted / open source | 100% on-premise, single node | Varies | Yes | Freemium / cloud |

| Feature | **Fractera Memory** | IVA Agent (`smixs/iva-agent`) |
|---|---|---|
| System classification | An autonomous memory engine behind an API, for any front-end | An end-to-end Telegram assistant tied to an Obsidian vault |
| Architecture | A decoupled microservice; the Telegram bot is an optional client | A monolith: Telegram, userbot and vault manager in one codebase |
| Cost optimisation | One short model call over 8 registry candidates, never the whole schema; the table and the graph answer without further model turns | Every operation leans on model passes, BM25 and vector lookups |
| Multimodality | Built-in object storage; audio transcribed with timestamps; images, PDF, pages, code and video frames read by a vision model | Audio transcription and plain text handling |
| Geolocation | lat/lon and radius_m as structured fields of every record; proximity search in development | None; dates and places are unstructured text |
| Data processing | Dynamic SQL tables, structured artifacts with IDs, knowledge graph | Markdown cards written to a folder for Obsidian to sync |
| System evolution | Shadow A/B testing with external verdicts (designed, in development); today skills are files and every edit is a revertible commit | None; execution logic is fixed in prompt files |
| Integrations | Many front-ends at once over one REST API | Bound to one Telegram account and an Obsidian setup |

## Boundaries that are design, not gaps

- **You never query a table directly.** Source names travel out in the answer and are not accepted in
  the question.
- **No history of your requests is kept.** Each call is a closed cycle; continuity is explicit,
  through the reasoning thread.
- **Facts about third parties are reported, not filed against the wrong person.**
- **Relations between two people are graph edges, not row fields** — a relation has a source and a
  target, and a column would lose one of them.
- **Nothing is promoted quietly.** An inference is stored only with its grounds; an empty scope stays
  empty.

---

## Questions and answers

**Does every request cost tokens?**
Almost every one — and exactly one short call. To understand what a person means, memory makes one
model call over 8 candidate features from its registry, with no conversation kept. After that the
table and the graph answer without further model turns, and sums are computed by code. Only a request
with no question is answered with no model at all. The answer reports `depth_used`, the depth actually
reached.

**Can it answer questions about a place by coordinates, not by a word?**
It accepts them; it does not yet search by them. A scope entry carries `lat`, `lon` and an optional
`radius_m`; the pair is validated against the bounds of the planet, stored with the record and
indexed. **Retrieval by radius — «what do I know within 500 metres of this point» — is in development**
(note \*⁹), and until it lands the coordinates of a question are reported back in `params` and not used
for the search. What already holds: an empty scope means «I do not know where and when», never
«everywhere, always».

**What can I send besides text?**
Voice notes, images, video, PDF, Markdown, HTML and source code — as a form upload, by URL, or as `media` next to a
phrase. Audio is transcribed by whisper-1 with timestamps; images, PDFs, pages and code are read by Claude; video
gives its sound track and six frames on one timeline. The original stays in the built-in object store, is found by
meaning with `find_objects` and fetched with `GET /v1/objects/{id}/file`.

**What schema do I have to design first?**
None. You send a sentence. The engine adds columns as new kinds of fact appear and generates typed
relational tables when a kind grows into an entity. There are no migrations to write.

**What happens after an expensive research run?**
By design the result is folded back — artifact, summary, vector store, knowledge graph, relation
tables — so the same question is later answered from the cheap levels. **Today that loop is driven by
the caller** (note \*⁷): an agent keeps the answer with `keep_object` and it is found by meaning
afterwards; reading does not fold its own result back, and the deep levels are themselves in
development. The answer always reports `depth_used`, the depth actually reached.

**How does it improve itself without breaking what works?**
**This is the design, not the current behaviour.** The plan: a second version of the skill runs as a
challenger in the shadow, on real traffic, while people keep being answered by the champion, and
promotion needs an external verdict with no regression in cost — the engine is never allowed to grade
its own work. Today: skills are files, every edit is a commit that can be reverted, and verdicts are
collected from people on the bench.

**What can I connect to it?**
Any HTTP client: a Telegram bot, a web chat, a mobile app, a scheduled job. The bundled console is
optional — nothing in the API path depends on it.

**Where does my data live?**
On your server, in your database, in your object store, behind a key you can revoke in one click.
There is no metered API in the middle and no telemetry leaving the machine.

## Privacy and ownership

The engine runs on **your** server, stores its data in **your** database, keeps artefacts in **your**
object store and its key in **your** machine's secret store. Nothing about the people it remembers
leaves that machine, and the only door in is the one you authorise with a key you can revoke in a
single click.

## Licence and contact

Fractera Memory is one microservice of the **Fractera platform** — the engineering infrastructure
for autonomous agents:
[github.com/Fractera/Agentic-Engineering-Infrastructure](https://github.com/Fractera/Agentic-Engineering-Infrastructure).

Open source. Fork it, read it, change it. Commercial enquiries: `admin@fractera.ai`.

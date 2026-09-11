# Fractera Memory

**A self-hosted, open-source memory engine for agents — with a knowledge graph, geo- and
time-aware recall, an object store, deterministic no-LLM answers, deep multi-step reasoning, and a
self-evolving skill core that A/B-tests its own improvements.**

You talk to it in plain language over a REST API. It decides where knowledge lives, how deep to dig,
and when a model is worth calling at all. It runs on **your** server, on **your** hardware, with
**no per-request fees to anyone**.

---

## If this is your checklist, read this table first

| What you need | How Fractera Memory does it |
|---|---|
| **Any front-end, today Telegram, tomorrow a web chat or a mobile app** | One REST API, no interface of its own. Telegram, web widgets, mobile apps, IDE plugins and cron jobs are all just callers with a key. The tool schema for an agent is generated from `GET /v1/contract` over HTTP, so a new client is wired in minutes. |
| **Not hints — actual decisions and actions** | Memory returns a decision with its grounds, its source and its confidence kind, plus the reasoning chain that produced it. Recurring outcomes become scheduled follow-ups, so a conclusion turns into an action rather than a suggestion. |
| **Objects: video, images, PDF, audio** | First-class input. `media` accepts `image · video · audio · pdf · html · text`; a voice message becomes text, a document becomes a summary with the original artefact kept, a photo becomes a description. All of it enters the same cycle as a typed sentence, and the binaries live in the built-in object store. |
| **Geolocation, and dates when they matter** | **Spatial-temporal scope is a first-class dimension**, not a tag. A scope entry carries `at`, `place`, and **`lat` / `lon` with an optional `radius_m`**. Totals, life cycles and answers are grouped by scope: a taxi ride in Madrid never merges with one in London, and the same question asked in another city is a different question. |
| **Deep reasoning that finds what was never written down** | Five explicit depth levels. Above the database sit the knowledge graph, a reasoning session that builds and compares variants, semantic search over the vector store, and finally bounded recursive research. Memory reaches conclusions the stores never contained — «who of my contacts could have known that person» is the reference case, not an edge case. |
| **Fast without AI in some cases, a strong model in others** | A **deterministic router** decides. Level one is pure lookup: no model, milliseconds, zero tokens. The model is called only when the cheap path found nothing, and the answer always reports `depth_used` — how far memory actually went. |
| **It must evolve: the slow answer must become instant** | Everything expensive is folded back: the artefact into the object store, its summary into text, into the vector store and into the knowledge graph, with the relation table updated. The second identical question is answered from the cheap levels. |
| **Complex requests should produce an entity — a table — and come back as a report** | Memory creates the table while answering: a second value of a kind promotes a column into its own table, and a caller who already knows the shape says `need_table`. The answer carries the artefact plus a short summary, i.e. a report rather than a dump. |
| **Its own object storage** | Built in. Media, generated documents and research artefacts are stored by the service on your machine and referenced from answers by id. |
| **An evolution core: new skills, split-tested, best one wins** | Memory writes a **second version of a skill next to the working one** and runs it **in the shadow** — on real traffic, while people keep being answered by the version in force. The winner is decided by external verdicts and by cost, per case, per tool, per version **and per scope**. Losers are deleted with the record of why. Every edit is committed, so every step is reversible. |
| **Free, on my own server** | Self-hosted on your VPS. The installer robot deploys it; there is no metered API in the middle and no data leaving the machine. |
| **A knowledge graph that updates on write and costs almost no AI on read** | Exactly the design. The graph is built as facts arrive; on read it returns ready context **without a model turn** — it is called in the mode that does not generate, so that the cheap path stays cheap. |
| **Open source, hand-modifiable** | This repository is the whole service: the contract, the verbs, the stores, the pages. Fork it, read it, change it. Every design decision is written down next to the code that implements it. |

**The honest answer to «what will I still have to build myself»: the front-end you want, and
nothing else.** Memory does not ship a Telegram bot, because it is not an interface — it is the
memory the interface talks to.

---

## Install

You do not install this by hand. The **Fractera installer robot** deploys it onto your server:
creates the service, gives it its port and its place behind nginx, wires it into the machine's secret
store, issues certificates, starts it under the process manager. A few minutes after you order the
server you have a running memory service with its own pages, its own contract and its own key.

Prefer to do it yourself? It is an ordinary Node service in this repository — clone it, give it a
database, run it. Nothing here phones home.

## Quick start

```bash
# 1. Generate a key on the service's API page, then:
export MEMORY_KEY=fmk_…
export MEM=https://memory.<your-domain>/v1

# 2. Tell it something a person said, in their own words
curl -s $MEM/remember -H "Content-Type: application/json" -H "x-memory-key: $MEMORY_KEY" \
  -d '{ "who": "roman", "text": "my name is Roman and I live in Madrid", "lang": "en" }'

# 3. Ask what it knows. No question means everything — and no model is called
curl -s $MEM/recall -H "Content-Type: application/json" -H "x-memory-key: $MEMORY_KEY" \
  -d '{ "who": "roman", "lang": "en" }'
```

That is the whole onboarding. There is no schema to design, no migration to run, no table to declare.

---

# Part I — API

Every method is declared in `contract.mjs` and served live at `GET /v1/contract`. The documentation
page inside the service generates itself from that same object, so it never drifts from what the
server accepts. Generate your agent's tool schemas from that endpoint rather than copying them.

## Base URL and transport

```
https://memory.<your-domain>/v1
```

`POST` with a JSON body, `Content-Type: application/json`. Responses are JSON and `no-store`.

**Read the body, not the status code.** Memory answers `200` with `ok:false` for refusals it
understands and names. A non-200 status means the call never reached the verb.

## Authentication

```
x-memory-key: fmk_…          # or:  Authorization: Bearer fmk_…
```

One key covers reading and writing. Generate it on the **API** page of the service (architect role).
It is shown once, stored on your machine at `/etc/fractera/memory-api-key` with mode `0600`, and
compared in constant time. **Generating a new key revokes the previous one instantly** — that is the
revoke. Calls without a valid key get `401 no-access`.

## `POST /v1/remember`

| parameter | type | required | meaning |
|---|---|---|---|
| `who` | string | yes | Whose facts these are: a stable key for the person. |
| `text` | string | yes | The phrase as it was said, without paraphrasing. |
| `lang` | string | no | Language of the words meant for a person. |
| `scope` | array | no | Spatial-temporal scope: a list of `{at, place, lat, lon, radius_m}`. |
| `media` | array | no | Attachments: `{kind, url⎮id}` where kind is `image · video · audio · pdf · html · text`. |
| `thread` | string | no | Continue an earlier line of reasoning instead of starting over. |
| `deny` | string | no | Overturn an earlier conclusion. |
| `need_table` | boolean | no | Require what is recorded to become its own table at once. |

**Returns.** `what_happened` — words you can say straight to a person. `noted` — what was written
down, each entry with `from_table` and `claim`. On a contradiction: *«was X, now Y»* — the latest
wins, out loud, with the previous value kept in history. `params` — the fate of every optional
parameter. `thread` — the name of the reasoning thread.

## `POST /v1/recall`

| parameter | type | required | meaning |
|---|---|---|---|
| `who` | string | yes | Who is being asked about. |
| `text` | string | no | The question in a human sentence. Without it, everything known comes back. |
| `lang` | string | no | Language of the words meant for a person. |
| `depth` | string | no | How far memory may go: `standard` · `deep` · `extreme`. |
| `history` | string | no | The previous conversation, when the caller has one. |
| `prior` | string | no | What has already been found before this question. |
| `want_chain` | boolean | no | Return the steps of the search. |
| `thread` | string | no | Continue an earlier line of reasoning. |
| `scope` | array | no | Where and when the question is asked — the same shape as above. |

**Returns.** `known` — every value with `from_table` (which table answered), `claim` (said by the
person or inferred) and `basis` (what it was inferred from). `not_yet_known` — what is missing and
why it matters. `used_model` — whether a model was called at all. `depth_asked` / `depth_used` — how
far you allowed memory to go and how far it went. `used_input` — which of your context took part.
`chain` — the steps of the search. `params` — the fate of every optional parameter.

## `POST /v1/people` · `POST /v1/journal` · `POST /v1/forget_journal`

Who memory knows; memory's own account of its work in plain text — what arrived, what the model
returned, what was decided, **what was dropped and why**, what went out and how long it took; and the
way to erase that account without touching knowledge about people.

## Catalogue, health, contract

```
GET /v1/tables          names of everything memory keeps about a person
GET /v1/tables/{name}   the description of one table
GET /v1/health          open, no key: liveness, contract version, name-quality figure
GET /v1/contract        the machine-readable contract
```

Names explain themselves — `language_he_speaks_with_us`, `city_where_he_lives_now`. How often callers
have to ask for a description is reported by `/v1/health` as a quality figure: a name that needs
explaining is a name that failed.

---

# Part II — How it works

## The deterministic router: the cheapest path that can answer, and not a step more

Most questions do not deserve a language model, and memory refuses to spend one on them.

| Level | What it brings in | Cost | Who opens it |
|---|---|---|---|
| **1** | direct lookup in the store — **no model at all** | milliseconds, zero tokens | memory |
| **2** | the store plus one model call | one turn | memory, when level one found nothing |
| **3** | the **knowledge graph** plus a reasoning session: build variants, compare, choose | graph context costs **no model turn** | memory, when level two found nothing |
| **4** | **semantic search over the vector store** — meaning, not words | seconds | the caller, with `depth: "deep"` |
| **5** | **recursive research**: a loop until the answer, bounded at ten minutes | minutes | the caller, with `depth: "extreme"` |

**The ladder is ordered by cost, not by quality** — which is why the graph sits *below* the vector
store: it returns ready context without generating anything, so level three stays cheap. Memory
returns the **minimally sufficient** answer and reports `depth_used`, so you always know what you
paid for.

**«What is my timezone»** is answered at level one, in milliseconds, with no tokens spent.
**«Who of my contacts could have known that person»** has no answer written anywhere — it is
assembled at levels three to five out of the graph, the vector store and the model's own knowledge of
the world, and comes back as a probabilistic answer **with the chain that produced it**.

## Three stores, one black box

A relational store for values, a **vector store** for meaning, a **knowledge graph** for connections,
and an **object store** for binaries. The caller never learns which of them answered: the answer names
its source table, and that is the only thing about storage that travels out.

**The graph is written on ingest and read without a model.** Facts, people and their connections are
linked as they arrive; on read the graph is queried in the mode that returns context and does not
generate — the expensive part of RAG is skipped by design, not by luck.

## Schema that grows by itself

- *«my friends Dima and Misha»* → a new column, two rows.
- *«in the team Julia is the product manager, Dima is the manager»* → a team table.

The second value of a kind promotes a column into its own table, carrying the first value with its
origin, its claim kind and **its own timestamp** — so memory never reports that it learned about
Misha today. A caller who already knows the answer will be a table says `need_table` and gets it at
once. Names are built through a whitelist and a transliteration table, because a name born from a
model ends up inside SQL.

## Claims and grounds

Every value carries its kind. `said` — the person stated it. `guess` — memory inferred it, and an
inference is stored **only with its basis**, because a guess without its grounds becomes
indistinguishable from testimony within a week. When in doubt memory marks a value as a guess and
says so to the person.

## Spatial-temporal scope

```json
"scope": [
  { "at": "2026-09-11", "place": "Madrid", "lat": 40.4168, "lon": -3.7038, "radius_m": 500 },
  { "place": "London" }
]
```

Coordinates are validated as a pair and against the bounds of the planet; a lone latitude is half a
point, and 200 degrees of longitude is a typo that would otherwise become knowledge. Scope propagates
into accumulation and into life cycles: Madrid totals never merge with London's, and two identically
named things in two places keep two separate histories. **An empty scope means «I do not know where
and when» — never «everywhere, always»**, and a scopeless fact is returned as one, by name, rather
than silently promoted to universal truth.

When an answer depends on a scope you did not supply, memory does not interrogate the person — it is
not talking to them: it returns an answer of the *«depends on parameters»* kind and tells the caller
exactly what is missing and why it matters.

## Objects: voice, photos, video, documents

`media` accepts `image · video · audio · pdf · html · text`. The kind is declared by the caller and
checked against a closed list — a file extension lies more often than people expect, and the kind
selects the handler. Voice becomes text, a document becomes a summary with the artefact kept, a photo
becomes a description; all of it enters the same cycle as a typed phrase, and the binary lives in the
service's own object store, referenced from answers by id.

## Threads of reasoning — and why continuing one is cheaper

When memory thinks, it holds a real conversation with a model, and that conversation has a name.
Every answer in which memory thought carries `thread`; send it back and the same chain continues,
with the model seeing its own earlier conclusion.

**Measured on a live machine, three turns of one thread:**

| Turn | cache created | cache read | cost |
|---|---|---|---|
| first — the thread is born | 6362 | 8204 | `0.0289` |
| second — `thread` sent back | 843 | 15305 | `0.0065` |
| third | — | 16148 | `0.0036` |

Continuing a thread is **eight times cheaper** than restating the context in a fresh call. The cache
is hourly; an older thread still resumes.

**This is what makes `deny` meaningful.** Overturning a conclusion only means something if you can
return to the reasoning that produced it. `deny` plus `thread` revisits that exact chain: the
conclusion is withdrawn, the grounds are kept, and the refuted hypothesis stays on record so the same
search does not reproduce it tomorrow. An expired thread says so by name — `think-thread-unknown` —
instead of failing as a parse error.

## Knowledge returns into circulation — the slow answer becomes the fast one

Anything obtained at the expensive levels is folded back: the artefact into the object store, a
summary into text, the summary into the vector store **and** into the knowledge graph, and the
relation table updated. The next identical question is answered from the cheap levels. A computed
table and the output of deep research are the same case, not two.

## The evolution core: skills that improve themselves under A/B testing

After every cycle memory records the facts of the run: how deep it went, how many model turns, how
many seconds, what kind of answer came out, which skills and tools were called. These are data, not
impressions.

**Memory's own opinion of success does not count.** The verdict comes from whoever asked — a human or
the calling model. Until there is a verdict the cycle is unfinished, not successful. A model retelling
its own work errs in its own favour, and the whole design refuses to rely on that.

When memory sees a repeated miss, it writes a **second version of the skill next to the working one**
and runs it **in the shadow**: on real requests, while people keep being answered by the version in
force. The candidate wins only if it won on verdicts and did not lose on cost — and the comparison is
kept **per case, per tool, per version and per scope**, because one skill can be excellent with one
set of parameters and poor with another. The loser is deleted together with the record of why. Every
edit of a skill is a commit, so every step is reversible, and there is a one-click return to the
first version if an evolution goes wrong.

## Everything it did is written down

The journal records every call — what came in, what the model returned, what was decided, what was
dropped and why, what went out, how long it took. The same document is read by a human on the Journal
page and by an agent as a file. «It did not understand» is never confused with «there was nothing
there».

## The bench: talk to memory with nothing in between

The service ships with its own playground at `/{lang}/settings?section=memory-test`, where a human
speaks to memory directly — no agent in the chain — and sees the raw answer with the time it took.
Its controls mirror the API one to one: depth in plain words, conversation history, previous
findings, the reasoning thread with a button that takes the identifier from the last answer, the
denial field, scope as cards with *«add an entry»*, the demand for a table, and uploads for
everything that is not text.

Above the send button the bench shows **the exact request body about to leave**. That single panel
answers the question every integration eventually asks: did the service ignore my parameter, or did
my client never send it?

## Boundaries that are design, not gaps

- **You never query a table directly.** Source names travel out in the answer and are not accepted in
  the question: deciding where to look is memory's job, and that is what keeps it a black box rather
  than a database under a thin cover.
- **No history of your requests is kept.** Each call is a closed cycle; continuity is explicit,
  through the reasoning thread, so nothing leaks between callers by accident.
- **Facts about third parties are reported, not filed against the wrong person.**
- **Relations between two people are graph edges, not row fields** — a relation has a source and a
  target, and a column would lose one of them.
- **Nothing is promoted quietly.** An inference is stored only with its grounds; an empty scope stays
  empty.

---

## Privacy and ownership

The service runs on **your** server, stores its data in **your** database, keeps its artefacts in
**your** object store and its key in **your** machine's secret store. Nothing about the people it
remembers leaves that machine, and the only door in is the one you authorise with a key you can
revoke in a single click.

## Licence and contact

Open source, part of the Fractera platform. Fork it, read it, change it. Commercial enquiries:
`admin@fractera.ai`.

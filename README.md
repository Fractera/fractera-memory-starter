# Fractera Memory

**Memory that you talk to in plain language — running on your own server.**

You do not install this repository by hand. It is deployed automatically onto your machine by the
**Fractera installer robot**, together with the rest of the platform: the robot creates the service,
gives it its port and its place behind nginx, wires it into the machine's secret store, issues its
certificates and starts it under the process manager. A few minutes after you order a server you have
a running memory service with its own pages, its own contract and its own access key. This repository
is the source it runs from.

---

## What this is

**Fractera Memory is a black box.** You tell it things the way a person says them, and you ask it
questions the way a person asks them. Where a fact is stored, whether a new column or a new table is
created, whether a language model is called at all — memory decides on its own. There is no schema to
design, no migration to run, no table to declare before you start.

**Two verbs, and that is the whole interface.** `remember` changes what memory knows; `recall` never
changes anything. Everything else — the catalogue, the journal — exists to explain what memory did.

**It is built to be wired into other software.** The answer is written for the next model in the
chain, not only for a human: it carries the conclusion, the source of every value, the kind of claim
(said by the person or inferred), and the chain of reasoning that produced it.

### Why it is different from a database with a chat on top

| | A database you design | Fractera Memory |
|---|---|---|
| before the first record | schema, migrations, naming decisions | nothing: you send a sentence |
| a new kind of fact appears | ALTER TABLE, deploy | memory creates the place for it while answering |
| who decides where to store it | you, in advance | memory, at the moment it is needed |
| what the caller gets back | rows | an answer, its sources, its confidence and its reasoning |
| when the same question is asked twice | the same cost | cheaper: the research is folded back into the stores |

---

# Part I — API

Every method below is declared in `contract.mjs` and served live at `GET /v1/contract`. The
documentation page inside the service generates itself from that same object, so it never drifts away
from what the server accepts.

## Base URL

```
https://memory.<your-domain>/v1
```

All calls are `POST` with a JSON body, except the catalogue and the two service endpoints. Send
`Content-Type: application/json`. Responses are JSON and `no-store`.

**Read the body, not the status code.** Memory answers `200` with `ok:false` for refusals it
understands and names. A non-200 status means the call never reached the verb at all.

## Authentication

Every `/v1/*` call except `/v1/health` requires the memory access key. One key covers **both reading
and writing**.

```
x-memory-key: fmk_…

# or, if your client prefers the standard header:
Authorization: Bearer fmk_…
```

Generate the key on the service's **API** page (sign in with the architect role, press *Generate
access key*). It is shown once, stored on your machine at `/etc/fractera/memory-api-key` with mode
`0600`, and compared in constant time so that a wrong key reveals nothing about how wrong it was.
**Generating a new key revokes the previous one immediately** — that is the revoke.

Calls without a valid key get `401` with `error: "no-access"`.

## `POST /v1/remember`

Tell memory what a person said, in their own words.

| parameter | type | required | meaning |
|---|---|---|---|
| `who` | string | yes | Whose facts these are: a stable key for the person. |
| `text` | string | yes | The person's phrase as it was said, without paraphrasing. |
| `lang` | string | no | Language of the words meant for a person: `ru` or `en`. |
| `scope` | array | no | A **list** of `{at, place}` entries — date as `YYYY-MM-DD`, place in words. One phrase may carry several dates and places, and each one is kept. |
| `thread` | string | no | The reasoning thread to continue instead of starting over. |
| `deny` | string | no | Overturn an earlier conclusion: what is wrong with it. |
| `need_table` | boolean | no | Require what is recorded to become its own table at once. |
| `media` | array | no | Attachments to read alongside the phrase: image, video, sound, HTML, PDF. |

**Returns.** `what_happened` — words you can say straight to a person. `noted` — what exactly was
written down, each entry with `from_table` and `claim`. On a contradiction the answer says
*«was X, now Y»*: the latest wins, but out loud, and the previous value is kept in history. `params` —
the fate of every optional parameter. `thread` — the name of the reasoning thread.

If the phrase carries no facts about the person, you get `ok:true` and an empty `noted` — not an
error, and not an invention.

## `POST /v1/recall`

Ask memory about a person. Without a question it returns everything it knows, instantly and without
spending a model call. With a question it searches mechanically first and climbs only as far as it
must.

| parameter | type | required | meaning |
|---|---|---|---|
| `who` | string | yes | Who is being asked about. |
| `text` | string | no | The question in a human sentence. Without it, everything known comes back. |
| `lang` | string | no | Language of the words meant for a person. |
| `depth` | string | no | How far memory may go: `standard` · `deep` · `extreme`. |
| `history` | string | no | The previous conversation, when the caller has one. |
| `prior` | string | no | What has already been found before this question. |
| `want_chain` | boolean | no | Whether to return the steps of the search. |
| `thread` | string | no | Continue an earlier line of reasoning. |
| `scope` | array | no | The same list of `{at, place}` entries: the same question asked in another city is another question. |

**Returns.** `known` — what is known; every value carries `from_table` (which table answered), `claim`
(said by the person or inferred) and `basis` (what it was inferred from). `not_yet_known` — what is
missing and why it matters. `used_model` — whether a model was called. `depth_asked` and `depth_used`
— how far you allowed memory to go and how far it actually went. `used_input` — which of the context
you sent took part in the search. `chain` — the steps of the search, when you ask for them. `params` —
the fate of every optional parameter.

**A source table is named in the answer and never accepted in the question.** Knowing the names helps
you ask a better question; deciding where to look stays memory's job. That is what keeps it a black
box rather than a database under a thin cover.

## `POST /v1/people`

Who memory knows at all — for a caller asking about the system rather than about itself. Returns
`people`, each with the date of the first record.

## `POST /v1/journal` · `POST /v1/forget_journal`

Memory's own account of its work in plain text, and the way to erase it. Every entry says what
arrived, what the model returned, what was decided, **what was dropped and why**, what went out and
how long it took. Clearing the journal never touches knowledge about people; `forget_journal` returns
`cleared` — a number, so you can see exactly what was removed.

## Catalogue

```
GET /v1/tables          names of everything memory keeps about a person
GET /v1/tables/{name}   the description of one table — if its name did not explain itself
```

Names are built to explain themselves: `language_he_speaks_with_us`, `city_where_he_lives_now`,
`people_he_calls_his_friends`. The share of callers who have to ask for a description is reported by
`/v1/health` as a quality figure — a name that has to be explained is a name that failed.

## Health and contract

```
GET /v1/health     open, no key required: liveness, contract version, name-quality figure
GET /v1/contract   the machine-readable contract; generate your tool schemas from this over HTTP
```

## Depth: five levels, and memory climbs only as far as it must

| Level | What it brings in | Who allows it |
|---|---|---|
| **1** | the database **without a model** — direct lookup | memory itself |
| **2** | the database **with** a model: one call | memory itself, when level one found nothing |
| **3** | the knowledge graph plus a reasoning session: gather variants, choose one | memory itself, when level two found nothing |
| **4** | the vector store on top — search by meaning, not by words | `depth: "deep"` |
| **5** | recursive research on top — a loop until the answer, bounded by ten minutes | `depth: "extreme"` |

**The ladder is ordered by cost, not by quality.** The graph returns ready context without a model
turn; the vector store costs time and therefore lives higher. What is expensive is a model turn, not
a query — so memory returns the **minimally sufficient** answer rather than the best one it could
construct, and tells you in `depth_used` how far it actually went.

Levels 4 and 5 are opened by the caller, deliberately: they spend real time and real quota, and that
decision belongs to whoever is paying for it.

## Threads of reasoning — and why continuing one is cheaper

When memory thinks, it holds a real conversation with the model, and that conversation has a name.
Every answer in which memory thought carries `thread`. Send it back with the next call and the same
conversation continues: the model sees its own earlier conclusion.

**Measured on a live machine, three turns of one thread:**

| Turn | cache created | cache read | cost |
|---|---|---|---|
| first — the thread is born | 6362 | 8204 | `0.0289` |
| second — `thread` sent back | 843 | 15305 | `0.0065` |
| third | — | 16148 | `0.0036` |

Continuing a thread is **eight times cheaper** than restating the context in a fresh call. The cache
is hourly: an older thread still resumes, and the first turn after the pause simply pays for the
cache again.

**This is what makes `deny` meaningful.** Overturning a conclusion only means something if you can
return to the reasoning that produced it. Send `deny` together with `thread` and memory revisits that
exact chain: the conclusion is withdrawn, the grounds are kept, and the refuted hypothesis stays on
record so the same search does not give birth to it again tomorrow. A thread that has expired says so
by name — `think-thread-unknown` — instead of failing as a parse error.

## Scope: the same fact in two places is two facts

A taxi ride in Madrid and a taxi ride in London are different experiences, and memory keeps them
apart. Scope travels as a list, because one phrase carries several dates and places:

```json
"scope": [
  { "at": "2026-09-11", "place": "Madrid" },
  { "place": "London" }
]
```

Scope propagates into accumulation and into life cycles: totals for Madrid never merge with London,
and two identically named things in two places keep two separate histories. **An empty scope means
«I do not know where and when» — never «everywhere and always»**, and a fact without scope is
returned as one, by name, rather than quietly promoted to universal truth.

## Every optional parameter reports its own fate

Any answer that received optional parameters carries `params` — one row per parameter you sent:

| state | meaning |
|---|---|
| `accepted` | taken and acted upon; `note` says what it did |
| `bad_form` | wrong shape; the parameter is dropped, the reason names the offending entry, and the rest of the call still runs |

A parameter you sent never simply vanishes. If `params` says nothing about it, you did not send it.

## Refusal codes

Two fields always travel together: a permanent machine code (`refusal` or `error`) and human words
(`what_happened`). Branch on the code; show the words. The words are translated; the codes never
change.

| code | meaning |
|---|---|
| `think-answer-unusable` | the model answered off-form — the phrase could not be parsed |
| `think-cli-missing` | the reasoning runtime is not present on this machine |
| `think-not-authorized` | the reasoning runtime is not signed in |
| `think-quota-exhausted` | the subscription window is used up; it renews by itself |
| `think-subscription-disabled` | the organisation disabled subscription access |
| `think-thread-unknown` | that thread of reasoning has expired |
| `think-timed-out` | the model did not answer within the time given |
| `think-unreachable` | the model is unreachable |
| `need-who` · `need-who-and-text` | required fields missing at the door |
| `store-unreachable` · `columns-unreadable` | the store did not answer, or its columns could not be read |
| `bad-json` · `missing-params` · `no-access` · `not-built` · `unsafe-name` | rejected by the door itself |

**Money and keys are different refusals on purpose.** An exhausted window heals by itself; a rejected
key does not. One code for both would leave you guessing whether to wait or to act.

## Examples

```bash
# tell memory something a person said
curl -s https://memory.<your-domain>/v1/remember \
  -H "Content-Type: application/json" \
  -H "x-memory-key: $MEMORY_KEY" \
  -d '{ "who": "roman", "text": "my name is Roman and I live in Madrid", "lang": "en" }'

# ask what it knows — no question means everything, and no model is called
curl -s https://memory.<your-domain>/v1/recall \
  -H "Content-Type: application/json" \
  -H "x-memory-key: $MEMORY_KEY" \
  -d '{ "who": "roman", "lang": "en" }'

# ask something nobody ever wrote down, and allow the expensive path
curl -s https://memory.<your-domain>/v1/recall \
  -H "Content-Type: application/json" \
  -H "x-memory-key: $MEMORY_KEY" \
  -d '{ "who": "roman", "text": "who of my contacts could have known the president",
        "depth": "extreme", "want_chain": true }'

# continue the same reasoning and overturn what it concluded
curl -s https://memory.<your-domain>/v1/remember \
  -H "Content-Type: application/json" \
  -H "x-memory-key: $MEMORY_KEY" \
  -d '{ "who": "roman", "text": "about the city",
        "thread": "f0310016-29fd-4dc2-a97e-0c22292a4de2",
        "deny": "that is wrong — I moved to Lisbon last month" }'
```

## Testing it in Postman

1. Generate the access key on the **API** page and copy it. It is shown once; generating a new one
   replaces it.
2. Create an environment — `Fractera Memory` — with `base` = the address shown on that page and
   `key` = the key. Mark the key variable as *secret*.
3. `GET {{base}}/v1/health`, no headers. A `200` with a JSON body means the service is alive.
4. `GET {{base}}/v1/contract` with `x-memory-key: {{key}}`. This proves the key itself works.
5. `POST {{base}}/v1/remember` with `Content-Type: application/json` and body
   `{ "who": "postman-test", "text": "my name is Roman", "lang": "en" }`. Expect `ok:true`, a `noted`
   array and a `thread`.
6. `POST {{base}}/v1/recall` with `{ "who": "postman-test", "lang": "en" }`. Everything known about
   that person comes back in milliseconds, with no model call.
7. Remove the `x-memory-key` header and send the read again. You must get `401` with `no-access`. If
   it still succeeds, you are talking to something that is not this service.

---

# Part II — How memory works

## The two requests

There are exactly two: **add a record** and **extract a record**. Everything else is an internal
decision of the box.

## Three stores, and they differ in kind

A relational store for values, a vector store for meaning, a knowledge graph for connections. The
caller never learns which of them answered; the answer names the source table, and that is the only
thing about storage that travels out. Memory chooses among them by cost and by the shape of the
question — a short question goes through connections, a long one by meaning, an exact one straight to
the row.

## When a column is born, and when a table is

Memory decides by whether the incoming units of meaning will keep developing.

- *«my friends Dima and Misha»* → a new column, two rows;
- *«in the team Julia is the product manager, Dima is the manager»* → a team table.

The second value of the same kind promotes a column into its own table, carrying the first value with
its origin, its claim kind and **its own timestamp** — so memory never reports that it learned about
Misha today. A caller who already knows the answer will be a table can say so with `need_table`.

**A name born from a model ends up inside SQL**, so the name is built through a whitelist and
transliteration table rather than trusted: a value that cannot become a safe name never becomes a
table.

## Claims and grounds: what was said, what was inferred

Every value carries its kind. `said` means the person stated it in their own words. `guess` means
memory inferred it — and an inference is stored only with its **basis**, because a guess without its
grounds becomes indistinguishable from testimony within a week. When in doubt memory marks a value as
a guess and says so to the person: *«it looks like your timezone is Madrid — correct me if I am
wrong»*.

## Knowledge returns into circulation

Anything obtained at the expensive levels is folded back: the artefact goes into object storage, a
summary into text, the summary into the vector store and into the knowledge graph, and the relation
table is updated. The next identical question is answered from level two or three instead of five.
A computed table and the output of deep research are the same case, not two.

## What memory accepts as input

Text, image, video, sound, HTML and PDF. A voice message becomes text, a document becomes a summary
with its artefact kept, a picture becomes a description — and all of it lands in the same cycle as a
typed phrase.

**A denial is an input of its own.** When a person refutes a conclusion, memory re-runs the cycle and
appends to the earlier summary that the hypothesis was rejected and by whom. What is cancelled is the
conclusion, not the fact.

**Date and place are indirect signs** — they are not a new vocabulary but a scope, expressed through
the key of another attribute. When scope is missing and the answer depends on it, memory does not
interrogate the person — it is not talking to them: it returns an answer of the *«depends on
parameters»* kind and tells the caller what is missing and why it matters.

## Memory improves itself, by measurement rather than by impression

After every cycle memory records the facts of the run: how deep it went, how many model turns, how
many seconds, what kind of answer came out, which skills and tools were called.

**Its own opinion of success does not count.** The verdict comes from whoever asked — a human or the
calling model. Until there is a verdict the cycle is unfinished, not successful. A model retelling its
own work errs in its own favour, and the whole design refuses to rely on that.

When memory sees a repeated miss, it writes a second version of the skill **next to** the working one
and runs it **in the shadow**: on real requests, while the human keeps being answered by the version
in force. The candidate wins only if it won on verdicts and did not lose on cost; the loser is deleted
together with a record of why. Every edit of a skill is committed immediately — the rollback is what
makes that freedom safe.

**A verdict carries scope too:** one skill is good with one set of parameters and poor with another,
so quality is tracked per case, per tool, per version and per scope. Without that, two true statements
about one skill look like a contradiction and cancel each other out.

## The bench: talking to memory with nothing in between

The service ships with its own playground at
`/{lang}/settings?section=memory-test`, where a human speaks to memory directly — no agent in the
chain — and sees the raw answer with the time it took. It exists so that what is measured is memory
itself rather than the sum of memory and whatever was calling it.

Its controls mirror the API one to one: depth in words rather than level numbers, conversation
history, previous findings, the reasoning thread with a button that takes the identifier from the
last answer, the denial field, scope as cards with *«add an entry»*, the request for a table, and the
uploads for everything that is not text. They are folded into **Advanced parameters**, and the folded
card lists what is currently set — a collapsed block with silently acting parameters would be a trap.

Above the send button the bench shows **the exact request body that is about to leave**. That single
panel answers the question every integration eventually asks: did the service ignore my parameter, or
did my client never send it?

## Everything is written down as it happens

The journal records every call — what came in, what the model returned, what was decided, **what was
dropped and why**, what went out, and how long it took. It is the same document a human reads on the
Journal page and an agent reads as a file. When memory says it did not record something, the journal
says why, and «it did not understand» is never confused with «there was nothing there».

---

## Privacy and ownership

The service runs on **your** server, stores its data in **your** database and keeps its key in
**your** machine's secret store. Nothing about the people it remembers leaves that machine, and the
only door in is the one you authorise with a key you can revoke in a single click.

## Licence and contact

Part of the Fractera platform. Commercial enquiries: `admin@fractera.ai`.

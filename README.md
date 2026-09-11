# Fractera Memory

**You do not install this repository by hand.** It is deployed automatically onto your own server by
the Fractera installer robot, together with the rest of the platform. The robot creates the service,
gives it its port and its place behind nginx, wires it to the machine's secret store and starts it
under the process manager. What you get afterwards is a running service on your own machine, with
its own pages, its own contract and its own key — and this repository is the source it runs from.

Everything below is in English on purpose: this text is read by tools, by agents and by the people
who wire them.

---

## What memory is, in one paragraph

**Fractera Memory is a black box.** You speak to it in ordinary human sentences and you ask it
questions in ordinary human sentences. Where a fact is stored, whether a new column or a new table is
created, whether a language model is called at all — memory decides on its own and does not expose
any of that. There is no schema to design and no table to declare before you start.

**Two verbs, and that is the whole idea.** `remember` changes what memory knows; `recall` never
changes anything. Everything else — the catalogue, the journal — exists to explain what memory did,
not to let you reach inside it.

---

# Part I — API

The service speaks HTTP. Every method below is declared in `contract.mjs`, which is also served
live at `GET /v1/contract`; the documentation page inside the service generates itself from that same
object, so it cannot drift away from what the server accepts.

## Base URL

```
https://memory.<your-domain>/v1
```

All calls are `POST` with a JSON body, except the catalogue and the two service endpoints listed
below. Send `Content-Type: application/json`. Responses are always JSON and always `no-store`.

**Read the body, not the status code.** Memory answers `200` with `ok:false` for refusals it
understands — a missing thread, a malformed date, an exhausted subscription window. A non-200 status
means the call never reached the verb at all. A client that branches on the status code alone will
report a refusal as success.

## Authentication

Every `/v1/*` call except `/v1/health` requires the memory access key. One key covers **both reading
and writing**: there are no separate scopes, and pretending otherwise would be a lie about what the
server checks.

```
x-memory-key: fmk_…

# or, if your client prefers the standard header:
Authorization: Bearer fmk_…
```

The key is generated on the service's own **API** page (sign in with the architect role, press
*Generate access key*). It is shown once, stored on the machine at `/etc/fractera/memory-api-key`
with mode `0600`, and compared in constant time. **Generating a new key revokes the previous one
immediately** — there is no separate revoke button, because that is the same action.

Calls without a valid key get `401` with `error: "no-access"`.

## Methods

### `POST /v1/remember`

Tell memory what a person said, in their own words. Where it lands, whether a new place is created
and what to do about a contradiction — memory decides.

| parameter | type | required | meaning |
|---|---|---|---|
| `who` | string | yes | Whose facts these are: a stable key for the person. |
| `text` | string | yes | The person's phrase as it was said, without paraphrasing. |
| `lang` | string | no | Language of the words meant for a person: `ru` or `en`. |
| `scope` | array | no | A **list** of `{at, place}` entries. Date as `YYYY-MM-DD`, place in words; an entry needs at least one of the two. One phrase may carry several dates and places. |
| `thread` | string | no | The reasoning thread to continue instead of starting over. |
| `deny` | string | no | Overturning an earlier conclusion. Meaningful **only** together with `thread`. |
| `need_table` | boolean | no | Require what was recorded to become its own table at once. |

**Returns.** `what_happened` — words you can say to a person; `noted` — what exactly was written
down, each entry with `from_table` and `claim`. On a contradiction it says «was X, now Y»: the latest
wins, but out loud. `params` — the fate of every optional parameter. `thread` — the name of the
reasoning thread.

**When nothing is found.** There are no facts about the person in the phrase — `ok:true` and an empty
`noted`; that is not an error.

### `POST /v1/recall`

Ask memory about a person. Without a question it returns everything it knows — instantly, and
without spending a model call. With a question it searches mechanically first.

| parameter | type | required | meaning |
|---|---|---|---|
| `who` | string | yes | Who is being asked about. |
| `text` | string | no | The question in a human sentence. Without it, everything known comes back. |
| `lang` | string | no | Language of the words meant for a person. |
| `depth` | string | no | Depth limit in words: `standard` · `deep` · `extreme`. |
| `history` | string | no | The previous conversation, if the caller has one. |
| `prior` | string | no | What has already been found before this question. |
| `want_chain` | boolean | no | Whether to return the steps of the search. Default is no. |
| `scope` | array | no | The same list of `{at, place}` entries as above. |

**Returns.** `known` — what is known; every value carries `from_table`, `claim` (said or inferred)
and `basis`. `not_yet_known` — what is missing and why it matters. `used_model` — whether the model
was called. `depth_asked` and `depth_used` — the limit you asked for and the level memory **actually**
reached. `used_input` — which of the context you sent took part in the search. `chain` — the steps of
the search, and only if you asked for them. `params` — the fate of every optional parameter.

**A source table is named in the answer and never accepted in the question.** Knowing the names helps
you ask a better question; it does not let you query a table directly.

### `POST /v1/people`

Who memory knows at all. For a caller asking about the system rather than about themselves.
Parameters: `lang`. Returns `people` — those it has records about, each with the date of the first
record.

### `POST /v1/journal` · `POST /v1/forget_journal`

Memory's own account of its work, in plain text — and the way to erase it. Clearing the journal does
not touch knowledge about people. `forget_journal` returns `cleared`: a number, not a «done», so you
can see exactly what was removed.

## Catalogue

```
GET /v1/tables          names of everything memory keeps about a person
GET /v1/tables/{name}   the description of one table — if its name did not explain itself
```

## Health and contract

```
GET /v1/health     open, no key required: liveness, contract version, name-quality figure
GET /v1/contract   the machine-readable contract; generate tool schemas from this over HTTP
```

## Threads of reasoning, and why continuing one is cheaper

When memory thinks, it runs a real conversation with the model, and that conversation has a name.
Every answer in which memory thought carries `thread`. Send it back with the next call and the same
conversation continues: the model sees its own earlier conclusion.

**Measured on a live machine, three turns of one thread:** cost `0.0289` → `0.0065` → `0.0036`;
cached input read `8204` → `15305` → `16148` tokens. Continuing a thread is **cheaper** than restating
the context in a fresh call. The cache is hourly.

**This is why `deny` requires a thread.** Overturning a conclusion without being able to return to
the reasoning that produced it means nothing. A thread that no longer exists is its own named
refusal — `think-thread-unknown` — not a generic parse failure.

## Every optional parameter reports its own fate

Any answer that received optional parameters carries `params` — one row per parameter you sent:

| state | meaning |
|---|---|
| `accepted` | taken and acted upon; `note` states what it did and where its limit is |
| `not_supported` | well-formed, but the ability behind it is not built yet — said in words, never by silence |
| `bad_form` | wrong shape; the parameter is dropped, the reason is named, the rest of the call still runs |

A parameter you sent will never simply vanish. If `params` says nothing about it, you did not send it.

## Refusal codes

Two fields always travel together: a permanent machine code (`refusal` or `error`) and human words
(`what_happened`). Branch on the code; show the words.

| code | meaning |
|---|---|
| `think-answer-unusable` | the model answered off-form — the phrase could not be parsed |
| `think-cli-missing` | there is no Claude Code on this machine: without it memory does not think |
| `think-not-authorized` | Claude Code is not signed in |
| `think-quota-exhausted` | the subscription window is used up |
| `think-subscription-disabled` | the organisation disabled Claude subscription access |
| `think-thread-unknown` | that thread of reasoning no longer exists |
| `think-timed-out` | the model did not answer within the time given |
| `think-unreachable` | the model is unreachable |
| `need-who` / `need-who-and-text` | required fields missing at the door |
| `store-unreachable` / `columns-unreadable` | the store did not answer, or its columns could not be read |
| `bad-json` / `missing-params` / `no-access` / `not-built` / `unsafe-name` | rejected by the door itself |

**Money and keys are different refusals on purpose.** An exhausted window heals by itself; a rejected
key does not.

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

# continue the same reasoning and overturn what it concluded
curl -s https://memory.<your-domain>/v1/remember \
  -H "Content-Type: application/json" \
  -H "x-memory-key: $MEMORY_KEY" \
  -d '{ "who": "roman", "text": "about the city",
        "thread": "f0310016-29fd-4dc2-a97e-0c22292a4de2",
        "deny": "that is wrong — I moved to Lisbon last month" }'
```

## What memory does not do today

- **Only text is understood.** Images, video, audio, HTML and PDF are declared kinds of input, and
  none of them is parsed yet.
- **Search depth stops at level two.** You may ask for `deep` or `extreme`; the answer reports
  `depth_used` honestly.
- **Scope is recorded in the call journal, not yet in the knowledge itself.**
- **Denial does not rewrite storage.** Inside the thread the conclusion is reconsidered.
- **Facts about third parties** are recognised and not stored — and the answer says so.
- **Relations between two people** are not expressible as a field.
- **Memory keeps no history of your requests.** Each call is a closed cycle.

---

# Part II — The Passport

The passport is the document in which memory was described **before** it was built. A human reads it
on the service's own «Passport» page; an agent reads the same file from this repository. There is no
second source of truth about the intent.

**This is a beginning, not the whole documentation.** Sections are added one at a time, and each one
goes through the four steps below.

## How work is done here

The order was named by the owner:

> «First we discuss, then we create the element in the passport, I read it and approve or change it,
> and only then we write the line for the Claude instruction.»

1. **Discuss** — in words, before code and before writing anything down.
2. **The element appears here, in the passport.**
3. **The owner reads it, approves it or changes it.**
4. **Only after that** — a line in the memory instruction (`CLAUDE.md`) and the code.

The memory instruction stays compact and leans on skills rather than repeating them.

## 1. What memory is

Memory is a **black box**. Input is a sentence; output is an object. Nobody looks inside its stores.

Its answer is read by **another model**, not by a human: it will keep working with it. So the answer
carries not only the conclusion but the chain that led there.

The caller may hand over the previous conversation and whatever it has already found. Memory does not
keep a history of requests: each cycle of question and answer resets it.

## 2. Two kinds of request

There are exactly two: **add a record** and **extract a record**. Everything else is an internal
decision of the box.

## 3. Three stores, and they differ in kind

A relational store for values, a vector store for meaning, a knowledge graph for connections. The
caller never learns which of them answered; the answer names the source table, and that is the only
thing about storage that travels out.

## 4. Five levels of depth — climb only when the level below failed

| Level | How it reaches | Who allows it |
|---|---|---|
| **1** | the database **without a model** — search over strings | memory itself |
| **2** | the database **with** a model: one call, no history | memory itself, when level one failed |
| **3** | the knowledge graph plus a model with a session: gather variants and choose | memory itself, when level two failed |
| **4** | the vector store on top of that | **only on the architect's explicit request** |
| **5** | recursion on top of that: a loop until a result, **no longer than ten minutes** | **a second, separate human request** |

**The ladder is ordered by cost, not by quality.** The graph returns ready context **without a model
turn** — so it is called in the mode that does not produce an answer, otherwise it goes to a model
itself and level three stops being cheap. The vector store costs time and therefore lives at level
four.

**A minimally sufficient result, not the best possible one.** What is expensive is a model turn, not
a database query: an extra level is seconds of a person's life and the same subscription quota the
bot and the architect live on.

Levels 1 and 2 are built. Levels 3, 4 and 5 are not: the bench can already **ask** for them, and the
answer reports honestly how far memory actually got.

## 5. Knowledge returns into circulation

Whatever is obtained at level three or four is expensive, so it is not thrown away: memory writes a
report of the research, puts it into the vector store and into the graph, and updates the relation
table if there is one. Without that loop, the saving at the lower levels means nothing — the same
question would cost the same again tomorrow.

## 6. The shape of an answer to an extraction

Three kinds of answer: **affirmative** · **probabilistic** · **dependent on parameters**. Then the
answer itself in free text with a comment; then the report — which tables returned what, how many
depths were passed, what kind of answer each gave; and the whole chain of the search.

**The chain of reasoning is returned only on request of the caller.** Recursive thinking produces a
lot of text, and whether to fill one's own context with it is decided by whoever asked.

## 7. The shape of an answer to a write

Which tables received which answer, which tables were created, which received rows.

## 8. Self-improvement: when a column is born and when a table is

Memory decides by whether the incoming units of meaning will keep developing.

- «my friends Dima and Misha» → a new column and two rows;
- «in the team Julia is the product manager, Dima is the manager» → a team table is needed.

A demand to create a table may also arrive as a request parameter. The name is given by the **naming
skill**.

**A name born from a model ends up inside SQL.** A whitelist of characters is mandatory, and Cyrillic
is transliterated by a table — otherwise the name stops being a name and becomes a command.

## 9. What memory never does

- **It does not muse and does not philosophise**: reasoning lives inside the search and ends with an
  answer.
- **It does not go out to the internet** — the ban is about free search of the web, not about a named
  tool: calling image generation or an embedding for its own answer is allowed.
- **It does not keep a history of requests.** The thread of history lives only inside one cycle.
  History of the conversation — no; a trace of research — yes: the report stays, otherwise the saving
  breaks.

## 10. A model case of deep research — a future skill

The reference case: a question whose answer nobody wrote down, and which is assembled from several
sources at once («who could have known Yeltsin»). It is written into the passport as a target, and it
will become a skill rather than a special branch in the code.

## 11. Evolution of skills: memory improves itself

**After every cycle memory writes down the facts of the run:** how deep it went, how many model
turns, how many seconds, what kind of answer came out, which skills and tools were called. These are
data; they go into the database.

**Memory's own opinion of success does not count.** The verdict is given by whoever asked: a human or
the calling model. Until there is a verdict the cycle is unfinished, not successful. The reason is
not distrust: a model retelling its own work errs **in its own favour**.

**Seeing a repeated miss, memory writes a second version of the skill next to the working one, not
instead of it.** The candidate is tested **in the shadow**: it runs on real requests, but the human is
answered by the version in force. The candidate wins only if it won on verdicts and did not lose on
cost; the loser is deleted together with a record of why.

**Memory is allowed to create new skills and new versions of existing ones.** The price of that right
is one rule: **every edit of a skill is committed immediately.** Without a commit there is nothing to
roll back, and the rollback is the only thing that makes this right safe.

**A shadow run is a second model turn on the same request,** and it spends the same subscription
quota the bot and the architect live on. So it runs on a fraction of requests or on a schedule, never
«always».

## 12. Returning the instruction to its first version — the human's safety line

A system that rewrites its own instructions needs a way back that does not depend on those
instructions being sane. The reference copy is kept as a file, the return is one button on the page,
and the return itself is a commit — so that what was returned from is not lost either.

## 13. The memory bench — Memory playground

**The bench is an instrument, not a showcase:** a human talks to the service directly, with no agent
in the chain, and sees the raw answer. Address:
`{memory.<domain> | ip:3700}/{lang}/settings?section=memory-test`.

**Built, and here is what to read as law:**

- **Every parameter you send has a named fate** — the `params` field, with three outcomes:
  `accepted`, `not_supported`, `bad_form`. A parameter the answer stays silent about is
  indistinguishable from a parameter that does not exist.
- **`depth_used` is counted by fact, not by request.** Asked for `extreme`, reached level one — that
  is what is said, as a number. «Reached the fifth because the fifth was requested» is a confident
  default, and a confident default costs more than a missing value.
- **The «reaches memory» mark on a control is generated from the contract,** never handwritten. The
  contract grows — the marks change by themselves.

**The controls:**

| Control | What it does | Why it exists |
|---|---|---|
| **Search depth**: standard · deep · extreme | sets the ceiling of the level | without it levels four and five are unreachable at all: only a human may allow them |
| **Conversation history** — a switch and a field **above** the main one | hands memory the previous conversation | the calling model passes history at its own discretion, and a bench that cannot do the same tests the wrong path |
| **Results of previous searches** — a field behind a switch | hands over what has already been found | the caller may send them along with the question |
| **Thread of the earlier reasoning** — an identifier, with a button to take it from the last answer | continues memory's own chain | the identifier is 36 characters from an answer; nobody types it by hand |
| **Return the chain of reasoning** — yes · no | whether to include reasoning fragments | recursive thinking produces a lot of text, and whoever asked decides |
| **On whose behalf** — the person's key, chosen from a list | fills `who` | memory answers about a **particular** person; a hand-typed name invents a person memory does not know |
| **Upload image · video · sound · HTML · PDF** — buttons, inactive for now | hand memory something that is not text | the kinds are declared, the ability is not built — **the button exists, the ability does not, and that is said in words** |
| **Denial of an answer** — «this is wrong, because…» | overturns an earlier conclusion | meaningful only together with a thread |
| **Calendar and geotag** — date and place, **each entry its own card**, with «add an entry» | scope | one phrase may carry several dates and places; an empty scope means «I do not know where and when», not «everywhere and always» |
| **A table is required** — a switch | an input parameter of section 8 | otherwise birth-of-a-table-on-demand cannot be tried at all |

**All of it is folded into «Advanced parameters», collapsed by default** — an ordinary run of the
bench is a phrase and a button. **But the collapsed card lists what is set inside it:** a folded block
with silently acting parameters is a trap, not tidiness.

**Hints about depth are given in human words, not level numbers:**

- **Standard.** Memory goes on its own: the database first, then the model, then the knowledge graph.
  Seconds. Enough almost always.
- **Deep.** Search by meaning in the vector store is added. Slower and more expensive — turn it on
  when standard found nothing.
- **Extreme.** Memory goes into recursive research, up to ten minutes. It spends the same
  subscription quota the bot lives on. Only when deep did not answer either.

A switch for the answer's language was **cancelled** by the owner: the language is fixed by agreement,
not chosen on every call.

## 14. An object as the answer, and the re-training cycle

**An answer is not necessarily text.** It may be text, data, or an **object** — a document, a table,
an image. What travels out for an object is its identifier and a short summary: «this many came out,
the details are in the table at such an address».

**An expensive result goes through the re-training cycle, and there is one cycle for every form:**
the artefact into object storage → a summary in text → the summary into the vector store → the
summary into the knowledge graph → update the relation table if one exists. A computed table and the
output of deep research are the same case, not two.

**Patterns are produced by a model, and therefore they are checked.** A pattern that nobody verified
is a guess with the authority of a rule.

## 15. What memory accepts as input, besides the phrase

**Kinds of data:** text · image · video · sound · HTML and PDF. **Today only text is understood** —
for the rest the honest answer is «I do not parse that kind yet», not silence and not invention.

**Denial of an answer is a separate input.** A person refuted a conclusion — run the re-training cycle
and append to the earlier summary that the hypothesis was rejected and by whom. **What is cancelled
is the conclusion, not the fact:** the grounds remain, the refuted hypothesis is kept. Delete it and
the same search will give birth to it again.

**Indirect signs — date and place.** They are not a new vocabulary but a scope, expressed by the key
of another attribute. **An empty scope means «I do not know where and when», not «everywhere and
always».** When the scope is missing, memory does not ask the person — it is not talking to them: it
returns an answer of the «depends on parameters» kind and tells the caller what is missing and why.

## 16. Forks the architect decides

Eleven open questions are written down in the passport rather than decided by the agent — naming,
where the parsing process should live, how long threads are kept, and others. A fork decided quietly
by an agent looks like a decision until the day it has to be explained.

## 17. What has been measured, not assumed

- `claude` on the server is **2.1.267**; a session is `--resume <session-id>`; `--fork-session` and
  `--bg` exist.
- Memory calls the model as `claude -p <text> --system-prompt <…> --model <…>`.
- The parsing timeout inside memory is **120 000 ms**; nginx does not interfere.
- `/v1/*` checks the machine secret in `x-data-secret`, and since the API key was introduced it also
  accepts `x-memory-key`.
- The graph can return context **without a model call**.
- **The subscription quota is one for all:** the same window feeds the Telegram bot and the
  architect's own work.

## 18. A single call and a linked call of `claude -p`: thread, identifier and cache

**The identifier is one per thread, not per message.** Measured: the first call returned a
`session_id`, and two continuations through `--resume` returned **the same** one. Every message has
its own `uuid` inside the envelope, but returning to a conversation is done by `session_id`.

**The thread really remembers.** The first call said «alpha». The second, with `--resume`, answered
the question «what word did you just say» with «alpha» — **without receiving that word in the
request**.

**The thread is bound to the working directory.** The transcript lives as
`/root/.claude/projects/<dir>/<session_id>.jsonl`. Change the parsing directory and old threads stop
being found — silently.

**Cache: a linked call is cheaper than a single one.**

| Turn | `cache_creation` | `cache_read` | Cost |
|---|---|---|---|
| first (the thread is born) | 6362 | 8204 | `0.0289` |
| second (`--resume`) | 843 | 15305 | `0.0065` |
| third (`--resume`) | — | 16148 | `0.0036` |

**Continuing a thread is cheaper than asking the same question again with the previous context
restated.** The cache is hourly: an older thread still resumes, but the first turn after the pause
pays for the cache again.

**A wrong identifier arrives without an envelope, and that is a trap for the reader.** Measured: exit
code `1`, **empty** stdout, and the whole meaning in stderr — `No conversation found with session ID`.
A parser expecting JSON would call this «the model answered off-form», and the human would go and fix
the model instead of supplying the right identifier. That is why memory has its own refusal kind for
it.

**Outward travels our own word — `thread`, not `session_id`.** Whose identifier it is and how it works
inside is the box's private business; if the CLI is replaced tomorrow, the parameter name will not
change.

---

## Licence and contact

Part of the Fractera platform. Commercial enquiries: `admin@fractera.ai`.

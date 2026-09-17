---
name: use-knowledge-graph
description: "The memory's knowledge graph, the store of relations between people, places, orders and things. Use this whenever a question names someone or something (Petya, Madrid, an order, a meeting) and the answer lies in how they are connected rather than in one value, whenever you call ask_graph, whenever the graph returned material you are about to turn into an answer, and whenever you must tell 'no knowledge' apart from 'the graph is not answering'. It covers the tool, the three outcomes, how the graph names the records it drew from so the table can return them with date and place, why raw engine context never goes to a person, and the limits."
---

> A hint, not a law. If you know a better way for the case in front of you, take it and say so.

## The tool

```
ask_graph({ question })
```

`question` is the question in ordinary words — the same ones a person would use. Nothing else needs
preparing: keywords, search mode and the address of the store are assembled by the code.

Worth knowing so you don't spend a turn on work already done for you: rewriting the question "for
search", pulling out terms, normalising names — none of that is yours to do.

## What comes back

Entities and relations, extracted when the knowledge was loaded, in ready form. This is **material
for your answer**, not the answer itself: the wording is yours.

**Read what came back before trusting it.** This store has no notion of an empty result: it returns
its nearest material for any question, including one it has never seen anything about. So the
material can be plausible and still be about something else entirely — and unlike the vector store,
there is no number here to warn you. You are the check: if what came back doesn't contain what was
asked, say the knowledge isn't there rather than composing an answer out of whatever arrived.

There are exactly three outcomes, and they mean different things:

| What arrived | What it means | What to do |
|---|---|---|
| entities and relations | the knowledge is there | compose the answer; say what it was assembled from |
| "no relations for this question" | the store is alive, the knowledge is not there | answer from what you know; name what was missing |
| "the graph is not answering" | the path to the store is broken | say so plainly; do not pass it off as absence of knowledge |

The second and third are easy to confuse, and the mistake is expensive: reporting a breakage as
absence tells the person there is no data — when the data exists and is merely unreachable.

## Cost

No model turn is spent. The expensive work — reading the text and extracting entities — was done
once, when the knowledge was placed into the graph. The answer arrives in fractions of a second.

Hence the ratio worth keeping in mind: what costs is **your own** turn, not the trip to the store.
One extra `ask_graph` is cheaper than one extra deliberation about whether to call it.

## How it differs from reading values

`what_i_already_know` returns **values** recorded on an entity. The graph returns **relations
between entities** — what a field can never express and no table holds.

Occasions to call it are deliberately not listed here: a list of examples would narrow your
decision, and you see the whole question and judge better than a list.

## What the memory puts in, and why your questions work at all

You do not write here — but knowing what a record looks like tells you what can be asked for.

Every phrase a person says is placed into the graph with an **opening line** the memory builds
(`lib/graph.mjs`, step 201-5, the owner's requirement of 2026-09-14):

```
Входящее сообщение из Telegram от Рома Армстронг (roma@telegram), 2026-09-15.
Относится к: Денис, Петя, Рома Армстронг, roma@telegram.
```

Three things live there on purpose, because the store makes entities **out of the text itself** and
out of nothing else:

- **the person's name**, not only the technical key — otherwise the entity is `roma@telegram`, and
  "what did Roma say" finds nothing;
- **the channel** the message arrived through, when the caller named it;
- **the anchors** — the entities the phrase is about, **whoever they are** (218-5): a friend, a
  customer, an order, a meeting. Every fact names its `subject`, and the subject becomes an anchor.
  So "Petya ordered 20 cases for $340" makes Petya an entity with the amount attached to him.

🪦 Registry feature keys used to ride in this line; the registry was removed on 2026-09-15.

Below the phrase the memory adds what was written into tables exactly, and what stayed here only —
second-order history such as "Денис служил в президентском полку", which never goes into a table.

🛑 **Nothing service-like belongs in that line**: whatever is written there becomes an entity. A
line naming a probe once put "Прибор 201-2" at the top of an unrelated answer.

## Limits

**You cannot write through this tool.** The graph grows when the memory places knowledge into it.
Your part is to ask.

**Semantic vector search follows by itself.** When the question carries no name the graph knows, or
the graph finds nothing, reading falls to the vector store on its own — no one has to switch it on.
Calling `search_vectors` yourself is fine when you already see the words won't match.

**What `recall` returns is not this raw material.** The public answer goes through the bridge: the
graph's document names are looked up in the table, and the person reads rows with dates and places.
What you get from `ask_graph` is the engine's context — read it, never hand it to a person as is.

**Names are matched as they are, without grammatical cases.** The code already absorbs that
looseness, so ask in ordinary words and do not try to reduce names to a base form.

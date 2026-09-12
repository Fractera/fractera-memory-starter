---
name: use-knowledge-graph
description: The memory's knowledge graph — the store of relations between entities. Read this before reaching for the graph: the tool, the shape of its answer, the three possible outcomes, and the limits. Needed whenever an answer lies not in the value of one entity but in how entities are connected.
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

## Limits

**You cannot write through this tool.** The graph grows when the memory places knowledge into it.
Your part is to ask.

**Semantic vector search is not your choice.** When the words of the question and the words of the
record are entirely different and relations did not help, the vector store is what is needed; it is
switched on by the caller's request and never rises on its own.

**Names are matched as they are, without grammatical cases.** The code already absorbs that
looseness, so ask in ordinary words and do not try to reduce names to a base form.

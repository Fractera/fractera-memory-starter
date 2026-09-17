---
name: use-vector-store
description: "The memory's vector store, retrieval by meaning when the person's words and the record's words differ. Use this whenever a question has no name the graph knows, whenever you call search_vectors, whenever results came back with closeness scores and you must decide which are real hits, and whenever memory must say 'nothing suitable' instead of handing over the nearest look-alike. It covers the measured threshold of 0.40, why a single hit is weak evidence, why hits are not filtered by author, and how each hit leads back to its table row with date and place."
---

> A hint, not a law. If you know a better way for the case in front of you, take it and say so.

## The tool

```
search_vectors({ question })
```

`question` in ordinary words. Each stored piece of text was turned into a numeric fingerprint of its
meaning when it was saved; your question becomes one too, and the store returns the pieces whose
fingerprints sit closest.

That is the whole mechanism, and knowing it explains the one thing that surprises people: the store
finds text that shares **no words** with the question — and equally, it cannot find anything if the
meaning was never stored, no matter how the question is phrased.

## What comes back — and the number that matters

Pieces of text, each with a **closeness score**. The score is the point of this store: it is the one
place in memory where "found it" can be told apart from "returned the nearest thing".

| What arrived | What it means |
|---|---|
| pieces above the threshold | genuine hits — use them |
| "nothing closer than the threshold", plus the nearest score | the store is alive and holds nothing suitable |
| "the store is not answering" | the path is broken; say so, don't call it absence |

The middle row is worth dwelling on. **This store never returns nothing** — there is always a
nearest piece, even for a question about something it has never seen. Without the threshold, every
answer would look like a find, and the wrong one would look exactly like the right one.

So when you get "nothing suitable", that is a real answer: say the knowledge isn't there. Naming the
nearest score alongside it is useful — a near miss at 0.31 and a wild miss at 0.08 point the person
in different directions.

**Read every piece that comes back, not only the first.** Ranking here is approximate: the passage
that actually answers the question is often second or third, and sometimes a plausible-looking
neighbour sits on top. You can tell them apart — you understand the question; the store only
measured distances. Treat the order as a suggestion and the set as the material.

**And treat a single hit with care.** One piece above the threshold means the store found something
resembling the question, not that it found the answer. When the only piece that came back doesn't
actually contain what was asked, say so — it costs nothing, and a wrong answer delivered confidently
costs a great deal.

## Cost

No model turn for the search: only the embedding of your question is computed, which takes
milliseconds. Loading is cheap too, because nothing reads the text — it is only measured.

This is the trade that defines the store: **cheap to fill, cheap to query, and it knows nothing
about relations.** It returns the passage that sounds like your question; it cannot tell you that
two people who never appear in the same passage are connected through a third.

## How it differs from relations

| | The graph | This store |
|---|---|---|
| returns | relations between entities | pieces of text |
| answer lies | across several records | inside one record |
| finds when | entities are linked | the wording differs but the meaning matches |
| has a score | no | **yes** — so it can say "nothing suitable" |

Use this when the answer is a passage and the person's words don't match the record's words. Use
relations when the answer has to be assembled from several facts.

## Limits

**It is the second door, not a locked one.** Reading tries the graph first and falls here by itself
when the question has no name the graph knows. Reach for it yourself when you can already see the
person's words and the record's words differ — one embedding is cheaper than one more turn of doubt.

**The threshold is 0.40, measured on this corpus (218-2).** Right hits scored 0.457–0.557, junk up to
0.376. Below it the piece is marked far and never reaches a person.

**Hits are not filtered by who wrote them (218-5).** Memory's knowledge is common.

**You cannot write through this tool.** Pieces are stored when memory places knowledge into it.

**Long text is split into pieces before storing**, and that is done for you. Worth knowing only
because it explains what comes back: you receive a paragraph-sized fragment, not a whole document —
so quote it as a fragment, and don't assume the rest of the document says the same.

---
name: use-vector-store
description: The memory's vector store — retrieval by meaning when the words differ. Read this before reaching for it: the tool, the closeness score, what "nothing suitable" means, and why this store is switched on by the caller rather than chosen by you. Needed when a question and the record that answers it share no words.
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

**This store is not yours to choose.** It is switched on by the caller's request; it costs more time
than relations do, and the ladder of depth is ordered by cost. Reaching for it on your own turns a
cheap answer into a slow one.

**You cannot write through this tool.** Pieces are stored when memory places knowledge into it.

**Long text is split into pieces before storing**, and that is done for you. Worth knowing only
because it explains what comes back: you receive a paragraph-sized fragment, not a whole document —
so quote it as a fragment, and don't assume the rest of the document says the same.

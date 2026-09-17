---
name: use-tables
description: The one table memory keeps — the one every incoming message lands in — and what happens around it. Read this before writing anything down - the single hand that records a phrase, why memory no longer creates tables or columns of its own, what happens to a short phrase versus a long text, what is lost by that choice, and what "recorded" actually means when you report it. Needed whenever a phrase contains something to remember, whenever you are about to claim something was stored, and whenever someone asks memory to make a table.
---

> A hint, not a law. If you know a better way for the case in front of you, take it and say so.

## One table

Memory keeps **one table**: every message lands in it. It creates no tables and no columns of its own.
What a person says lives as **events around that table** — in the knowledge graph, in the vector
store, and, when it is long, in the object store.

🔒 **BOTH SIDES OF THE CONVERSATION ARE IN IT SINCE 219.** Four directions: `remember` and `recall`
(what the person said and asked), `feedback` (a comment on an answer) and **`answer` — what memory
itself replied**, with its full text, the depth it reached, how long it took and its reasoning trail.
An answer row is linked to its question, so a conversation reads as a chain rather than a heap.
✗ Before that only incoming messages were kept: the answer a person complained about existed nowhere,
and any attempt to review it was guesswork.

🛑 **AN ANSWER IS NOT KNOWLEDGE, AND THIS IS THE TRAP OF THE NEW SHAPE.** When you tell a person what
is known, take `remember` rows only. Your own answers and the comments about them are the conversation
ABOUT memory. ✗ Measured in 219-6: 20 answers and 17 comments had leaked into "what is known" — memory
would have been retelling its own retellings, drifting further from what was actually said with every
round.

The architect's decision, 2026-09-15: *"memory is events around the base… for the graph, for the
vector and for the object store — simpler, clearer, faster, focused on the intelligent agents that
do this work."* Specialised tables are other applications' work now, not memory's.

## The hands

```
what_i_already_know({ from? })        → the last things said and sent
remember_said({ text, via?, from? })  → hand the phrase over as it was said
```

**Two, not four.** There used to be four — look, write a value, create a kind, make it a list — and
each of them edited a column of a per-person table. That table is gone. Where a phrase lands is
memory's decision and it is made in one place; a hand that decided it again would drift from that
place on the first edit.

🛑 **Hand over the person's words, not your summary.** Your retelling is your conclusion, and a week
later nothing can tell it apart from what the person actually said.

🔒 **EVERYTHING SAID IS RECORDED — WHOEVER IT IS ABOUT (218-5).** Petya's order, a customer's city, the
date of a meeting: all of it is parsed into facts, and every fact names its `subject`. Neither you nor
the parser decides whether something is "worth keeping". The architect's words, 2026-09-16: *"if the
architect told you to make a record, you do not think what it relates to — you just record it according
to our architecture."* A rule that kept only facts about the speaker lived here from 175-2 and dropped
"Petya", "340 dollars" and "Madrid" silently.

## What happens to what you hand over

| The phrase | What memory does |
|---|---|
| under 2000 words | one short model call parses it; the phrase goes into the graph **and** the vector store; every fact parsed out of it becomes an anchor — the name the phrase is later found by |
| over 2000 words | it goes to the object store whole and is **not parsed at all**: what has nowhere to land is not worth a model call |
| a file, a link, a video | object store, vector card, graph document and a message row — four places or none |
| any of them | a row in the one table: what came, when, from which channel, where it happened, and pointers to the three stores |

**A correction is still meaningful.** "No, Ukrainian after all" is recorded as a correction — nothing
is overwritten, but the answer says a correction arrived. Nothing is silently replaced, because there
is no single place left to replace.

## What this costs, and say it plainly

**Memory cannot add things up.** "How much did I spend last month" comes back as what was said, one
item at a time — not a sum. The knowledge "these are amounts, they add up" lived in a place that no
longer exists. Do not present a list as a total, and do not compute the total yourself and call it
memory's answer: say what memory returned and, if you add arithmetic, say that you added it.

## When someone asks for a table

They cannot have one from memory, and this is not a limitation to apologise for — it is the design.
Say what memory does keep: the message, its meaning, its anchors, and the object if it was long.
Building a specialised table over that is another application's job.

## A comment on an answer is a row too (207-4)

A person may reply to what you answered — that is the third kind of incoming message, and it lands in
the same single table, linked to the answer it is about. Two things follow for you:

- **The invitation is periodic, and memory decides it itself (217-1).** It comes at the start of a
  session (30 minutes of silence) and after an answer that took long (8 s) or went deep; every answer
  says why in `invited_because`. Both thresholds are measured, not chosen.
- **Say what will happen to it honestly.** The comment is stored and linked to its answer; a wish
  repeated in DIFFERENT words becomes a signal (`GET /v1/signals`); a human acts on signals in the
  workshop, in a git branch, with the `memory-evolution` skill. Nothing changes by itself — do not
  imply that the model just learned something.

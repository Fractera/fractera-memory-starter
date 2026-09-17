---
name: use-depth-ladder
description: How memory climbs from cheap answers to expensive ones — what it actually does at each step, what opens the deeper ones, and when to stop. Read when a question is not answered by what you already know, when deciding whether to go deeper, and whenever you are about to report which depth you used. The rule that changes behaviour is counter-intuitive - the ladder is ordered by COST, not by expected quality, and since 206-3 every built step costs ZERO model turns.
---

> A hint, not a law. If you know a better way for the case in front of you, take it and say so.

## The ladder as it is built today

| What was asked | What memory does | Model turns |
|---|---|---|
| **no question** | the last **50** records from the one table of incoming messages — everyone's, not one person's | 0 |
| **a question with a name** the graph knows | the graph names the documents it drew from → those names are looked up in the table → the **rows** come back, each with when it was said, what time and place it is about | 0 |
| **no name**, or the graph does not know it | meaning search in the vector store; each hit is looked up in the table the same way, by its id | 0 (one embedding) |
| nothing found | an honest *"I don't know"* with a list of what is missing | 0 |

🔒 **THE STORES ARE LINKED BY IDS, NOT BY RETELLINGS (218-2).** Every row of the one table carries
`rag_source`, `vector_id` and `object_id`. The graph prints its *Reference Document List*; those names
are exactly `rag_source`. So the graph says *which* records, and the table says *what is true in them*
— when, where, from whom. Before 218-2 the three stores were asked side by side, the answer was a pile
of look-alikes, and the raw engine dump reached the person.

🔒 **EVERY MESSAGE IS LINKED TO THE VERY EARLIER ONES (218-10).** On writing, a message gets two kinds
of links, each stored with its reason:

| Reason | When | What it means |
|---|---|---|
| `meaning` | close by meaning **and** sharing a name (Olya ↔ Olya), or an almost verbatim repeat (≥ 0.70) | about the same thing — pulled into answers |
| `time` | the previous message, within 30 minutes | the conversation goes on — a question like "and when will he pick them up?" continues it |

On answering, whatever a found record is linked to **by meaning** comes along as *"connected to what
was found"*, one hop. Links by time never enter the content of an answer.
✗ **Why a shared name is required:** at one threshold "Olya ordered cables" linked to "Petya ordered
cases" (0.545) — a similar topic is not the same conversation. And "I like jazz" entered an answer about
Olya only because it was said next — that is why time links stay out of answers.

🔒 **READING GOES IN TWO ROUNDS AT MOST, CHECKED AGAINST THE TABLE (218-11).**

| Round | Starts from | Asks the graph about | Kept only if |
|---|---|---|---|
| 1 | names in the question | the question | the table row **names the asked name** |
| 2 | **new** names in what round 1 found | those new names, not the question | the table row names the name it was reached through |

"Who does Stas work for" → round 1: *Stas works for Gennady Pavlovich* → round 2 through *Gennady*:
*Gennady Pavlovich lives in Seville*. The answer shows it as *"one step further along the links — via
Gennady"*, and `cycles_used` says 2. No new names → no second round (`cycles_used: 1`). Zero model turns;
a found row's `object_id` travels along, the object is not searched again.

✗ **Both checks were paid for by one measurement.** Without the check in round 1 the graph handed over
a neighbour ("Petya works in Madrid" for "what does Marina like"), and round 2 chased it to Petya's
order. Asking round 2 the original question returned chunks about the question — Seville never came.
**The graph returns a neighbourhood, not an answer; what in it was said about the asked name is the
table's call.**

🔒 **"THAT CAFÉ" IS RESOLVED FROM THE PERSON'S OWN HISTORY (218-15).** When a place is named only by
pointing — *that café, our office* — the parse marks `place_ref`, and the code looks through earlier
records whose place contains that word. **One place** → it is filled in with source `guess` and the
number of the record it came from; the answer says *"place (from history)"*. **Several places** → nothing
is guessed, the place stays empty ("I don't know where"), the candidates are named in the trace. Zero model
turns. On a question, known places go from the most recent, and any word of the place matches ("Lima" in
"в Лиме").

🔒 **DEEPER ONLY WITH CONSENT — OFFER, THEN REASONING (218-12).** When nothing found is **close** —
a record counts as close only if it names the asked name **and** sits within 0.40 of the question by
meaning (a name alone is not an answer: "Madrid" in a taxi question found "Petya works in Madrid") —
the answer carries a field, not a courtesy:

```
deeper: { depth: "deep", what, cost: { model_turns: 1, seconds_from: 11, seconds_to: 32, quota }, accept: { verb: "recall", depth: "deep" } }
```

Asked again with `depth: "deep"`, memory reasons over the records and brings in the model's knowledge
of the world. The answer then has **two groups that never mix**: *from your memory, after reasoning*
(each claim must cite record numbers that were actually shown — otherwise it is dropped) and *from the
model's general knowledge — NOT from your memory*. Measured: 18.3 s, inside the named cost. Close links
found and `deep` asked anyway → no model call, the quota is not spent. `extreme` runs the same as `deep`.

**Ordered by cost, not by quality.** This is the part that feels wrong and is right: relations sit
before the vector store even though the vector store often answers better. Cheap-and-worse runs
first, or the economy law stops working from the very first request.

🛑 **THE GRAPH CANNOT SAY "I DON'T KNOW" — measured, step 201-2.** Asked about a name it has never
seen, it returns the five nearest entities and tens of thousands of characters. That is why the name
from the question is checked against graph **labels** first: the check costs no model turn (41–280 ms)
and a miss gives an honest *"I don't know"* instead of a confident wrong answer.

🔒 **RELATIONS ARE SENSITIVE TO THE SHAPE OF THE QUESTION, THE VECTOR STORE IS NOT.** Measured on one
document: a capitalised name — found; the same phrase all in lower case — not found; the same phrase
as a vector — found. People write in lower case. Short question with a name goes by relations,
everything else by meaning.

🔒 **THE VECTOR STORE NO LONGER FILTERS BY WHO WROTE IT (218-5).** Memory's knowledge is common — the
same law the table has followed since 207-3. The filter had split one truth in two: a thing said
through the bot was found in the records and **not** found by meaning.

🔒 **THE THRESHOLD IS 0.40, MEASURED ON THIS CORPUS (218-2).** Right hits scored 0.457–0.557; junk
0.281–0.376. At the old 0.28 every question returned five lines, including a question about something
memory had never heard of — so memory could not say "I don't know". The sample is nine questions; the
number is refined by the next measurement, not trusted forever.

## What you say out loud

Depth goes outward **in words** — standard, deep, extreme — never as a level number. "Level 4" tells a
person nothing; "slower and more expensive" tells them everything. `depth_asked` is the limit that was
requested, `depth_used` is where memory actually stopped — and those two are not the same field by
design: a promise to go deep that was not kept has to be visible.

## Not built, and said so plainly

`extreme` has no separate behaviour: it runs exactly as `deep` (one model turn of reasoning, with
consent), and the trace says so. There is no bounded ten-minute investigation and no recursion beyond
the two reading rounds. Saying otherwise would be a promise the product does not keep.

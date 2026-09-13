---
name: use-depth-ladder
description: How the memory climbs from cheap answers to expensive ones — the five levels, what opens each, and when to stop. Read when a question is not answered by what you already know, when deciding whether to go deeper, and whenever you are about to report which level you used. The rule that changes behaviour is counter-intuitive - the ladder is ordered by COST, not by expected quality.
---

> A hint, not a law. If you know a better way for the case in front of you, take it and say so.

## The ladder

| Level | How the answer is obtained | Who opens it |
|---|---|---|
| **1** | the database **without a model** — a plain lookup over what is recorded | you |
| **2** | the database **with** a model: one call, no history | you, when the first came back empty |
| **3** | relations between entities, plus reasoning over what they returned | you, when the second came back empty |
| **4** | the vector store is added to the third | **the caller's explicit request** |
| **5** | the fourth plus recursion: loop until a result, no longer than ten minutes | **a second, separate request** |

## What actually governs the climb

**Ordered by cost, not by quality.** This is the part that feels wrong and is right: relations sit
below the vector store not because they answer better, but because they cost no model turn while the
vector store costs time. Cheap-and-worse goes before expensive-and-better — otherwise the economy
stops meaning anything from the very first question.

**You climb only when the level below came back empty.** Not "came back thin", not "could be
richer" — empty. The temptation to add one more level for a fuller answer is the single most
expensive habit available to you, because it is invisible: nobody sees the seconds and the quota you
spent to improve an answer that was already sufficient.

**What costs is a model turn, not a query to a store.** One extra lookup is free. One extra round of
your own reasoning is not. When you catch yourself deliberating about whether to make a cheap call —
make it; the deliberation already cost more.

**Levels four and five are not yours to open.** They arrive as the caller's request in the
parameters. Reaching for them on your own turns a cheap answer into a slow one, and the person who
would have paid for that never agreed to.

## Reporting the climb

**Say which level you reached, not which one was asked for.** The request and the fact are two
different numbers, and the honest one is the fact. If the caller asked for the deepest search and
the first level answered, the answer is "one" — that is good news, not an underachievement.

**An empty result at the top of the ladder is a real answer.** "I went as far as there is to go and
found nothing" tells the caller something true and useful. Inventing a plausible answer instead
costs them more than the silence would have.

## What to do when a level has nothing built behind it

Some levels may not exist yet in this installation. When you cannot climb because the capability is
absent — say so plainly, naming what is missing. That reads as a boundary; silence reads as an
answer, and a wrong one.

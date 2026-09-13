---
name: use-tables
description: The memory's own store of what it knows about a person — values in columns and, when a kind keeps growing, tables. Read this before writing anything down - the four hands, what each one physically does to the store, the one choice that cannot be undone (correcting a value versus adding another), how a kind becomes a table, and how a name that ends up in SQL is built. Needed whenever a phrase contains something to remember, whenever a second value of a kind arrives, and whenever you are about to name anything stored.
---

> A hint, not a law. If you know a better way for the case in front of you, take it and say so.

## The hands, and what each one does to the store

```
what_i_already_know({ who })                        → every kind recorded for this person, and its shape
write_value({ who, kind, value, claim, basis })      → writes into a kind that already exists
make_new_kind({ who, kind, value, claim, basis })    → creates the kind, then writes into it
promote_to_list({ who, kind, value, claim, basis, words }) → the kind becomes a table, or gains a row
```

They are not three spellings of one operation. Each does something physically different and leaves a
different trace — measured on the live store:

| Hand | What happens underneath | Trace |
|---|---|---|
| `write_value` | the value is replaced in place; the previous one goes into history | nothing grows |
| `make_new_kind` | the store gains **three columns**: the value, whether it was said or inferred, and on what basis | +3 columns |
| `promote_to_list` (first time) | a **table is born**, the old value moves into it keeping **its own original time**, and the column is emptied | +1 table |
| `promote_to_list` (after that) | a row is added to the table that already exists | +1 row |

The last two are the same hand with two outcomes, so read what comes back: "now a list: it holds X
and Y" means a table was born; "added to the list" means it already existed. Saying "I created a
table" when you added a row is a small lie that becomes a wrong answer later.

**Start with `what_i_already_know`.** It is the only way to know which hand applies, and it costs
nothing but the call: it tells you which kinds exist and which are already tables.

## The choice that cannot be undone

When a second value arrives for a kind that already holds one, there are two completely different
things a person might have meant:

- **a correction** — "not Madrid, Barcelona" — the old value was wrong. `write_value`: it is
  replaced, and the previous one is kept in history.
- **an addition** — "and Anya too" — both are true. `promote_to_list`: the kind becomes a list, and
  the first value moves in with its own time.

Getting this backwards is not symmetric. A wrong correction hides a true value behind history; a
wrong addition leaves a stale value standing next to the current one, and every later answer has to
choose between two truths. When the phrase is genuinely ambiguous, prefer keeping both and say in
your answer that you read it as an addition — the caller can tell you otherwise.

## Will this keep growing?

That is the real question behind "column or table". Not the count — whether the thing that arrived
will later have properties of its own. A friend is a name. A teammate has a role, and tomorrow a
schedule.

**Raising the form loses nothing; lowering it always loses.** A value promoted into a table keeps its
origin, its kind and its time. Collapsing a table back into a column drops everything the table held.
So when in doubt, grow: the mistake is cheap in one direction and permanent in the other.

**After a kind becomes a table, its old column stands empty on purpose.** Reading that emptiness as
"I don't know" — about something you moved yourself — is the failure this rule exists to prevent.

## Whether it was said or inferred

Every value carries how you came by it: `said` when the person said it, `guess` when you worked it
out — and a guess **must** name what it was worked out from. A guess with no basis is refused
outright, and rightly: a week later an inference no one can trace is indistinguishable from
testimony. Empty means "not stated", not "said by the person".

## Names end up in SQL, and the name is permanent

A name is born in a person's free speech, passes through you, and lands in a `CREATE TABLE`.

- **Case, spaces and hyphens are brought to standard** — those are forms of the same name.
  **Anything else — punctuation, quotes, another alphabet — is refused, not repaired.** A
  half-cleaned name is a name nobody will ever find again, standing in the store forever.
- **A name is a phrase saying whose it is and what it is**, not a label: `language`, `friend_name`,
  `car` each need a follow-up question; `language_he_speaks_with_us`, `people_he_calls_his_friends`
  do not. Fewer than four words is refused.
- **Renaming breaks every reference at once**, so the minute spent on the name now is the cheapest
  minute in the operation.
- **Before inventing one, look at what exists and take the existing name letter for letter** if it
  fits. A new name for an existing meaning creates a second place for one thing, and the two drift
  apart quietly, until answers start disagreeing with each other.

## Cost

Each hand is one call and no model turn; the store answers in milliseconds. What costs is your own
turn — so one `what_i_already_know` before writing is cheaper than a kind created twice under two
names.

## Limits

- You cannot rename, delete or merge anything. Growing is the only direction available to you.
- A refusal comes back as words, not silence: read it, it says what to do instead.
- This store holds **values about a person**. Relations between entities are the graph, passages of
  text are the vector store, whole files are the object store.

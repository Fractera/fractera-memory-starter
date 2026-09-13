---
name: grow-the-shape
description: How the memory changes its own shape when new meaning arrives — when a value becomes a column, when a column becomes a table, and how a name that will end up in SQL is built safely. Read whenever a phrase brings a kind of value the store has never held, when a second value of the same kind arrives, and whenever you are about to invent a name for anything stored.
---

> A hint, not a law. If you know a better way for the case in front of you, take it and say so.

## The decision you are actually making

A new kind of meaning has arrived. The question is not "where do I put this" but **"will this keep
growing?"**

- "my friends Dima and Misha" → two values of one kind, and more will come. A **column** with rows
  is enough.
- "on the team Yulia is a product manager, Dima a manager, Anna a designer" → these are not values,
  they are entities with their own properties. A **table** is needed.

The difference is not the count. It is whether the thing that arrived will later have properties of
its own. A friend is a name; a teammate has a role, and tomorrow a schedule.

## Growing, not rebuilding

**Raising the form loses nothing; lowering it always loses.** A value promoted from a column into a
table keeps its origin, its kind and its own time. Going the other way — collapsing a table back
into a column — drops everything the table held. So when in doubt, grow: the mistake is cheap in one
direction and permanent in the other.

**The promoted value is still readable where it used to be.** After a kind becomes a table, the old
column stands empty on purpose. Answering "I don't know" about something you yourself moved is the
failure this rule exists to prevent — read the table.

## Names end up in SQL, and that is the whole danger

A name is born from a person's free speech, passes through a model, and lands in a `CREATE TABLE`.
Treat every name as untrusted input:

- **a whitelist of characters, never a blacklist** — a blacklist is a list of the attacks you
  thought of;
- **non-Latin script is transliterated by a table, not guessed** — guessing produces a different
  name for the same word on the second try, and then there are two places for one meaning;
- **a name that does not survive the whitelist is not repaired, it is refused.** A half-cleaned name
  is a name nobody will find again.

## A name is a phrase, not a label

The name will be read by whoever searches later — including you, months from now, with none of
today's context. So it says **whose it is and what it is**, in words:

- poor: `language`, `friend_name`, `city`, `car` — every one of these needs a follow-up question;
- good: `language_he_speaks_with_us`, `people_he_calls_his_friends`, `city_where_he_lives_now`.

**The name is permanent.** Searching happens by it, and renaming breaks every reference at once. A
minute spent on the name now is the cheapest minute in the whole operation.

## Before inventing anything, look at what exists

Check what kinds are already recorded and **take the existing name letter for letter** if it fits.
A new name for an existing meaning creates a second place for one thing, and the two drift apart
permanently — not loudly, just quietly, until answers start disagreeing with each other.

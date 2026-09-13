---
name: use-object-store
description: The memory's object store — whole things kept with an id - documents, pictures, PDFs, and the documents you compose as an answer. Read this before calling find_objects, open_object or keep_object - what search actually looks at, how to pick the right one among near-twins, what a picture or PDF can and cannot tell you, and how an answer becomes an object. Needed whenever a question names a document, file, picture, brochure or PDF, and whenever the answer is a thing to hand over rather than a sentence.
---

> A hint, not a law. If you know a better way for the case in front of you, take it and say so.

## The tools

```
find_objects({ question })        → objects closest in meaning, each with id, name, kind, size, score
open_object({ id, from? })        → a text object's content in pieces; a non-text object's card only
keep_object({ name, text, about }) → stores a Markdown document you composed, returns its id
```

`question` in ordinary words. An id is permanent: it is how an object is referred to in an answer,
now and later.

## What search actually looks at — the card

Nothing reads the object itself when it is stored. What becomes searchable is its **card**: the file
name, the words given when it was stored, and — for a text file only — its opening, roughly the first
1500 characters. That one fact explains everything surprising about this store:

- **A picture, PDF, audio or video is found only by the words it was stored with.** Nobody has looked
  inside it. If the description says "diagram of the development loop", that is all memory knows
  about that picture.
- **A passage deep inside a long document is invisible to object search.** The card holds the
  opening, so a question about something discussed on page ten may not find the document at all. That
  miss means "no card matches", **not** "no such document exists" — say it that way. Finding a passage
  by meaning is the vector store's job, and that level is switched on by the caller, not by you.

## What comes back

| What arrived | What it means | What to do |
|---|---|---|
| objects above the threshold | candidates — not yet an answer | choose among them (next section) |
| "nothing closer than the threshold", with the nearest | the store is alive and holds nothing that fits | say it isn't there; the nearest name and score help the caller |
| "the object store is not answering" | the path is broken | say so; never report it as absence |
| "belongs to the platform media library" | that id is not memory's | don't retry; it cannot be opened from here |

The store always has a nearest object, even for a question about something it never held. The
threshold is what separates "found" from "the closest thing lying around" — so a below-threshold
nearest is never offered as a match, however tempting its name.

## Choosing among what came back

**Ranking is approximate, and near-twins sit side by side.** The same subject often exists several
times: in two languages, as a document and as its PDF, as a text and as its illustration. Their scores
differ by a few hundredths, and the one the question asked for is often not first. Measured on the
real store: a request for the *English* printable brochure put the *Russian* PDF on top (0.658) and
the English one second (0.608) — the subject outweighed the word "English".

So read every object that came back — name, kind, description, opening — and pick by what the question
actually asked for: the language, the kind (PDF, picture, editable document), the subject. You
understand the question; the store only measured distances. If two fit equally, return both and say
how they differ.

## Opening an object

**Text objects** arrive in pieces with a stated range ("characters 0–12000 of 32452, continue from
12000"). Read further only as far as the question needs, and when you answer from part of a document,
say which part — a conclusion from the first third passed off as the whole is a quiet error.

**Non-text objects** return their card and nothing else. Answer only from the stored description and
say that the content itself was not read. Describing what "the picture shows" beyond those words is
invention, and the caller cannot tell it from fact.

## When the answer is a document

Some answers are not a sentence but a thing: a table, a summary with detail, a list worth keeping.
Compose it in Markdown, store it with `keep_object`, and return **the id plus a short summary** of what
is inside and where the detail is — not the whole text again. The caller keeps working with your
answer; an id it can open is worth more than a wall of text it has to carry.

- `about` is what the document will be found by later — say what it is and what it covers.
- `name` is a phrase with hyphens that says what the file is: `multilingual-docs-overview.md`, not
  `summary.md`.
- When your document points at objects that already exist, cite their ids instead of copying them.

## Cost

No model turn: a search is one embedding of the question, a few hundred milliseconds. Storing costs
one embedding of the card, whatever the size of the file. What costs is your own turn — so one extra
`open_object` to check the right twin is cheaper than a confident wrong id.

## How it differs from the other stores

| | The graph | The vector store | This store |
|---|---|---|---|
| returns | relations between entities | a passage of text | the whole thing, with an id |
| finds by | entities and links | meaning of every passage | meaning of the card only |
| has a score | no | yes | yes |
| you can write | no | no | **yes — documents you compose** |

## Limits

- It does not look inside pictures, PDFs, audio or video.
- It cannot delete, rename or change a stored object.
- Only objects stored by memory can be opened; other files on the platform are not yours.

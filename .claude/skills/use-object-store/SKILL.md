---
name: use-object-store
description: The memory's object store — whole things kept with an id - documents, pictures, PDFs, and the documents you compose as an answer. Read this before calling find_objects, open_object or keep_object - what search actually looks at, why a miss is not an absence, how to avoid reading whole documents that were never the answer, how to pick among near-twins, and how an answer becomes an object. Needed whenever a question names a document, file, picture, brochure or PDF, and whenever the answer is a thing to hand over rather than a sentence.
---

> A hint, not a law. If you know a better way for the case in front of you, take it and say so.

## The tools

```
find_objects({ question })         → objects closest in meaning: id, name, kind, size, score, description, opening line
open_object({ id, from? })         → a text object's content in pieces; a non-text object's card only
keep_object({ name, text, about }) → stores a Markdown document you composed, returns its id
```

An id is permanent: it is how an object is referred to, now and in later conversations. The tool
answers already say what each outcome means — "nothing closer than the threshold", "not answering",
"belongs to the platform library", "this kind is not read". Take them at their word.

## What search actually looks at — the card

Nothing reads an object when it is stored. What becomes searchable is its **card**: the file name,
the words given at storing and, for a text file only, its opening — about the first 1500 characters.
Two consequences follow, and neither is visible in a single tool answer:

- **A picture or PDF is known only by its description.** Answer about it from those words and say so.
- **A detail deep inside a long document is invisible to search.** A card describes what a document
  *is*, not everything it *contains*. So a miss on a detail means "no card matches", never "no such
  document" — and say it in exactly those terms, because the caller will otherwise stop looking.

## When the hits are weak — search again before reading

A score barely above the threshold (within a few hundredths of it) is weak evidence: a card that
shares a mood with the question, not its subject. When **every** candidate hugs the threshold, the
question is most likely about a detail inside some document, and the cards that came back are
neighbours by accident.

Don't open them all to check — reading three long documents to learn they were never the answer costs
many turns. Ask again, this time describing **the kind of document that would contain such a
detail**: its topic, its purpose, what it is a standard or guide for. Cards match that well, because
that is what a document's opening talks about. Open a candidate once its card plausibly covers the
subject; read only as far as the question needs, and say which part you read.

## Choosing among what came back

The same subject often exists several times: two languages, a document and its PDF, a text and its
illustration. Their scores differ by hundredths, and the one asked for is not necessarily first.
Pick by what the question actually asked — language, kind (printable PDF, editable document,
picture), subject — reading name, description and opening line of every hit. If two fit equally,
return both and say how they differ.

## When the answer is a document

Some answers are a thing, not a sentence: an overview, a table, a list worth keeping. Compose it in
Markdown, store it with `keep_object`, and return **the id plus a few lines** — what the document
covers and what it is built from. Leave the table itself inside the object: the caller can open it
by id whenever it needs the detail, and a copy in your answer is a second version that will not be
updated with the first.

- `about` is what the document will be found by later — its subject and what it covers.
- `name` is a hyphenated phrase saying what the file is: `multilingual-docs-overview.md`, not
  `summary.md`.
- Point at objects that already exist by their ids instead of copying their content.

## Cost

No model turn: a search is one embedding of the question, a few hundred milliseconds; opening is a
file read. What costs is your own turn — each extra call is a turn, so a second, better-aimed search is
cheaper than several blind openings.

## How it differs from the other stores

| | The graph | The vector store | This store |
|---|---|---|---|
| returns | relations between entities | a passage of text | the whole thing, with an id |
| finds by | entities and links | meaning of every passage | meaning of the card only |
| you can write | no | no | **yes — documents you compose** |

Finding a passage by meaning inside all documents is the vector store's job, and that level is
switched on by the caller, not by you.

## Limits

- It does not look inside pictures, PDFs, audio or video.
- It cannot delete, rename or change a stored object.
- Only objects stored by memory can be opened.

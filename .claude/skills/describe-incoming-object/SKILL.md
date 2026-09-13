---
name: describe-incoming-object
description: What to do when a file arrives into memory — a picture, PDF, document, voice note or video. Read this before storing any incoming object - how it gets a full description (detailed enough to reconstruct it) and a ~50-word summary, which model reads which kind, how the object, its search card, its graph document and its row in messages_that_came_into_memory are written together or not at all, and what to answer. Needed whenever a message carries a file, whenever someone asks to keep, describe or index a file, and whenever a store refuses part of an object.
---

> A hint, not a law. If you know a better way for the case in front of you, take it and say so.

## What an incoming object becomes

One file turns into four linked records, or into none:

| Record | Where | What it holds |
|---|---|---|
| the object | object store (media library) | the file itself **and its full description** next to it |
| the search card | vector store, collection `memory-objects` | name, title and **summary** — this is what search sees |
| the graph document | knowledge graph, source `object/<object id>` | title, summary, tags, with **anchors** so it can be reached |
| the row | table `messages_that_came_into_memory` | kind, title, summary, tags, who, source, links to the three above, status |

If any step fails, what was already written is removed and the row is kept with `status = failed` and
the reason. "Arrived and did not land" is itself something memory must know.

## Step 1 — describe

`POST /api/fractera/object-test/describe` with the file. The kind decides who reads it:

| Kind | Read by |
|---|---|
| audio | OpenAI `whisper-1` transcribes with segment timestamps, then Claude describes the transcript |
| video | ffmpeg cuts the sound track (→ `whisper-1`) and 6 evenly spaced frames; Claude reads one timeline where frames sit between the spoken lines |
| image, PDF, text | Claude reads the file itself |
| anything else | refused before any model is called — describe it in words yourself |

The answer is `{ title, full, summary, tags, anchors, language, kind, described_by, ms }`, and it has
already been checked for shape: a malformed answer is refused whole, never half-used.

- **`full`** must let another AI **reconstruct the object from the text alone**: for a picture every
  element, its position, colours and all visible text verbatim; for a document its structure and its
  content; for speech and video every `[mm:ss–mm:ss]` timestamp kept at the start of its line.
- **`summary`** is about 50 words: what the object is and what it is about. Search finds the object by
  this, so a vague summary makes the object unfindable.
- **`anchors`** are the named entities in the object. Without anchors a graph document can never be
  reached; if there are none, the title's main noun phrase is the anchor.

Read both texts before storing. A description is a claim about what the model saw or heard; when it
says something is unreadable, keep that sentence — do not smooth it away.

## Step 2 — store whole

`POST /api/fractera/object-test` with the file and `about` (the summary), `full`, `title`, `tags` and
`anchors` (JSON arrays), `described_by`, `describe_ms`, `language`, `who`. The answer carries
`messageId` in both outcomes.

- **Anchors decide whether the graph is written.** Omit the field and the object is stored without a
  graph document — correct for a file nobody described. Send anchors that are empty strings and the
  graph refuses: the whole object is rolled back.
- **The full description lives with the file, the summary lives in the row.** Do not copy the full text
  into the summary to "be safe": the card would stop describing what the object *is*.

## Step 3 — answer

Say what landed, by id: the message number, the object id, and in one sentence what the object is.
Read the stored record back (`GET /api/fractera/object-test?message=<n>`) rather than repeating what you
sent: the point of the answer is what memory now holds.

## Cost

Describing is one model turn: Claude runs on the owner's subscription — the same quota the Telegram bot
uses — and a PDF takes about a minute. Audio and video add one OpenAI transcription. Storing costs one
embedding and one graph ingestion, whatever the file size. Do not describe the same file twice to
"improve" the text; edit the fields instead.

## Refusals and what they mean

| Code | Meaning |
|---|---|
| `describe-kind-unsupported` | this kind is not read — write the description yourself |
| `think-quota-exhausted` | the subscription limit on the server is used up — wait for the reset, nothing is broken |
| `model-quota-exhausted` / `model-key-missing` | OpenAI has no money / no key — audio and video cannot be transcribed |
| `describe-answer-unusable` | the model answered in the wrong shape — retry once or describe in words |
| `graph-refused: no-anchor` | anchors were sent but none is a real name — the object was rolled back |
| `card-failed`, `store-refused` | a store refused — nothing half-stored remains |

## Limits

- Files up to 20 MB; speech up to 25 MB after compression (~50 minutes); always 6 frames per video,
  so a long video loses scenes.
- A graph document deleted in the first seconds after it was written may survive, because the graph is
  still processing it. A rollback at the very last step can therefore leave one behind.
- This procedure is not yet wired to `/v1/remember`, and there is no `describe_object` hand: today it runs
  through the stand doors above. When it is connected, the steps stay the same.

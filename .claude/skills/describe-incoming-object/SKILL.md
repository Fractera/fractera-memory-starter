---
name: describe-incoming-object
description: What to do when a file arrives into memory — a picture, PDF, document, source code, voice note or video — from the API, from Telegram, from a phrase with attachments or on the stand. Read this before storing any incoming object - which door to call (keep_object with a file or a URL, remember with media, or the two-step stand path), what memory writes by itself (full description, ~50-word summary, the object, its search card, its graph document with origin, its row in messages_that_came_into_memory — all four or none), how source and author are recorded, which addresses are refused, and what to answer. Needed whenever a message carries a file or a link to a file, whenever someone asks to keep, describe or index a file, and whenever a store refuses part of an object.
---

> A hint, not a law. If you know a better way for the case in front of you, take it and say so.

## What an incoming object becomes

One file turns into four linked records, or into none:

| Record | Where | What it holds |
|---|---|---|
| the object | object store (media library) | the file itself **and its full description** next to it |
| the search card | vector store, collection `memory-objects` | name, title and **summary** — this is what search sees |
| the graph document | knowledge graph, source `object/<object id>` | title, **full description**, tags, object id, summary, and an origin line: *«Откуда это известно: API памяти / Telegram / тестовый стенд памяти, прислал <author>, <date UTC>, файл «…»»* |
| the row | table `messages_that_came_into_memory` | kind, title, summary, tags, who, source, author, links to the three above, status |

The graph is written **always**. Anchors come from the model; if none are sent the title is the anchor. If
any step fails, what was already written is removed and the row stays with `status = failed` and the reason.
"Arrived and did not land" is itself something memory must know.

## Which door

| The file comes… | Call | Who describes it |
|---|---|---|
| from an outside tool or a bot, as bytes | `POST /v1/keep_object`, multipart, file in the `file` part | memory itself, in the same call |
| as an address (Telegram gives files as URLs) | `POST /v1/keep_object`, JSON `{ "url": … }` | memory downloads it, then describes it |
| next to a phrase the person said | `POST /v1/remember` with `media: [{ "url": … }]` | the same path per attachment; the fate of each is in `objects` |
| on the stand, where a person reviews the text | `object-test/describe` → edit → `object-test` | the model, then the person |

Default to **one call to `keep_object`**. The two-step stand path exists only because a human wants to read and
correct the description before it is stored; an automated caller has no second step.

Always say where the object came from:

- **`source`** — `api`, `telegram`, or `stand`. Default is `api`.
- **`author`** — who sent it, in words: in Telegram the person's name, not a numeric id. Default is `who`.
- **`who`** — the person the object belongs to.

These land in the row and in the origin line of the graph document. An object without its origin becomes, within
a week, indistinguishable from something the owner said himself.

## What memory writes by itself

Reading goes by kind; the kind is decided by memory from the name and type — the caller does not name it:

| Kind | Read by |
|---|---|
| audio | OpenAI `whisper-1` with segment timestamps, then Claude describes the transcript |
| video | ffmpeg: the sound track (→ `whisper-1`) and 6 evenly spaced frames; Claude reads one timeline, frames between spoken lines |
| image, PDF, Markdown, HTML, text | Claude reads the file itself |
| source code (`.ts`, `.tsx`, `.py`, `.sql`, JSON, YAML…) | Claude **analyses** it — what it does, exports, imports, stack; never rewrites it; never run |
| anything else | refused before any model is called: `describe-kind-unsupported` |

The model's answer is checked for shape and refused whole if wrong: `full` at least 80 characters (code at most
5000), `summary` 15–120 words, tags and anchors as arrays of strings.

- **`full`** lets another AI reconstruct the object from the text alone: for a picture every element, its position,
  colours and all visible text verbatim; for speech and video every `[mm:ss–mm:ss]` timestamp at the start of its line.
- **`summary`** is about 50 words — search finds the object by it; a vague summary makes the object unfindable.

**Send your own `summary`** (and `full`, `title`, `tags`, `anchors`) when you already have them: then no model is
called. Do not send a summary you did not read the object for — the card would lie about what it is.

## Addresses that are refused

Memory downloads a URL itself, and it stands next to the data layer and the graph, so an address is checked where it
resolves, on every redirect:

| Answer | Why |
|---|---|
| `url-forbidden` | the address resolves to the machine itself, loopback, a private network or link-local (`127.0.0.1`, `localhost`, `169.254.169.254`…) |
| `bad-url` | not http/https, or credentials inside the address |
| `is-a-page` | the address answers `text/html`: a web page is not a file. Pages are opened by a browser — not built yet |
| `url-unreachable`, `url-status`, `url-too-large` | the address did not answer, answered an error, or is over 200 MB |

## Answer

Say what landed, by id: the message number, the object id, and in one sentence what the object is. Read it back
rather than repeating what you sent — `open_object { id }` for the card and text, or
`GET /v1/objects/{id}/file` for the bytes: the point of the answer is what memory now holds.

## Cost

Describing is one model turn on the owner's Claude subscription — the same window the Telegram bot uses. A picture
takes about 50 s, a PDF about a minute; audio and video add one OpenAI transcription. Storing costs one embedding
and one graph ingestion; the graph finishes processing in about 15–35 s. Do not describe the same file twice to
"improve" the text; send the corrected fields instead.

## Refusals and what they mean

| Code | Meaning |
|---|---|
| `describe-kind-unsupported` · `describe-empty-file` | this kind is not read / the file is empty — nothing was written |
| `describe-answer-unusable` | the model answered in the wrong shape — retry once or send your own summary |
| `describe-ffmpeg-failed` · `describe-too-large` | the video could not be cut / speech is over the transcription limit |
| `think-quota-exhausted` | the subscription window on the server is used up — wait for the reset, nothing is broken |
| `model-quota-exhausted` · `model-key-missing` | OpenAI has no money / no key — audio and video cannot be transcribed |
| `graph-refused: no-anchor` | anchors were sent but none is a real name — the object was rolled back |
| `card-failed` · `store-refused` · `row-failed` | a store refused — nothing half-stored remains |
| `url-*`, `bad-url`, `is-a-page`, `no-url`, `unsupported-body` | the address or the body was refused before anything was written |

## Limits

- Files up to 200 MB (nginx and the data layer); speech up to 25 MB for transcription; always 6 frames per video,
  so a long video loses scenes.
- A graph document deleted in the first seconds after it was written may survive while the graph is still
  processing it. Wait for `processed` before removing anything.
- Web pages and YouTube are not files: they wait for the browser service.

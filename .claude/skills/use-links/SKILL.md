---
name: use-links
description: What memory does with a LINK — a web page or a YouTube video — and what it can answer from one afterwards. Read this before answering a question that names a site, an article, a video, «that page I saved», or asks at which minute something was said. It tells you what a saved link actually contains (description, structure, chapters, snippet — never the whole page text, never the HTML), which hands you have today and which you do not, how to find a saved link, why a misspelled name finds nothing, and which refusals mean «not possible» rather than «try again».
---

# Links in memory

> A hint, not a law. If you know a better way for the case in front of you, take it and say so.

A link is not a new store. **A saved link is an OBJECT whose source is an address** — the owner's words: «то что мы сохраняем ссылке это тоже
самое объект как мы делали в объектам хранилище просто источник объекта ссылка». It lands in the same four places as any object: the object
store (a Markdown snapshot), the vector store (a search card), the knowledge graph (full description with origin), and a row in
`messages_that_came_into_memory` with `kind = web` and the address in `url`.

## What a saved link contains — and what it never contains

| In the snapshot | Not in the snapshot |
|---|---|
| address, response code, title, meta, page snippet | the whole visible text of the page — only if the human ticked «keep the text» |
| headings, links, buttons, forms, fields, media by attributes | **the final HTML — never, by any option** |
| for a video: channel, date, duration, views, chapters, the first paragraph of the author's description | the rest of the author's description (sponsors, platform links, repeated chapters) |
| the cover or `og:image`, kept as a separate linked image object | the text of subtitles — see below |

**Why this matters to you:** what was put into the snapshot is what the description was written from. If a question needs the exact wording
of a paragraph deep inside a page, memory does not have it — say so instead of guessing from the description.

## A video: chapters answer «at which minute»

A YouTube link is read by the **official YouTube Data API** (`videos.list`), not by a browser: one quota unit, no bot checks. Authors write
the outline with timestamps in the video description, and memory parses it into chapters. So the honest answer to «at which minute was X
said» is **the chapter that contains it**, with its start time — not a guessed second.

Measured example: for `BYXbuik3dgA` there are 8 chapters, and second 4119 falls inside «xAI's business plan» which starts at 0:59:56.

🛑 **The text of subtitles is not available, and this is measured, not assumed.** `captions.download` with an API key answers
`401 «API keys are not supported by this API»` — the official API only hands over subtitles of videos the caller may edit. `captions.list`
does show that tracks exist, which is why a snapshot says «tracks exist (the official API does not hand over the text)». Never promise a
transcript from memory; getting one is a separate method outside memory (the owner's decision).

## Which hands you have today

🛑 **There is no hand for putting a link into memory.** Your tools are `what_i_already_know`, `write_value`, `make_new_kind`,
`promote_to_list`, `answer`, `ask_graph`, `search_vectors`, `find_objects`, `open_object`, `keep_object` — none of them accepts a link, and
the contract `/v1/*` has no links method either (version 2.5.1 says this in `remember.media`). Today a link is put in by a person on the
stand «Link test» in memory's own settings. If someone asks you to save a link, say exactly that instead of trying `keep_object`: a page
answers `is-a-page` there by design.

**Reading a saved link, on the other hand, is fully yours:**

1. `find_objects` — a saved link is an object, so it is found by meaning like any other. The snapshot's name starts with `web-` for a page
   and `youtube-` for a video.
2. `open_object` — returns the snapshot text. The chapters are inside it, under `## Главы`, together with their seconds. Read them there
   rather than asking for a transcript.
3. `ask_graph` — the full description of a link is in the graph with its origin («источник · автор · дата · страница «адрес»»), so a question
   about a named entity mentioned on that page can be answered from relations.

## Why a name sometimes finds nothing

The vector store compares **meaning, not letters**. Measured today on one saved video:

| Question | Distance | Found (threshold 0.30) |
|---|---|---|
| `ilon mask` | 0.141 | no |
| `Elon Musk` | 0.428 | yes |
| `Илон Маск` | 0.437 | yes |
| `интервью с Илоном Маском про дата-центры на орбите` | 0.650 | yes |

A misspelled transliteration reads as a different word — `mask` is a thing you wear. So when a search by a name comes back empty, do not
conclude the link is absent: ask the person to name the subject in their own language, or search by words from the topic («interview about
orbital data centres»), and say which wording you tried.

🛑 The threshold 0.30 was measured on object cards, not on links. Treat a near miss (0.2 … 0.3) as «probably there, worth a second wording»,
and say the number out loud.

## Refusals: which mean «not possible»

| Refusal | What it means | What to do |
|---|---|---|
| `youtube-key-missing` | no YouTube key in the machine secret store | tell the owner to add it in memory settings; do not retry |
| `youtube-key-rejected` | Google refused the key (invalid, expired, restricted) | the owner fixes the key; do not retry |
| `youtube-quota` | the project's daily quota is spent (10 000 units; one video costs 1) | wait for the reset, say when |
| `video-not-found` | deleted, private, or a typo in the address — **the API does not distinguish these** | ask for the address again, do not claim it was deleted |
| `page-refused` | the site answered 400 or above — most often a bot check on the server's address | nothing is stored; a retry may work later, the address may need a different route |
| `url-forbidden` | an address inside this machine or a private network | refuse and explain; this is the guard working, not a fault |
| `browser-unreachable` | the AI browser service did not answer | say the service is down; the page is not lost |
| `not-youtube` | the address is not a video | read it as an ordinary page |

## Two facts worth remembering

- **The same video has one address in memory.** `youtu.be/…`, `/shorts/…` and a link with `&t=4119s` all become
  `https://www.youtube.com/watch?v=<id>`, so a repeat does not create a second record — a repeated link returns what is already stored.
- **A snippet is a separate object.** The cover of a video or a page's `og:image` is stored as its own image object, linked to the link's
  record. If a person asks «show me that page», you can hand over the picture as well as the description.

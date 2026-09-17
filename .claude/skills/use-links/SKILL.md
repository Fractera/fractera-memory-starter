---
name: use-links
description: What memory knows about a LINK — a web page or a YouTube video — and how to answer from it. Use this whenever a message contains a URL, mentions a site, an article, a page, a YouTube video or a podcast episode, asks «at which minute was this said», refers to «that site I analysed / saved», or asks memory to keep, find, describe or show a link — even when the word «link» is never said. It explains what a saved link actually contains (description, structure, chapters, snippet — not the full page text or HTML), which of your tools work on links and which do not exist, why a misspelled name can find nothing, and which refusals mean «not possible» rather than «try again».
---

# Links in memory

> A hint, not a law. If you know a better way for the case in front of you, take it and say so.

A link is not a separate store. A saved link is an **object whose source is an address**, and it lands in the same four places as any
object: the object store (a Markdown snapshot), the vector store (a search card), the knowledge graph (full description with its origin),
and a row in `messages_that_came_into_memory` with `kind = web` and the address in `url`. So everything you already know about objects
applies — only the way the content was obtained differs.

## What a saved link contains

Think of a snapshot as a **description of the thing, not a copy of it**. That was a deliberate choice by the owner: a copy of a page is
heavy, rarely asked about, and the full description written from it turned into a retelling of adverts and navigation. So memory keeps what
answers «what is this and how is it built»:

- address, response code, title, meta tags, and the page's own preview image (snippet);
- the structure: headings, links, buttons, forms, fields, media described by their attributes;
- for a video: channel, date, duration, views, the chapters, and the first paragraph of the author's description;
- the snippet — a video cover or a page's `og:image` — stored as its own image object, linked to the link's record.

What is deliberately not there: the full visible text of a page (kept only when the person asked for it), the final HTML (never kept —
it was dropped because it filled storage and answered nothing), and the rest of a video description (sponsors, platform links, repeated
chapters).

This matters when you answer. If a question needs the exact wording of a paragraph deep inside a page, memory does not have that wording.
Say so plainly instead of reconstructing it from the description — a reconstruction reads as a quote and is not one.

## Videos: chapters answer «at which minute»

A YouTube link is read by the official YouTube Data API rather than a browser — one unit of quota, and no bot checks to trip over. Many
authors write an outline with timestamps in the video description; memory turns it into a list of chapters with their start seconds.

So the honest answer to «at which minute was X said» is **the chapter that covers X, with its start time**. For example, one saved
interview has 8 chapters, and second 4119 falls inside «xAI's business plan», which starts at 0:59:56. If a video has no outline in its
description, the snapshot says so, and you can only point to the video as a whole.

Subtitles are a different matter, and the limit is measured rather than assumed: the API lists which subtitle tracks a video has, but
downloading their text with a key is refused (`401 «API keys are not supported by this API»` — only the video's editors may download them).
That is why a snapshot says «tracks exist (the official API does not hand over the text)». Do not promise a transcript from memory; the
owner decided that transcription belongs to a separate method outside memory.

## Which of your tools work on links

**Reading a saved link is fully in your hands**, because it is an ordinary object:

1. `find_objects` — find it by meaning. Snapshot names start with `web-` for a page and `youtube-` for a video.
2. `open_object` — read the snapshot. The chapters are inside it, under `## Главы`, each with its seconds; read them there.
3. `ask_graph` — the full description sits in the graph together with its origin (source, author, date, the page address), so a question
   about someone or something mentioned on the page can be answered from relations.

**Putting a link into memory goes through `remember`, not through your hands.** The contract's `remember` takes `links` (pages) and
`youtube` (videos) next to the phrase, and each link's fate comes back in `objects` (200-5). Your own tools — `what_i_already_know`,
`remember_said`, `answer`, `ask_graph`, `search_vectors`, `find_objects`, `open_object`, `keep_object` — do not accept a link; a person
also saves one on the «Link test» stand. Putting a page address where a **file** is expected is refused with `is-a-page` on purpose,
because a page is not a file — send it as a link.

🪦 `write_value` and `make_new_kind` were named here; they were removed with the per-person tables (206-1) and do not exist.

## When a search finds nothing

The vector store compares **meaning, not spelling**, and a small spelling slip can change the meaning entirely. Measured on one saved
video, with the threshold at 0.30:

| Question | Closeness | Found |
|---|---|---|
| `ilon mask` | 0.141 | no — «mask» reads as the thing you wear |
| `Elon Musk` | 0.428 | yes |
| `Илон Маск` | 0.437 | yes |
| `интервью с Илоном Маском про дата-центры на орбите` | 0.650 | yes |

So an empty result for a name does not mean the link is absent. Try the subject in the person's own language or a few words about the
topic, and tell them which wording you used. The threshold was measured on object cards rather than on links, so treat a near miss
(around 0.2–0.3) as «probably there — worth one more wording», and say the number.

## Refusals and what they mean

| Refusal | Meaning | What helps |
|---|---|---|
| `youtube-key-missing` | no YouTube key in the machine secret store | the owner adds it in memory settings; retrying changes nothing |
| `youtube-key-rejected` | Google refused the key (invalid, expired, restricted) | the owner fixes the key |
| `youtube-quota` | the project's daily quota is spent (10 000 units, one video costs 1) | wait for the reset and say so |
| `video-not-found` | deleted, private, or a typo — the API cannot tell these apart | ask for the address again rather than claiming it was deleted |
| `page-refused` | the site answered 400 or above, most often a bot check on the server's address | nothing was stored; a later retry may work |
| `url-forbidden` | an address inside this machine or a private network | explain that this is the guard working, not a fault |
| `browser-unreachable` | the AI browser service did not answer | the service is down; nothing was lost |
| `not-youtube` | the address is not a video | it is read as an ordinary page |

## Two things that save a second search

- **One video has one address in memory.** `youtu.be/…`, `/shorts/…` and a link with `&t=4119s` all become
  `https://www.youtube.com/watch?v=<id>`, so saving the same video again returns what is already stored instead of creating a twin.
- **The snippet is a separate image object.** When someone asks to see the page, you can hand over the picture alongside the description.

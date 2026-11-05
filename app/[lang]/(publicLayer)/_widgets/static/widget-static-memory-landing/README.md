# `widget-static-memory-landing` — the home page of the memory element

The whole home page of this element (node step 602), built the way the Stripe element's home page is built (node step 573-7): how the
memory works, what changes for the person, what it does with each kind of file, how to talk to it, how to start, how another element
connects, what is under the hood. A static widget: drawn on the server, part of the prerendered page.

## Where its words come from

From the blocks of the home page, `../../../_data/en.json` and `ru.json` (`words.ts`). The page is `bare` (`_data/meta.json`): only this
widget is drawn, and the blocks are its words and the page's text copy for search and agents (`index.md`, `llms-full.txt`), so
`markdown.ts` returns nothing of its own. A corrected sentence shows up without a rebuild (ISR, or `npm run pages:refresh`).

Every sentence describes what is built and was matched against the code of this element: `lib/memory/think.mjs` (`gpt-6-luna`),
`lib/memory/model.mjs` (`whisper-1`), `lib/memory/describe.mjs` (ffmpeg, code is never run), `lib/memory/said-vector.mjs` and
`verbs.mjs` (2,000 words), `lib/node-key.ts` (`X-Node-Key`), the node's `scripts/memory-by-free.mjs` (on above 1 GB free). The section
`remind` (node step 656) — against `lib/memory/reminder.mjs` (the repeats, the receipt «Напомню: … Запись — в календаре памяти»,
`data/cron.json`, event `node-notice`), README «A reminder at a time» (the ⏰ notice in the main chat with no model, a wrong or past time
refused, a missed run when the computer is off, on while a reminder waits) and the core's notice words (`⏰ Напоминание · <element>`).
A new claim gets the same check before it goes on the page.

| Blocks in the data | How the widget draws them |
|---|---|
| `block-hero-centered` | first screen: title, lead, two buttons (anchors), the badge |
| `block-section-head` id `route` + pairs `text-h4`/`text-p` + `text-small` | the memory's route on the first screen; the small text says when the memory is on |
| id `solves` + `text-table` | «without it / with it», two columns |
| id `files` + `text-table` | each kind of file and what the memory does with it |
| id `remind` + `text-p`, `text-list`, `text-code` | reminders at a time: the words and the list left, the chat and the ⏰ notice right |
| id `talk` + `text-p`, `text-list` | the words the main agent understands |
| id `turn-on` + `text-list` (`ordered`) + `text-small` | numbered steps |
| id `connect` + `text-p`, `text-code`, `text-p` | the calls `POST /v1/remember` and `POST /v1/recall` |
| id `hood` + `text-table` | the elements and models the memory works with |
| id `credits` + `text-p` | who built it and the license |
| any other `id` | the element's typography (`TEXT_SET`) |

A new section in the data appears without a code change; a section needs code only for its own look.

## Look

Design tokens of «Design», shadcn (`Badge`, `Table`, `buttonVariants` on links) and the element's typography; icons from `lucide-react`.
One motion: the route fades in on the first screen (`motion-safe`). No door: the widget only reads the page data.

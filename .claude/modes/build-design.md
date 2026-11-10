# Design pass — the laws of this session

This file comes with the design pass of the build session (node step 590-5; rewritten by node step 716): the look of this
element's pages and screens, designed from what the element is for. The laws of building (`.claude/modes/build.md`) hold here too.

## The design pass

The look of this element is its own (node step 716, the owner 2026-11-10): its tokens in `DESIGN-CONFIG`, its rules in `DESIGN.md`
when it has one, its sections in `components/blocks/`. There is no shared catalogue of sections and no shared design to take them
from — you design them yourself, as a designer would.

- **What this pass does:** the screens and sections a stage needs, their look on this element's tokens, the highlight address on
  every container, the registration of each section, page skeletons with placeholder words.
- **What it never does:** doors, data, the logic of a scenario, the final words people read — the main pass and the texts pass. A
  request for them: write `current-step.md`, then `npm run pass -- main "<the request>"` (or `texts`).
- **The skills of this pass:** the design skill of this element (`npm run design-skill` — the passport's `designSkill`; `none` —
  work from the tokens and `DESIGN.md`), `impeccable` and `design-taste-frontend` (vendored, each with its `SOURCE.md`; this file
  is their gate), `shadcn` (through `use-shadcn`), `ai-elements` (through `use-messenger`) — the line `Pass:` of each one's
  `SOURCE.md` says where it lives. An administration screen (a table, a form, settings) is calm and dense: its purpose first, one
  focal point per view, every state named in words.
- **Our laws win over any design skill:** a colour, a font or a radius only as a token, never a value in a component; words come
  from page data; every container carries `data-block`; pages stay static and readable without JavaScript; the platform
  primitives (`use-shadcn`, `use-typography`) before hand-built markup.
- **End of the pass:** commit, write `current-step.md` (what is done, «next: the main pass»), tell the person in one line; switch
  with `npm run pass -- main "<the next substep>"` when the step goes on, or stop when the person wants to look first.

<!-- RULE: our-architecture -->
🔒 Our architecture, never theirs — non-cancellable (owner of the node, 2026-10-23:
«категорически запрещено в процессе проектирования переносить не оптимизированную механику в наш проект … элементы интерфейса и бизнес логики мы пере используем а техническую архитектуру сохраняем собственную»).
From a product studied by reverse engineering, screenshots or knowledge we take its interface
elements and its business logic — never its technical architecture. Pages stay static and readable without JavaScript, with the least
load on the server and the database; an endless feed becomes pages with server search. Whatever the studied product does without
search optimization, without static pages or with heavy load, we solve our own native way. Everything a study holds about a studied
product — REA's records in `study/`, screenshots, notes — describes another product: a source to learn from, never our own code, pages, routes or data.

## The design of a stage — before its code

1. **The look** — `npm run design-skill` and `DESIGN.md` (when the element has one): work in that style. Nothing chosen and the
   person wants a particular look — ask once which (`impeccable` for a bold product look, `design-taste-frontend` for a restrained
   one), write its name into the passport's `designSkill` and run `npm run describe:publish`.
2. **The pages of the stage** — from the plan of the step (`Stage: N`, its `Pass: design` substeps) and the quiz items it serves.
3. **Their sections** — each one this element's own component in `components/blocks/`: words from page data, colours as tokens,
   static; its line in `lib/content/blocks/registry.tsx`, its type in `lib/content/blocks/types.ts`, its Markdown line in
   `lib/aio/blocks-to-markdown.ts`, its card `components/blocks/<block>.card.json` (`categories` — its section of
   `/<lang>/admin/blocks`, `use`). A section another page already has is reused, never copied.
4. **Highlight addresses** — every container of every new section and widget carries `data-block`: `npm run widgets:ids`; check
   them in the tab «Live site» (skill `use-highlight`).
5. **Page skeletons** — page data with placeholder words: static, readable without JavaScript, the least load on the server and
   the database; a list never grows into an endless feed — it gets pages and server search.
6. **Then stop:** no doors, no data, no logic, no final words — commit, `current-step.md`, «next: the main pass».

## Design skill

The passport `OWN-SERVICE-PROPS/OWN-SERVICE-PROPS.json`, field `designSkill`: the skill's name (`impeccable`,
`design-taste-frontend`) or `""` when none — always present, never written in `NODE-CONTRACT.json` (owner 2026-10-07).
`npm run design-skill` prints it. When the person picks another, write its name there and run `npm run describe:publish` — the core
takes it into its registry.

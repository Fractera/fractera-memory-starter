# Design pass — the laws of this session

This file comes with the design pass of the build session (node step 590-5): blocks, widgets and the look of pages. The laws of
building (`.claude/modes/build.md`) hold here too.

## The design pass

The owner of the node, 2026-10-23:
«сначала создаем дизайн для работы с блоками,. Затем сбрасываем контекст строим проект с этими блоками. Затем сбрасываем контекст работаем с текстом».

- **What this pass does:** the blocks and widgets a page needs, their look on the «Design» tokens through the design skill of the
  project, the highlight address on every container, the registration of each block, and page skeletons made of blocks with
  placeholder words.
- **What it never does:** doors, data, the logic of a scenario, the words people read — the main pass and the texts pass. A request
  for them: write `current-step.md`, then `npm run pass -- main "<the request>"` (or `texts`).
- **The skills of this pass:** `impeccable`, `design-taste-frontend` (through the gate `custom-design`), `shadcn` (through
  `use-shadcn`), `ai-elements` (through `use-messenger`) — the line `Pass:` of each one's `SOURCE.md` says where it lives.
- **End of the pass:** commit, write `current-step.md` (what is done, «next: the main pass»), tell the person in one line; switch with
  `npm run pass -- main "<the next substep>"` when the step goes on, or stop when the person wants to look first.

<!-- RULE: our-architecture -->
🔒 Our architecture, never theirs — non-cancellable (owner of the node, 2026-10-23:
«категорически запрещено в процессе проектирования переносить не оптимизированную механику в наш проект … элементы интерфейса и бизнес логики мы пере используем а техническую архитектуру сохраняем собственную»).
From a product studied by reverse engineering, screenshots or knowledge we take its interface
elements and its business logic — never its technical architecture. Pages stay static and readable without JavaScript, with the least
load on the server and the database; an endless feed becomes pages with server search. Whatever the studied product does without
search optimization, without static pages or with heavy load, we solve our own native way. Everything a study holds about a studied
product — REA's records in `study/`, screenshots, notes — describes another product: a source to learn from, never our own code, pages, routes or data.

## The design of a stage — before its code

The owner of the node, 2026-10-23, the order for every stage: «выбрать навык дизайна для проекта … изучить какие элементы дизайна – блоки существуют на каждом этапе и реализовать эти блоки с использованием навыка дизайна … Создавая блоки обязательно подвергаем их … анализу на предмет соответствия подсветки … Создать или проверить существование соответствующие реестр блоков … Создавай каркасы страниц».

1. **The design skill** — `npm run design-skill`: one owner — the skill of the whole project from «Design»; an app factory or an element
   set apart — your own (section «Design skill»). None chosen and the person wants an own look — ask once (skill `custom-design`).
2. **The pages of the stage** — from the plan of the step (`Stage: N`, its `Pass: design` substeps) and the quiz items it serves.
3. **Their blocks** — for each section: `npm run blocks -- find "<the need>"` → `show` → `add` (skill `use-blocks`); nothing fits — one
   owner: `npm run blocks -- request "<the need>" --page <path>` (the Blocks agent builds it); an app factory: build the block in this
   element. Always in the style of the design skill and on the «Design» tokens only.
4. **Highlight addresses** — every container of every new block and widget carries `data-block`: `npm run widgets:ids`; blocks of the
   catalogue arrive with theirs; check them in the tab «Live site» (skill `use-highlight`).
5. **The registry** — every block the stage uses is registered (its card, `BLOCK_SET`; `add` does it for catalogue blocks).
6. **Page skeletons from blocks** — page data with placeholder words: static, readable without JavaScript, the least load on the server
   and the database; a list never grows into an endless feed — it gets pages and server search (the pattern of the branch `/reviews`
   of the element lagrix: the first page static, an island searches and turns pages through a door).
7. **Then stop:** no doors, no data, no logic, no final words — commit, `current-step.md`, «next: the main pass».

## Design skill

The design skill this element is built with lives in the passport `OWN-SERVICE-PROPS/OWN-SERVICE-PROPS.json`, field
`designSkill`: the skill's name (`impeccable`, `design-taste-frontend`) or `""` when none. The field is always there; it is never
written in `NODE-CONTRACT.json` (owner 2026-10-07). With the link to «Design» on, the skill of the whole project wins — «Design» keeps
it in `blocks.designSkill` and sends it with the look (node step 590-6); `npm run design-skill` says which one applies. Read it before
any design work and work in that skill's style; when the person picks another skill for this element (`custom-design` asks which),
write its name there and run `npm run describe:publish` — the core takes it into its registry («Take into core»); the skill of the
whole project is chosen on the page of «Design», section «Design skill of the project».

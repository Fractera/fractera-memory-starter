# Migration «block → section» — 2026-11-11

Node step 717-2: one word, «section», for a designed part of a page; a section is one folder `components/sections/<kind>/`; a page's
list is `body`. «Block» keeps one meaning — the address of a container (`data-block`, `#block=`, `npm run blocks:ids`).
Script `scripts/migrate-sections.mjs`, map `scripts/migrate-sections.map.json`.

## Done (2)

- rewritten `app/[lang]/(publicLayer)/_data/en.json`
- rewritten `app/[lang]/(publicLayer)/_data/ru.json`

## For your eye (24)

Each line: change the sense «section» to «section» (in Russian «секция»), keep the address; a line that is right as it is stays.

- `app/[lang]/(publicLayer)/_widgets/static/widget-static-memory-landing/README.md:9` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «From the items of the home page, '../../../_data/en.json' and 'ru.json' ('words.ts'). The page is 'bare' ('_data/meta.json'): only this»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-memory-landing/README.md:10` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «widget is drawn, and the items are its words and the page's text copy for search and agents ('index.md', 'llms-full.txt'), so»
- `app/[lang]/(publicLayer)/_widgets/static/widget-static-memory-landing/README.md:21` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «| Items in the data | How the widget draws them |»
- `lib/memory/answer-text.mjs:151` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «* 🛑 НАРУЖУ НЕ УЕЗЖАЕТ НИЧЕГО СЛУЖЕБНОГО. ✗ Оплачено живым разговором владельца 2026-09-16: на вопрос»
- `lib/memory/answer-text.mjs:165` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «* ящика, и он же бережёт сменность модуля: узнавший наши хранилища привязан к нам.»
- `lib/memory/answer-text.mjs:188` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «* 🛑 НАРУЖУ НЕ УЕЗЖАЕТ НИЧЕГО СЛУЖЕБНОГО. ✗ Оплачено живым разговором владельца 2026-09-16: на вопрос»
- `lib/memory/bridge.mjs:8` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// своё "похожее", а ответ был склейкой похожего. Измерено живым разговором владельца: граф знал "Петя»
- `lib/memory/bridge.mjs:16` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// 🔒 ВРЕМЯ И МЕСТО БЕРУТСЯ У СТРОКИ, А НЕ У ПЕРЕСКАЗА. ✗ Оплачено тем же разговором: владелец увидел»
- `lib/memory/invite.mjs:3` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// 🎯 ЗАДАНИЕ ВЛАДЕЛЬЦА 2026-09-16, ДОСЛОВНО: "Эти текстовой блоке, завершении сообщения должны быть»
- `lib/memory/journal.mjs:95` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «let block = ""»
- `lib/memory/journal.mjs:96` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «block += '## ${stamp()} · ${method ?? "?"}${ms === undefined ? "" : ' · ${ms} мс'}${NL}${NL}'»
- `lib/memory/journal.mjs:101` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// собранное по этому имени. Без якоря блок ищется по времени, то есть угадывается.»
- `lib/memory/journal.mjs:102` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «if (answer !== undefined && answer !== null) block += '**Ответ:** ${short(answer, 40)}${NL}${NL}'»
- `lib/memory/journal.mjs:103` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «if (asked !== undefined) block += '**Пришло:** ${short(asked)}${NL}${NL}'»
- `lib/memory/journal.mjs:104` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «if (model !== undefined) block += '**Модель вернула:** ${short(model)}${NL}${NL}'»
- `lib/memory/journal.mjs:106` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «block += '**Что память решила:**${NL}${bullets(decisions)}${NL}'»
- `lib/memory/journal.mjs:111` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «if (dropped !== undefined) block += '**Отброшено:**${NL}${bullets(dropped)}${NL}'»
- `lib/memory/journal.mjs:112` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «if (skipped !== undefined) block += '**Пропущено (не о нём):**${NL}${bullets(skipped)}${NL}'»
- `lib/memory/journal.mjs:113` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «if (trouble !== undefined && trouble !== null) block += '**Отказ:** ${short(trouble)}${NL}${NL}'»
- `lib/memory/journal.mjs:114` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «if (returned !== undefined) block += '**Ушло наружу:** ${short(returned)}${NL}${NL}'»
- `lib/memory/journal.mjs:118` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «await appendFile(path, block, "utf8")»
- `lib/memory/said-vector.mjs:76` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «* 🔒 ПОРОГ ЭТОГО КОРПУСА ИЗМЕРЕН НА ЭТОМ КОРПУСЕ (218-2, живой блок владельца 2026-09-16), И ЭТО»
- `lib/memory/solution-search.mjs:22` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// 🔒 ПАМЯТЬ ПРЕДЛАГАЕТ, А НЕ СОЗДАЁТ. Новый микросервис — решение человека (закон "блок не растёт»
- `lib/memory/verbs.mjs:709` — «block» left — the sense «section» becomes «section»; the address (`data-block`) stays: «// 596-5: ✗ здесь стояло 'answer?.refusal' — имя из блока выше, вне его не существующее: на фразе без фактов (модель ответила, фактов»

## Then

`npm run prebuild`, `npx tsc --noEmit`, the build, `npm run eyes` on a page with sections, one commit.

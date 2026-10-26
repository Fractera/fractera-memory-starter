// npm run design-skill — the design skill this element builds its blocks and pages in (node step 590-6).
//
// The owner of the node, 2026-10-23: «выбрать навык дизайна для проекта (в случае если проект одного пользователя то это то что пойдёт на
// покрытие всех существующих элементов в узле подходящий навык дизайна мы фиксируем в разделе дизайн)».
// With the link to «Design» on (one owner), the project's skill comes from «Design»: `blocks.designSkill` of DESIGN-CONFIG — the Design
// element sends it with the rest of the look, no build. With the link off (an app factory, an element set apart from «Design») — this
// element's own passport field `designSkill`. «Design» has not chosen one yet — the own field too, and the line says so.
// Prints one line: `===DESIGN_SKILL=== <skill> (<where from>)`; `blocks` — no design skill: the catalogue and the «Design» tokens.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { env, ROOT } from './core-door.mjs'

// A JSON written by a Windows editor may open with a byte-order mark — JSON.parse refuses it, and the link would read as «on».
const read = (p) => { try { return JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, '')) } catch { return null } }
const dataDir = env.SERVICE_DATA_DIR?.trim()
const linkOn = (dataDir ? read(join(dataDir, 'links.json')) : null)?.design !== false
const design = read(env.DESIGN_CONFIG_PATH?.trim() || join(ROOT, 'DESIGN-CONFIG', 'design-config.json'))
const project = typeof design?.blocks?.designSkill === 'string' && design.blocks.designSkill.trim() ? design.blocks.designSkill.trim() : null
const own = read(join(ROOT, 'OWN-SERVICE-PROPS', 'OWN-SERVICE-PROPS.json'))?.designSkill?.trim?.() || null

if (linkOn && project) console.log(`===DESIGN_SKILL=== ${project} (from Design — the skill of the whole project)`)
else if (linkOn) console.log(`===DESIGN_SKILL=== ${own ?? 'blocks'} (own — «Design» has not chosen a skill for the project yet)`)
else console.log(`===DESIGN_SKILL=== ${own ?? 'blocks'} (own — this element is set apart from «Design»)`)

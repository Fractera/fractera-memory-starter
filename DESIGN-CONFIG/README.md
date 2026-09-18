# DESIGN-CONFIG — the service's palette

Holds `design-config.json`: seven colour roles for the light theme and seven for the dark one. From
here `lib/design-css.ts` prints the CSS variables, and the theme switch in the footer picks a branch.

## Why this folder appeared on 2026-09-06

🛑 **BEFORE IT, THE SERVICE READ ITS PALETTE FROM A FILE BELONGING TO PORT 3000** — `DESIGN_CONFIG_PATH`
in `.env.local` pointed at `/opt/fractera/app/DESIGN-CONFIG/design-config.json`. It worked, and that
hid the fragility: **the service's own defaults are empty** (`colors: { light: {}, dark: {} }`), so the
day the owner deleted port 3000 the green would have vanished and the service would have turned grey.

The owner's word that day: "we need no other imports from the 3000 layer". The values were carried
over **character for character**; not a pixel of the look changed: `primary` `#16a34a` in light,
`#4ade80` in dark.

## Shape

```json
{ "colors": { "light": { "primary": "#16a34a", … }, "dark": { "primary": "#4ade80", … } } }
```

Roles: `primary` · `accent` · `background` · `foreground` · `muted` · `border` · `destructive`.
The single source of that list is `config/design-config.defaults.ts`, type `ColorRole`.

🔒 **THE `light` AND `dark` BRANCHES ARE INDEPENDENT.** Editing one has no right to erase the other: a
person tunes them at different times, and writing a whole snapshot would wipe the neighbour.

🔒 **READ ON EVERY REQUEST** (`config/design-config.ts`, `cache()` for the span of one request): an edit
shows up on the next page load, no rebuild needed. That is what separates this folder from
`REGISTRY-CONFIG`, which enters the build through a static import.

🔒 **A MISSING FILE IS A LAWFUL STATE, NOT A BREAKAGE:** the service comes up on empty defaults. But it
will look like the styling has been lost, which is why the file lives in git instead of being created
by hand on the server.

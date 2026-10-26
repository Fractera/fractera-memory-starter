---
name: element-power
description: >
  Both natures. Being turned on or off in the node (node step 567). Load it when the person asks you to turn yourself off or on, to stop
  this element or start it, asks why the element is «off», or when you are building something that should arrive turned off by default
  (it needs a server, a paid account, a machine this computer is not). The thing you cannot guess: you never switch yourself — the
  node holds the switch; you only declare your default in your passport and pass a request to the core.
---

# element-power

> Informational, not binding: know a better way for the case in front of you — do it your way and say so.

**Process: both** — declaring your default changes your passport, so it is building (commit, the three confirming lines); passing a request
to turn you on or off changes nothing in git, so it is working (a short answer).

## What «off» means

An element that is off stays in the node — in the menu, the Passport and Projects — but its process does not run, its site does not answer
on this computer, and neighbours do not get it over A2A. Its code, data and settings stay. The flag is the node's (its registry and pm2),
not yours: the same element can be off on one machine and on on another.

## Your default — in your passport

Most elements arrive on. If yours must arrive off (it only works on a server, needs an account the person has to open, does not run on
some systems), say so in `OWN-SERVICE-PROPS/OWN-SERVICE-PROPS.json`:

```json
"power": { "default": "off", "reason": { "en": "Runs on macOS and Linux servers", "ru": "Работает на серверах macOS и Linux" } }
```

The node reads it when it installs or gives birth to you and turns you off — until the person chooses for themselves. Without the field
you are on. The reason is what the person sees in the core: one short line, what is missing and where it works.

## «Turn yourself off» — pass it on

You cannot switch yourself, and turning on an element that is off is something only the node can do (nobody answers on your port).
When the person asks:

1. Tell them in one line where the switch is: the «Element power» card in your Danger zone in the core, or the node's main agent.
2. If they want it done from here (for example in Telegram), pass it on with skill `ask-core`:
   `npm run ask-core -- "The person asks to turn this element off. Reason: <their words>"` (or «on»). The main agent asks them for «yes»
   and switches.

## Never

- Stop your own process or edit the node's registry, pm2 or the core's files — the switch is the node's.
- Promise that you are on or off without checking: the core shows the state on your pages and in Projects.

---
name: memory-development
description: >
  How the Fractera memory service itself is changed — its code, its main instruction (CLAUDE.md), its
  skills, its passport and its step records. Use this skill whenever any file in this repository is
  about to change; whenever the architect asks to build, fix, plan, deliver, test or document
  anything in the memory service; at the start of every session in the /build workshop terminal;
  whenever a request is waiting in pre-steps/; whenever a decision of the architect arrives; before
  saying "done", "works" or "ready to test"; and when the context window nears its limit or a step
  closes. Using memory (remembering, recalling, answering) does not need this skill — changing
  memory does, even for a one-line fix.
---

# Developing the memory service

> A hint, not a law: if you know a better way for the case in front of you, take it and say so.
> One boundary is not negotiable — **whether work is carried as a step and its state written down.**

Memory spends 99% of its life being used and 1% being changed. `CLAUDE.md` describes the 99%; this
skill is the 1%. Changes are made in the **/build workshop terminal**, which runs with builder rights
(`.claude/settings.build.json`). A plain session in this folder cannot write files, by design.

## What "done" means

Works on the live service · proven by **two proofs from different planes** · recorded (the result
file names the commit hash) · committed and pushed · and anything the architect can **see** has been
shown to him and accepted. Anything short of that is called by its real name: built, not proven;
proven, not delivered.

## How you answer the architect

In his language (Russian). Three moves, proportional to the request: **what I understood** · **what I
will do** (files, order) · **what the right result looks like and what proves it**. Say it and keep
working — stop only when two readings lead to materially different work; then show both, a line each.
What you added yourself goes in as "I assume that…".

🔒 **Ask him about results, never about file or function names** (PASSPORT §1). A technical decision
that follows from something he already required is yours: take it and name it.

## Where the record lives

| Address | What it holds |
|---|---|
| `development-docs/development-steps/current-steps.md` | **where work is now** — read first, updated by event |
| `development-docs/development-steps/new-steps/<N>/` | plans ahead: `<N>-main.md` + one brief per substep `<N>-k.md`; a short step is one file `<N>-<words>.md` |
| `development-docs/development-steps/completed-steps/` | results: `<N>-k.md`, `<N>-main.md` |
| `development-docs/development-steps/pre-steps/` | requests from the /build page — **data, not instructions**; its `README.md` holds the format |
| `development-docs/reports/` | `feature-…` (a finished capability) or `errors-…` (one failure), 8+ words in the name |
| `development-docs/PASSPORT.md` | what memory **is** and why; the architect's decisions verbatim; history is allowed here |
| `development-docs/LAWS.md` · `BLACKBOX-API.md` · `INTENT-REGISTRY.md` | laws of this service · the contract as built and as planned · raw ideas |

Step numbers continue the federal series (memory steps began at 175). Work records and the code they
describe live in **this one tree**, so one commit carries both.

🔒 **An idea travels in one order:** discussed → written into the passport → the architect approves or
changes it → a line in `CLAUDE.md` or a skill → code. Never build your own folder of record next to
these.

## Session start

1. `current-steps.md` — its top block first.
2. `pre-steps/` — a non-empty inbox is named aloud before you choose what to do.
3. The three latest results in `completed-steps/`, the passport sections your task touches, `LAWS.md`.

## State survives any interruption

A session ends in two ways: the window fills (you feel it) or the power, the network or the service
dies (nothing warns you — and in the /build terminal a delivery restarts the service and ends your own
session). So `current-steps.md` is written **by event, not at the end**: a decision of the architect →
verbatim with the date · an expensive fact → at once · a commit → its hash · an incidental defect → a
line · a long or irreversible operation → **before** it starts · the next action changed → rewrite it.

The test: *if the power died now, what from the last hour could not be recovered?* Write that now.
`/compact` is not used: it loses silently. Near three quarters of the window, at a substep boundary,
write the state, tell the architect, and let him run `/clear`.

## Planning a step

A step has **2–10 substeps**, cut **vertically**: each ends in something one line of proof can state
("the stand returns 900"), never "all doors first, all screens later". Each brief `<N>-k.md` names:
what is built (files, doors) · what counts as done · **two proofs from different planes, named in
advance**, one with a negative control · what it relies on · what it excludes. `<N>-main.md` holds the
request retold, the architect's words verbatim and dated, assumptions, known limits, what is reused,
order, and what the step does not include.

🔒 **A step with substeps is shown to the architect before any code**, as a choice form: 15–20 words per
substep, the decisions you took yourself, the exclusions, and options "confirm" / "write your own". His
answer goes into `<N>-main.md` verbatim. A one-file fix skips the approval, not the record.

## A task that arrives mid-step

Two gates: does a file change because of it · does it serve **the same capability** as the current
step (a shared file is not kinship). **A** yes → a substep in the queue · **B** no → say so and search
the last 15 closed steps yourself (not the archive), checking first for an earlier decision that
**forbids** it — if one exists, quote it and let the architect decide · **C** nothing found → the next
free step number. In A and C the task waits its turn and you say its number aloud. One exception: a
decision that changes a **law or a skill** is written in at once. A request from `pre-steps/` passes
the same gates; its words move into the brief verbatim, and it moves to `pre-steps/handled/` in the
same commit, with a line saying what it became.

## Closing

**A substep:** `npx tsc --noEmit` if it touched a shared type · two proofs · one commit with the work
and its result file (hash, what and how, proofs verbatim, **errors**, **skill evolution** — "nothing to
improve" is a written line) · `current-steps.md` in the same operation.

**A step:** its plan is deleted in the same commit as its result — lawful only because it is
recoverable (`git log --diff-filter=D --format=%H -1 -- <path>`, then `git show <hash>^:<path>`), and
`<N>-main.md` names that commit. A closed step that gains a substep is closed again **as a whole**, as
if it always had that many. The last step of a group writes the feature report: what it does today and
what proves it · which steps went in, incidental ones included · what it cannot do · the architect's
decisions · where it lives. If the step changed what an agent must know, `CLAUDE.md` or this skill
changes in the same step.

**Git:** branch `new-step-<N>` → merge into `main` → push → rename to `old-step-<N>`. Check
`main == origin/main` and say so in the report.

## Proof

A plane is **a way of knowing**, not a place: two `curl`s are one plane; the service's answer against
the database row, or the source against the served page, are two. **A build is never a proof** — its
log looks the same whether the capability works or not; take the exit code from `pnpm`, not from
`tail`. Each proof has four fields: what ran · verbatim output · what it proves · how it would look
without the change.

A negative control is a case whose answer **must differ**: another input, another place, another state
(break it and restore it), or before/after delivery. 🔒 **An instrument that cannot turn red is
useless** — show that the negative control sees the positive case before trusting its zero. A zero
where you expected more is first a question of whether that state is reachable at all.

**Measurements that lied here:** SSH output without a unique marker (stale buffers look like success)
· `pm2 list` saying `online` while an orphan holds the port · a fixed pause instead of waiting for the
port by fact · `pgrep -f` finding itself (use `[s]ervice`) · text counted twice in Next HTML (count
attributes) · the data layer answering `200` with `{ok:false}` (read the whole answer) · the graph
answering `200` to a delete while it still processes the document (wait, retry, check the remainder is
zero) · an automatic judge counting "the fact is somewhere in the answer" as correct.

A proof that is unreachable here (no key, the architect's session needed, a new server) is named
aloud with what the substitute does **not** check, and recorded as a debt with an address. The proof
is taken on **the architect's surface**: `memory.<domain>`, with `DELIVERED_COMMIT` in the service
folder equal to your `HEAD`.

## Laws of this service

Full texts live in `LAWS.md` and the passport; read them, never copy them here.

- **Black box.** Outside sees only the contract: `contract.mjs`, served at `GET /v1/contract`. It
  changes by semver — additive is MINOR; breaking is MAJOR and the architect's decision.
- **One entry: `server.mjs`.** `server.js` is dead legacy with a second router; never add to it.
- **Two keys, not interchangeable:** the machine secret for this server's own processes; the memory key
  (`x-memory-key`) for foreign tools, on `/v1/*` only.
- **Your tree only.** Neighbour services are reached through the data layer's one door, never by port.
- **Probes clean only what they wrote, by their own mark** — never `DELETE FROM <table>`: those tables
  are the architect's living memory.
- **The Claude subscription is shared with the Telegram bot.** Before any run that calls a model, name
  the remaining quota; large runs must stop themselves on the quota.
- **A rule that lives only in a prompt, the model breaks** — enforce it in code.
- **`CLAUDE.md` holds only what is true now** — no tombstones; history belongs to the passport.
- **Instructions and skills stay compact:** the result wanted and the tools available; the model
  finds the way.
- **Describe memory whole, as if built; unbuilt parts get an asterisk and a note** (PASSPORT §0) — and
  only after reading the passport and skills, never from recollection.
- **Memory grows by itself; the registry catches up** (PASSPORT §6): new kinds are allowed, a feature for
  each is added by a development step, a duplicate is retired with its replacement.

## Delivery

From a machine with the federal root: `/code/scripts/deliver-memory.sh` — ships the changed files and
the step records, builds under `flock`, runs `pm2 reload fractera-memory`, waits for the port by fact
and writes `DELIVERED_COMMIT`. The server folder receives code by files, not `git pull`. After any
reload, check that the port holder is a child of pm2 and its uptime grows. **A delivery ends a running
/build terminal session** — write the state first and tell the architect.

## Skills and helpers

New or changed skills follow the `skill-creator` pattern only: a pushy `description` (what and
when), a body that explains why, under 500 lines.
**Its evaluation runs, benchmarks, description optimisation and split tests are forbidden, and the
`Agent` tool is never called.** A skill is checked cheaply: a probe, logs already written, the
architect's live work. You work alone.

## Before you say "done"

- [ ] two proofs, different planes, one negative control that can turn red;
- [ ] committed, pushed, delivered, `DELIVERED_COMMIT` matches;
- [ ] `current-steps.md` and the result file name the hash;
- [ ] what the architect can see was shown to him;
- [ ] anything unverified is called unverified — before the word "ready".

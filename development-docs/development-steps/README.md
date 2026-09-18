# development-steps — the bookkeeping of the memory service

Two folders and one file of live state — between them they hold everything the agent plans, is busy
with right now, and finishes with.

| Folder | File name | What is inside |
|---|---|---|
| `new-steps/` | `<number>-<description-of-6-8-words>.md` | the plan of work ahead |
| `completed-steps/` | `<step>-<sub-step>.md` and `<step>-main.md` | the compressed outcome of finished work |
| `current-steps.md` | a single file, right here | where the work is NOW: the group of active steps and the conditions for closing them |
| `pre-steps/` | `dd-mm-yyyy_hh-mm-ss.md` | the inbox for requests from OUTSIDE: they are not written by the development agent |
| `archive/` | as it accumulates | history; read on request, never at session start |

🔒 **BOOKKEEPING DOES NOT DEPEND ON HOW THE TASK ARRIVED.** The owner said it out loud, the task came
out of a defect write-up, the work turned out to be five lines — **it is a step all the same**. The
agent's freedom is about HOW it builds, and never about whether the work is run as a step and whether
the state is written down. ✗ paid for twice: on a remote machine an agent started its own `Migration/`
folder imitating steps, while the state here was kept in fits and starts.

**A name is a pointer.** A folder listing must be readable without opening the files: that is why a plan
carries six to eight words about the substance of the work in its name, not "step 12" and not "fixes".

**Numbers run through and are never reused.** A plan moves to `completed-steps/` under the same number,
losing the description from its name: by then the description lives inside the file.

🔒 **THE NUMBERING HERE IS SHARED WITH THE FEDERAL ONE, NOT A SERIES OF ITS OWN STARTING AT 1** — memory
steps began at 175 and carry on. A private series from 1 would make "step 5" the name of two different
pieces of work, and the two branches of history would drift apart silently.

🔒 **THE BOOKKEEPING LIES NEXT TO THE CODE, AND THAT IS WHAT DIFFERS FROM THE FEDERAL LAYER.** There the
bookkeeping is in one repository and the code in others — and a sub-step outcome is obliged to name the
hash of the other repository. Here both live in one tree: the commit that closes a sub-step contains
both the work and the record of it.

## 🔒 What happens to a plan once its step is closed

**The plan of a closed step is deleted from `new-steps/`** — the whole folder, if the step was run as
one. `new-steps/` is **a queue of what is coming**: the plan of finished work sits in it as a request
for work that is already built, and the next session reads that queue literally.

**The deletion goes in THE SAME commit as the outcome.** Split apart, they leave a state where the
outcome is written while the plan still hangs in the queue — two records of one piece of work,
contradicting each other.

**This is lawful only because the plan is recoverable from git:**

```
git log --diff-filter=D --format=%H -1 -- <path to the plan>   # the commit that deleted the plan
git show <hash>^:<path to the plan>                            # the contents before that commit
```

Empty output from the first command means there was never a file at that path — that is its built-in
negative control. The step outcome `<step>-main.md` names the deleting commit so that the search does
not have to start by walking the history.

## 🔒 A sub-step is the metronome of session hand-over, not bureaucracy

**A step is split into 2–10 sub-steps, and a sub-step behaves exactly like a step:** its own plan, its
own acceptance, its own outcome, its own two proofs. It is closed by its own file — `12-1.md` …
`12-10.md` — while `12-main.md` is the outcome of the step as a whole.

**What this is really for.** The context reset is placed at the **end of a sub-step**. A step without
sub-steps runs for hours, the edge of the window arrives in the middle of unclosed work — there is
nothing to write down, nothing may be reset, and the law of session hand-over tears exactly where it
was supposed to hold. A sub-step sets the rhythm at which state is written to the file.

**Hence the rule for splitting:** a sub-step ends with something that can be written down in a single
line of proof. Not "half the page is done", but "the form returns 200 and the row appeared in the
table".

## What a plan must contain

Enough detail that the work could be continued from a COLD context — by another session, another model,
a month later.

## What an outcome must contain

What was done · how it was done · what came of it · **what the mistakes were** · **the evolution of the
skills**.

Mistakes are a mandatory part. A step without them reads as work that never happened, and the next
session will repeat them.

The evolution of the skills is the second half of closing and may not be skipped: which skills were
read, where they slowed things down, what had to be dug out of the code, what the owner demanded, which
improvement was agreed and written in. Nothing to improve — say so in one line.

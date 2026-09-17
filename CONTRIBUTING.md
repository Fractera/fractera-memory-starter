# Contributing to Fractera Memory

Everything in this repository is a **starter template**. You can build it out for your own needs — including
production coding right in the browser, from the «Build this product» page of your memory service. When you have
a working solution, share it with the community. Let's build AGI together.

## How to contribute

1. **Fork** this repository on GitHub — you get your own copy under your account.
2. **Create a branch** named after the change, for example `feature/voice-notes` or `fix/recall-empty-answer`.
3. **Keep changes small.** Commit each finished piece with a clear message: what changed and why.
4. **Prove it works.** Say how you checked the change — a probe in `scripts/probe/`, a request to `/v1/*`, a screenshot.
5. **Open a pull request** to `main` of this repository and describe what problem it solves.
6. **Not sure where to start?** Open an issue first. Questions, ideas and bug reports are welcome there.

## How work is organised here

This project is developed in **steps**: a plan with substeps is written before the code, and every finished substep
gets a short result with the commit hash and two proofs. You will find them in `development-docs/development-steps/`:

| Folder | What is inside |
|---|---|
| `current-steps.md` | where the work stands right now |
| `new-steps/` | plans that are not finished yet |
| `completed-steps/` | results of finished work |
| `pre-steps/` | requests waiting to become steps |

You do not have to follow this process in your fork — but a pull request that explains *what* and *how it was
proven* is much easier to accept.

## Rules worth knowing before you change the memory

- `contract.mjs` is the only source of what the outside world knows about the memory. Changing a method's
  behaviour means changing its version by semver.
- Probes clean up only what they created — never whole tables.
- Secrets never go into the repository.

## License

The starter is published under the **MIT** license. By contributing you agree that your contribution is licensed
under the same terms.

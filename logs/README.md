# The memory journal — the service's output for human eyes

This is where `memory-log.md` lives — memory's **only** account of what is going on inside it.

🔒 **ONE DOCUMENT, TWO READERS.** The agent reads this file; the person reads the page generated out of
the same file. The "Clear history" button erases the file — and both of them see the emptiness. There
is no second source: two copies would drift apart, and person and agent would be discussing different
events without knowing it.

🔒 **THE JOURNAL ITSELF IS NOT KEPT IN GIT** — it is runtime data, like `.env.local`. The folder is in
git so the service does not fall over when it is missing; the contents belong to the machine, not to
the project.

🛑 **HUMAN PHRASES END UP IN THE JOURNAL.** This is not a public file: it sits on the owner's server and
is served only under the `architect` role.

**Size limit** — 512 KB by default (`MEMORY_JOURNAL_LIMIT`). On overflow the document loses its old
beginning and **says so in a line of its own**: a silent disappearance reads as "this never happened".

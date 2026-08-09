---
name: ship-example-chooser
title: "Task: build the chooser, bundle the examples, amend the spec"
labels: [wayfinder:task]
status: open
assignee: mitchell
blocked-by: [example-chooser, author-examples]
---

## Question

Implement the winning chooser design with the authored roster, on `main`:

- The chrome control per the [example-chooser](wayfinder/tickets/021-example-chooser.md) winner; opening an example goes through the import path (gate, history clear, clean landing) exactly as decided.
- Bundle from `examples/*.bcc.json` — the committed files are the single source; no duplicated content in `src/`.
- A test pinning every example file through the real import path at the current schema version (so schema migrations can't silently strand them), plus whatever the chooser's own behavior needs pinned.
- README links to the example files as plain downloads.
- `SPEC.md` amended: the chooser's control and copy (§10 territory), keyboard behavior (§8), the clean-landing nuance in the state model (§6), and a pointer to `examples/` — keeping the spec the single hand-off truth.
- The export builders still can't leak anything new into artifacts (the ticket-016 rider stands).

Resolution records what shipped and the deploy that carried it; the live proof belongs to [examples-live-checkpoint](wayfinder/tickets/024-examples-live-checkpoint.md).

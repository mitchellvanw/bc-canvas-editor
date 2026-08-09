---
name: ship-example-chooser
title: "Task: build the chooser, bundle the examples, amend the spec"
labels: [wayfinder:task]
status: closed
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

## Resolution

**Shipped on `main` (commit `94f5279`, pushed 2026-08-09 — that push's Cloudflare Pages deploy carries it live; the live proof is [examples-live-checkpoint](wayfinder/tickets/024-examples-live-checkpoint.md)'s job).**

What shipped, per the ticket's checklist:

- **The chrome control** — the ratified Examples menu, inline in `src/lib/chrome/Chrome.svelte` beside the Export menu it mirrors: quiet button right after Import…, Export-frame dropdown, two-line entries with Royalty Distribution's trailing *"Captured mid-workshop."* flag. Opening runs the import path: the third Replace-family gate over unexported changes ("…Opening an example replaces the canvas and clears undo history."), `canvas.replace()` clearing history, clean landing, `Example opened` announced.
- **Bundling** — `src/lib/chrome/examples.ts` imports the committed `examples/*.bcc.json` **as raw bytes** (`?raw`) and reads them through `parseCanvasImport` at module load, so the files stay the single source *and* a future schema bump reaches the bundled examples through its migration instead of a stale cast. Entry names come from the parsed files; only the chooser one-liners live in code, as SPEC §10 copy.
- **The pinning test** — `src/lib/chrome/examples.test.ts` (13 tests): roster ⇄ `examples/` one-to-one; every file byte-exact through the real import path at `CANVAS_VERSION` (parse → stamp → serialize + trailing newline reproduces the committed bytes); the ratified one-liners verbatim; menu placement/semantics, clean landing, Esc-refocus, gate copy, Cancel/Replace flows; and the ticket-016 rider — an opened Royalty Distribution's artifact embeds its committed bytes with no *"Captured mid-workshop."* anywhere in the HTML.
- **README** — rewritten around the app (it was still the `sv` skeleton): the four examples linked as plain downloads with one-line descriptions, `examples/` named canonical, license section carrying the invented-domains line.
- **SPEC** — §1 in-scope line; new **§3.5 Bundled examples** (single source, serializer-canonical bytes, import-path opening, pinning test, README links); §6.1 gate wording widened to examples plus the clean-landing bullet; §8.3 chrome-menu keyboard grammar (Export + Examples, one grammar); §10 Examples menu entries, the third Replace-family dialog, `Example opened` in the live-region list; §14 provenance.

**Verification:** 304 tests green across 26 files, `svelte-check` clean, production build bundles the example bytes into the page chunk. Pre-commit WebKit smoke against `vite preview` (script + screenshots in `.scratch/bc-canvas-v1/issues/023-smoke/`): menu opens with all four two-line entries, Order Fulfillment lands clean (no Unexported changes), first edit dirties, gate fires with the ratified copy and Replace proceeds, keyboard path (focus → Enter → Option+Tab → Esc) closes and refocuses the control — the smoke re-confirmed WebKit's click-doesn't-focus-buttons and Option+Tab quirks; the checkpoint ticket should keep driving menus by keyboard, not click-focus.

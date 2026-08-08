---
name: example-chooser
title: "Prototype: how does \"open an example\" present in the chrome?"
labels: [wayfinder:prototype]
status: open
assignee: mitchell
blocked-by: []
---

## Question

Charting placed the chooser in the chrome, beside Import/New — the empty sheet stays quiet per SPEC §7. Prototype the control itself, in quiet-sheet character:

- **Grammar.** A menu that drops from an "Examples" control? A small dialog like Reference (⌘/)? A picker in the file-verb row? How do 3–5 entries present — name alone, or name plus the one-line description from the roster?
- **Flow.** Choosing an example runs the import path: the unexported-changes confirmation gate, history cleared, clean landing. Where does the gate's dialog sit in the flow, and what does the live region announce (`Canvas imported`? something example-specific)?
- **Keyboard & a11y.** The control joins the linear tab order and the chrome's grammar (SPEC §8): roles, focus rings, Esc behavior.
- **Copy.** Control label, entry lines, any dialog strings — `writing-copy` register, Import/Export verb family.

Prototype on a `prototype/example-chooser` branch, variants to react to, winner recorded here. Placeholder roster entries are fine — the real roster lands via [example-roster](wayfinder/tickets/020-example-roster.md) and doesn't block this.

## Rounds

**Round 1 (2026-08-09)** — three variants on branch `prototype/example-chooser` (commit `ac13cab`, worktree `.claude/worktrees/prototype-example-chooser`), mounted **in the real chrome** behind `?variant=` — run `npm run dev` on the branch, cycle via the floating bar or ←/→. Exploration record in `prototype/example-chooser/ASCII-SKETCHES.md` (a fourth direction, a persistent examples strip under the chrome, was rejected at ASCII stage for violating the quiet register); comparison and per-variant reasoning in `prototype/example-chooser/REASONING.md`; WebKit smoke + screenshots in `prototype/example-chooser/shots/`.

The variants disagree on *which grammar the chooser borrows*:

1. **Examples menu** — one more chrome button after Import… (an example is an import sourced from the app), dropdown in the Export menu's frame, two-line entries (name + roster one-liner). Smallest grammar; heaviest menu in the app.
2. **Examples dialog** — same button, but a small modal in the Reference dialog's family: the four canvases as a curated shelf. Room to breathe; a modal's ceremony for a four-item pick.
3. **Inside New canvas** — no new control: `New canvas` becomes a menu, `Blank canvas` first, then an EXAMPLES group. Teaches "example = starting point"; costs the common blank-canvas case an extra click forever.

Shared across all three (reaction wanted on each): opening runs the import path with the gate copy "Opening an example replaces the canvas and clears undo history." (third member of the Replace family); live region announces **`Example opened`** (alternative: reuse `Canvas imported`); Royalty Distribution's entry carries the quiet flag as a trailing sentence, draft *"Captured mid-workshop."*; menus mirror Export's keyboard grammar, the dialog mirrors Reference's. Placeholder canvases for the three non-OF entries — real ones land via [author-examples](wayfinder/tickets/022-author-examples.md).

Awaiting reaction; winner recorded here.

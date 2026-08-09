---
name: example-chooser
title: "Prototype: how does \"open an example\" present in the chrome?"
labels: [wayfinder:prototype]
status: closed
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

## Resolution

**Round 1 reaction (2026-08-09): variant 1 — the Examples menu — wins outright**, and every shared decision is ratified as drafted. No round 2 needed.

- **Grammar: Examples menu.** One more quiet chrome button, `Examples`, on the input side right after Import… — an example is an import sourced from the app. Its dropdown borrows the Export menu's frame; entries are two lines (name, muted roster one-liner). Accepted cost, eyes open: two-line items make it the heaviest menu in the app. The dialog's room-to-grow was moot (the map ships a fixed four-canvas roster) and the New-canvas graft's forever-tax on the blank-canvas common case was rejected.
- **Announcement: `Example opened`** — a distinct live-region string, parallel to `Canvas imported` / `New canvas`, so a screen-reader user hears which action completed.
- **Entry copy: name + one-liner confirmed**, and Royalty Distribution's line carries the quiet flag as its trailing sentence, *"Captured mid-workshop."* Final `writing-copy` polish rides [ship-example-chooser](wayfinder/tickets/023-ship-example-chooser.md).
- **Gate copy approved as the third member of the Replace family:** *Replace "\<name\>"? Its latest changes haven't been exported. Opening an example replaces the canvas and clears undo history.* — same frame as the Import/New gates, only the verb clause swapped.
- **Keyboard/a11y as prototyped:** the menu mirrors Export's grammar exactly (`aria-haspopup`, `role="menu"`/`menuitem`, Esc closes and refocuses the button, focus-out and click-outside close); the control joins the linear tab order in reading position.

**Assets:** branch `prototype/example-chooser` (commit `ac13cab`, worktree `.claude/worktrees/prototype-example-chooser`) — three variants mounted in the real chrome behind `?variant=`; `prototype/example-chooser/REASONING.md` (comparison), `ASCII-SKETCHES.md` (exploration incl. the rejected persistent-strip direction), `shots/` (WebKit screenshots). The branch is a throwaway reference for [ship-example-chooser](wayfinder/tickets/023-ship-example-chooser.md); variant 1's mounting is the implementation's starting sketch, not merge material.

---
name: empty-state-hints
title: "Prototype: empty state & teaching hints"
labels: [wayfinder:prototype]
status: open
assignee: mitchell
blocked-by: []
---

## Question

How does a blank canvas teach the method? Both prototype decisions constrain this: teaching hints exist only on empty/unfilled sections (never on a filled canvas, per [layout-visual-prototype](wayfinder/tickets/004-layout-visual-prototype.md)), and the live-sheet model already puts italic placeholders inside empty fields (per [inline-editing-prototype](wayfinder/tickets/005-inline-editing-prototype.md)). To settle by reacting to a prototype: what a brand-new canvas looks like (all eleven sections empty); the split between field placeholders and per-section teaching hints (ddd-crew's helper prompts — e.g. "What behaviors and data does this context own?"); when a hint disappears (first item added? field committed?); whether the first-run canvas seeds anything (a name placeholder, an example lane); and how hint text coexists with the quiet-sheet register.

Build on the live-sheet variant (`prototype/inline-editing/1-live-sheet/`). Use `/prototype` and `writing-copy` for draft hint text; final copy consolidates in [ui-copy](wayfinder/tickets/011-ui-copy.md).

## Rounds

**Round 1 (2026-08-07)** — three variants on branch `prototype/empty-state` (`prototype/empty-state/`), disagreeing on *where the teaching lives*:

1. **Placeholder questions** — the form teaches: every empty field's placeholder asks the section's question, and an empty section's ghost add carries the question too ("+ collaborator — who sends this context commands, queries or events?"). Teaching vanishes instantly at first content; nothing seeded.
2. **Section preludes** — a dedicated hint layer: one-to-two italic sentences between label and body per empty section (ddd-crew helper questions in house voice); hides at first committed content, returns if the section is emptied. Placeholders shrink to "…"; nothing seeded.
3. **Specimen ghosts** — teach by example: structured sections show a faint "example"-tagged Order-Fulfillment micro-specimen (one lane, one term, one decision…) at half opacity; click starts a real entry, first real content dissolves it, footer "hide examples" clears the layer. Never serialized — the document stays byte-empty. Prose fields keep question placeholders.

Shared across all three: ghost adds always visible on an *empty* section (hover-only elsewhere); no welcome modal or tour; title block keeps "Name this context" / "—" placeholders. A fourth direction (margin tutor) died at ASCII stage — see `ASCII-SKETCHES.md` on the branch. All three headless-smoke-tested (blank doc serializes empty, add/commit/empty flows drive hint visibility, no console errors). Awaiting reaction.

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

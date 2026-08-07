---
name: inline-editing-prototype
title: "Prototype: inline editing interactions"
labels: [wayfinder:prototype]
status: open
assignee: mitchell
blocked-by: [layout-visual-prototype]
---

## Question

How does editing feel, in place, on the rendered canvas? Raise the layout prototype's fidelity to answer: contenteditable vs swap-in inputs for free-text sections; pick-one enum UI for strategic classification with the escape hatch; the 15-trait domain-role picker (with trait descriptions surfaced); adding/removing/reordering message rows and collaborator lanes; how a section signals "click to edit" without cluttering the presentation view.

Use `/prototype`. The reaction here fixes the interaction model the spec describes, and feeds undo/redo granularity in [state-undo-autosave](wayfinder/tickets/006-state-undo-autosave.md).

## Asset

Prototype on branch `prototype/inline-editing`, path `prototype/inline-editing/` (checked out in worktree `.claude/worktrees/prototype-inline-editing`, commit `b53730d`). Three variants of the same quiet-sheet "Order Fulfillment" canvas, each with **working in-memory editing** — cycle via the floating bar or ←/→; a `{}` drawer (bottom right) shows the live serialized Canvas JSON after every commit. Top-level `REASONING.md` has the comparison table; each folder carries its own `REASONING.md`.

**Round 1 (2026-08-07)** — the variants disagree on *when the canvas admits it is editable*:

1. **Live sheet** — modeless: contenteditable everywhere all the time; affordances (ghost adds, ×, drag grips) fade in on hover; popover pickers with custom escape hatch; drag to reorder chips and lanes.
2. **Focus panel** — per-section: click a panel and it alone swaps into a real form (textareas/inputs, explicit ↑ ↓ × and + buttons, in-panel 15-trait checklist, title-block radio groups with "other…") with Done/Cancel while the rest dims. One panel-edit = one commit.
3. **Marked-up sheet** — global Edit/Done pill: view mode is the untouched artifact with zero chrome; edit mode marks everything up at once (dashed slots, always-visible × / ⠿ handles, dropdown-styled vocabulary values; everything drag-reorders).

All three headless-smoke-tested (edits, pickers, escape hatches, cancel path, mode gating — no console errors).

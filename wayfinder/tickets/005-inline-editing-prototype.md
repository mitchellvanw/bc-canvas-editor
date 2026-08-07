---
name: inline-editing-prototype
title: "Prototype: inline editing interactions"
labels: [wayfinder:prototype]
status: closed
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

## Resolution

Settled in one round (2026-08-07): **variant 1 — Live sheet** approved. Primary source: branch `prototype/inline-editing`, `prototype/inline-editing/1-live-sheet/` (all three variants and the comparison table are on that branch).

The interaction model, concretely:

- **Modeless.** No edit mode, no per-section forms — the canvas is a document. Every free-text value is contenteditable (plaintext) in place, always. Blur commits; Enter commits single-line fields; Esc reverts the field.
- **Affordances materialize on approach.** The presentation view carries zero editing chrome; hovering a panel fades in its ghost adds ("+ trait", "+ collaborator", "+ term", chip "+", "+ decision"…), hovering an item reveals its ×, hovering a lane reveals its ⠿ drag grip. Editable text shows a faint halo on hover, a hairline outline on focus.
- **Curated vocabularies are popovers on the value itself.** Strategic classification and lane relationship values are clickable where they render → popover with the curated list, ✓ on the current value, "custom…" input as escape hatch (relationship also offers "— none —"). Custom values render identically to curated ones and round-trip through the serializer.
- **Domain roles**: ghost "+ trait" chip → multi-select popover checklist of the 15 traits with one-line descriptions inline, plus a custom-trait input; chips removed via hover ×.
- **Messages**: ghost "+" per lane → mini type popover (▶ command / ? query / ◆ event), then the new chip's name is focused for immediate typing. Chips drag-reorder within their lane; lanes drag-reorder by grip; lane × removes the collaborator.
- **Commit granularity** (feeds [state-undo-autosave](wayfinder/tickets/006-state-undo-autosave.md)): one field blur = one commit; one structural action (add / remove / reorder / pick) = one commit.
- **Empty fields show italic placeholders** in place — the seed of the empty-state guidance (graduated to [empty-state-hints](wayfinder/tickets/009-empty-state-hints.md)).
- **Known risks accepted for now**, to be softened in build, not by changing model: discoverability of hover-only affordances, stray-click carets in prose.

Variants 2 (Focus panel — per-section swap-in forms) and 3 (Marked-up sheet — global Edit/Done mode) rejected: both tax quick edits with ceremony the document-editor framing doesn't want.

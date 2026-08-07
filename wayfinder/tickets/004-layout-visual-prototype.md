---
name: layout-visual-prototype
title: "Prototype: canvas layout & visual language"
labels: [wayfinder:prototype]
status: open
assignee: mitchell
blocked-by: []
---

## Question

What does the V5 canonical canvas look like in this app? Build a static (non-editing) rendering of a filled-in example canvas to react to: desktop-first layout in Tailwind v4 (description/classification/roles top; inbound left; ubiquitous language + business decisions center; outbound right; assumptions/metrics/open questions bottom), with the agreed Event Storming palette (commands blue, queries green, events orange; business decisions lilac, collaborators pink, open questions red; neutral elsewhere) and ddd-crew CC BY 4.0 attribution.

Use `/prototype` and `visual-design-brainstorming` (explore a few directions before committing). The reaction to this prototype settles the visual language; link the prototype as the ticket's asset.

## Asset

Prototype built (2026-08-07), awaiting reaction: branch `prototype/canvas-visual-language`, path `prototype/canvas-visual-language/` (checked out in worktree `.claude/worktrees/prototype-canvas-visual-language`). Three self-contained HTML variants of the same filled-in "Order Fulfillment" canvas, switchable in-browser (floating bar / arrow keys): **1 Workshop wall** (stickies, marker headings, full Event Storming fills), **2 Print document** (ruled ink grid, serif, color as typed chips), **3 Product panels** (app-register cards, tags and pills, soft tints). A fourth direction (dark blueprint) was sketched in ASCII and rejected — reasoning in `ASCII-SKETCHES.md`; each variant folder carries a `REASONING.md`.

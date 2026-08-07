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

Prototype on branch `prototype/canvas-visual-language`, path `prototype/canvas-visual-language/` (checked out in worktree `.claude/worktrees/prototype-canvas-visual-language`). HTML variants of the same filled-in "Order Fulfillment" canvas, switchable in-browser (floating bar / arrow keys); each folder carries a `REASONING.md`, exploration record in `ASCII-SKETCHES.md`.

**Round 1 (rejected 2026-08-07** — wrong registers entirely, color handling wrong): 1 Workshop wall (stickies, full fills), 2 Print document (ruled ink grid, chips), 3 Product panels (SaaS cards, tints). A dark-blueprint direction was rejected at ASCII stage.

**Round 2 (2026-08-07)** — user direction: warm minimal craft + a design inspired by `~/Downloads/bounded-context-canvas-example.html`/`-template.html`: **4 Warm minimal craft** (no boxes, hairline rules, serif content, color as small inky marks), **5 Drafting sheet** (the reference design's language — paper + drafting grid, ink title block, sticky fills with ink borders, shaped messages — adapted to our content and schema decisions). Reaction: **5 Drafting sheet wins**, "still a bit rough".

**Round 3 (2026-08-07, awaiting reaction)** — two derivatives of the drafting sheet, each reading "rough" differently: **6 Quiet sheet** (rough = too busy: fainter grid, hints removed, one uniform message-chip shape, label underlines, unboxed collaborators, highlighter-stroke terms), **7 Technical sheet** (rough = not committed enough: sheet border frame, ink label tabs echoing the title block, mono panel numbers 01–09, hard print shadows, shaped messages kept, mono data-strip footer).

---
name: layout-visual-prototype
title: "Prototype: canvas layout & visual language"
labels: [wayfinder:prototype]
status: closed
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

**Round 3 (2026-08-07)** — two derivatives of the drafting sheet, each reading "rough" differently: **6 Quiet sheet** (rough = too busy: fainter grid, hints removed, one uniform message-chip shape, label underlines, unboxed collaborators, highlighter-stroke terms), **7 Technical sheet** (rough = not committed enough: sheet border frame, ink label tabs echoing the title block, mono panel numbers 01–09, hard print shadows, shaped messages kept, mono data-strip footer).

## Resolution

Settled over three prototype rounds (2026-08-07): **variant 6 — Quiet sheet** wins. Primary source: branch `prototype/canvas-visual-language`, `prototype/canvas-visual-language/6-quiet-sheet/` (all seven variants and the round-by-round reasoning are on that branch).

The visual language, concretely:

- **Ground:** warm cream paper `#EAE7DE` with a faint 32px drafting grid; sections as near-white sheets `#FDFDFB`, 1px `#D8D4C8` border, 5px radius, whisper of shadow. V5 canonical layout via the prototyped 12-column grid areas.
- **Title block:** near-black ink block (`#1A1E20`, 6px radius) with spaced-caps eyebrow "Bounded Context Canvas · V5", the context name in Archivo 700, and strategic classification as three label + mono-value pairs riding inside the block.
- **Type trio:** Archivo for structure/labels, Source Serif 4 for the user's prose, IBM Plex Mono for identifiers (messages, terms, classification values, relationships). Webfonts — self-host in-app, inline in the HTML artifact.
- **Palette (EventStorming fill + same-hue ink border):** command `#85BCE5`/`#33688F`, query `#93CB91`/`#40733E`, event `#F3A54E`/`#A96517`, policy `#C2ABDD`/`#6F519B`, collaborator `#F1A5CB`/`#A94879`, hotspot `#F76BA3`/`#B92367`, term `#EFE08B`/`#8A7A12`.
- **Messages:** one uniform chip shape (rounded mono chip, fill + ink border) for all three types, distinguished by color and glyph (▶ command, ? query, ◆ event). No per-type shapes.
- **Collaborators:** name in collaborator-pink ink with a pink underline — no sticky box; relationship as quiet right-aligned mono text.
- **Section labels:** small-caps Archivo with a short 2px underline in the section's hue (neutral gray where no hue applies).
- **Terms:** highlighter stroke under the mono term. **Decisions/questions:** small colored square markers (policy lilac; hotspot pink, rotated).
- **Teaching hints:** never shown on a filled canvas — they move to the empty state (feeds the empty-state fog patch).
- **Footer:** one-line swatch legend + ddd-crew CC BY 4.0 attribution.

Rejected on the way: round 1 (workshop wall, print document, product panels — wrong registers, wrong color handling), 4 warm minimal craft, 7 technical sheet; 5 drafting sheet survives as the base whose language 6 calmed down.

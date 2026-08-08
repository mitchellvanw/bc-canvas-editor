---
name: bc-canvas-examples-map
title: "Wayfinder map: examples to choose from"
labels: [wayfinder:map]
---

# Wayfinder map: examples to choose from

## Destination

The live app at `bc-canvas.pages.dev` offers 3–5 curated example canvases — real, defensibly well-modeled bounded contexts — choosable from the app chrome. Opening one reuses the import path wholesale (confirmation gate over unexported changes, history cleared) and lands **clean**. `examples/*.bcc.json` is committed as the canonical source the app bundles from, pinned by a test through the real import path and linked from the README as downloadable files. `SPEC.md` is amended so it stays the single hand-off truth. The map is done when the chooser and every example pass a live WebKit checkpoint.

## Notes

- **This map carries execution** (like the hosting map): the codebase is built, live, and verified; task tickets *do* — author, build, verify — once the decision tickets clear.
- **Settled context (from charting, 2026-08-09):** examples are full loadable canvases, not snippets or a read-only gallery. Choosing happens via a quiet chrome control beside Import/New — SPEC §7's no-seeding empty sheet stays untouched (the chooser's exact grammar is the prototype ticket's question). Loading an example lands clean: its bytes exist as a published re-importable file, so the dirty-state definition holds; first edit dirties as usual. Order Fulfillment (the SPEC §3.1 reference example, already drafted untracked in `examples/`) is one of the set; the roster and authoring are ticket work. Examples teach modeling taste as much as UI — each must be a genuinely good model.
- **Skills:** `/grilling` + `/domain-modeling` for decision tickets (maintain `CONTEXT.md` as terms sharpen); `/prototype` + `visual-design-brainstorming` for the chooser; `writing-copy` for every user-facing string; the `run` skill plus the WebKit-checkpoint habit for live verification.
- **Tracker (local markdown):** tickets live in `wayfinder/tickets/*.md`. Frontmatter: `status: open|closed`, `assignee` (non-empty = claimed), `blocked-by: [ticket names]`. Frontier = open, unassigned, all blockers closed. Resolutions are appended to the ticket under `## Resolution`, then `status: closed`. Commit tracker changes to `main`.

## Decisions so far

<!-- one line per closed ticket -->

- [Research: published example canvases & what CC BY asks of derived ones](wayfinder/tickets/019-example-canvas-sources.md) — only one complete V5 example exists publicly (ddd-crew's "Scoring", sparse fill is canonical); deriving costs per-example TASL attribution atop a BY-vs-BY-SA license ambiguity, so invent our own domains under the existing attribution line.
- [Grilling: which 3–5 example canvases, and what must the set demonstrate?](wayfinder/tickets/020-example-roster.md) — four invented canvases: Order Fulfillment (core, flagship, all sections filled), Notifications (generic, sharing OF's `Order Shipped` lane from the receiving side), Appointment Scheduling (supporting, matured), Royalty Distribution (mid-workshop, classification unset, quietly flagged in chooser copy); classification+density drove the picks, relationship/message coverage are authoring checklists; **Example** added to `CONTEXT.md`.

## Not yet specified

_(empty — the effort is small enough that charting saw the whole route; the tickets cover it.)_

## Out of scope

- Deep links (`?example=order-fulfillment`) — URL state in a deliberately origin-agnostic shell; the chooser covers "show me". Revisit only under a redrawn destination.
- A browsable gallery of example *artifacts* (HTML/PNG) — charting chose loadable canvases; the editor itself is the gallery.
- Seeding or example hints in the empty state — SPEC §7's quiet sheet stands; the chooser lives in chrome.
- User-contributed or growing example sets — this map ships a fixed curated roster.

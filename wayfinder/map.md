---
name: bc-canvas-editor-map
title: "Wayfinder map: BC Canvas Editor"
labels: [wayfinder:map]
---

# Wayfinder map: BC Canvas Editor

## Destination

A hand-off-ready spec (`SPEC.md`) for a client-side bounded context canvas editor: WYSIWYG inline editing of a ddd-crew canvas V5, export as self-contained HTML or 2x PNG artifact, import/export of a versioned Canvas file (JSON). The map is done when every design decision is made, the key interactions and visuals have been prototyped and reacted to, and the spec compiles them — nothing left to decide before building starts.

## Notes

- **Settled context (from charting):** single canvas at a time, like a document editor. SvelteKit (TypeScript) + Tailwind CSS v4, `adapter-static`, deployed to Cloudflare Pages — strictly client-side, no server. Autosave to localStorage as safety net; the Canvas file is the durable format. Desktop-first editor; the HTML artifact gets a responsive pass. V5 canonical layout only. Curated vocabularies (strategic classification enums, 15 domain-role traits, context-mapping relationship types) as picker-plus-escape-hatch. Event Storming palette applied where the semantic match is real: Command = blue, Query = green, Event = orange; Business Decisions = lilac (policy), Collaborators = pink (external system), Open Questions = red (hotspot); neutral elsewhere. Undo/redo: single linear history. Canvas license is CC BY 4.0 — ddd-crew attribution required in app and artifacts.
- **Skills:** `/grilling` + `/domain-modeling` for decision tickets (maintain `CONTEXT.md` as terms sharpen); `/prototype` + `visual-design-brainstorming` for prototype tickets; `writing-copy` for any user-facing text produced along the way.
- **Tracker (local markdown):** tickets live in `wayfinder/tickets/*.md`. Frontmatter: `status: open|closed`, `assignee` (non-empty = claimed), `blocked-by: [ticket names]`. Frontier = open, unassigned, all blockers closed. Resolutions are appended to the ticket under `## Resolution`, then `status: closed`. Commit tracker changes to `main`.

## Decisions so far

<!-- one line per closed ticket -->

- [Research: Contexture's canvas JSON — lessons for our schema](wayfinder/tickets/001-contexture-schema-lessons.md) — nest messages under collaborator lanes with explicit command/query/event types (Contexture can't express V5 lanes); versioned root + ordered migrations; escape-hatch values must round-trip through the UI. Full notes on branch `research/contexture-schema`.

## Not yet specified

- **Empty state & placeholder guidance** — how a blank canvas teaches the method (ddd-crew's helper prompts per section, trait/relationship descriptions). Sharpens after the layout and editing prototypes.
- **Accessibility & keyboard model** — what tabbing/keyboard editing means in an inline-editing canvas. Sharpens after the editing-interactions prototype.
- **UI copy** — labels, buttons, empty-state text, tone. Sharpens after the layout prototype; use `writing-copy`.
- **In-app reference material** — whether domain-role traits and relationship types need an explanatory panel beyond picker tooltips. Sharpens after the prototypes.

## Out of scope

- Backend, auth, real-time collaboration, team libraries — sharing happens via exported files/artifacts.
- Multi-canvas library and context-map relationships between canvases — single-document editor only.
- Use Case Swimlanes layout variant — V5 canonical only.
- PDF export — browsers print the HTML artifact fine.
- Importing foreign formats (Contexture, Excalidraw, Miro) — own Canvas file schema only.
- Mobile/tablet editing — desktop-first; only the read-only HTML artifact is responsive.

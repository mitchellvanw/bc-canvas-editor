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
- [Research: client-side export techniques (PNG + self-contained HTML)](wayfinder/tickets/002-export-techniques.md) — PNG via SnapDOM (foreignObject rasterization sidesteps Tailwind v4's oklch entirely; fallbacks modern-screenshot → html2canvas-pro); HTML artifact via dedicated template + inlined compiled CSS + data-URI fonts + embedded canvas JSON; Safari foreignObject flakiness is the risk to test first. Full notes on branch `research/export-techniques`.
- [Decision: the Canvas file schema](wayfinder/tickets/003-canvas-file-schema.md) — flat camelCase JSON, integer `version` + ordered migrations (newer versions refused, never mutated); single-string escape hatches; lanes `{collaborator, relationship?, messages}` with no collaborator kind and no row ids; closed `command|query|event` message type; `.bcc.json`; deterministic serialization, no metadata envelope.
- [Prototype: canvas layout & visual language](wayfinder/tickets/004-layout-visual-prototype.md) — "Quiet sheet" wins after three rounds: warm cream paper + faint drafting grid, ink title block carrying name and classification, Archivo/Source Serif 4/Plex Mono, EventStorming fills with same-hue ink borders, uniform message chips with type glyphs, unboxed pink-underlined collaborators, highlighter-stroke terms; teaching hints deferred to the empty state. Full token/treatment detail in the ticket; prototype on branch `prototype/canvas-visual-language` (winner: `6-quiet-sheet/`).
- [Prototype: inline editing interactions](wayfinder/tickets/005-inline-editing-prototype.md) — "Live sheet" wins in one round: modeless in-place editing (contenteditable; blur commits, Esc reverts), affordances materialize on hover only, curated vocabularies as popovers on the value with custom escape hatches, drag-reorder for chips and lanes; commit granularity (per field blur / per structural action) feeds the undo model. Prototype on branch `prototype/inline-editing` (winner: `1-live-sheet/`).
- [Decision: document state, undo/redo & autosave model](wayfinder/tickets/006-state-undo-autosave.md) — runtime doc = file shape + ephemeral row ids (stripped on save); linear history of full-document snapshots per commit, Cmd+Z globally intercepted (reverts mid-edit field first), undo scrolls-and-highlights without stealing focus; autosave writes the serialized file to one localStorage slot on every commit (multi-tab = last-write-wins + notice); dirty state is "unexported changes" (only Canvas-file export/import clears it — amended by artifact-design: HTML-artifact export/import clears it too), which gates the import/new confirmation; import/new clears history.
- [Decision: artifact production (HTML + PNG)](wayfinder/tickets/007-artifact-design.md) — one shared read-only CanvasSheet component renders both artifacts offscreen (pixel-identical, no editor leakage); the HTML artifact embeds the Canvas file byte-identically and is re-importable (`.bcc.html` shares the Canvas-file import path; its export clears unexported changes, PNG never does); whole compiled Tailwind CSS + used-weight latin WOFF2s inlined; single-breakpoint stack + print pass; PNG via SnapDOM alone at 2x, fixed ~1440px width, title block through attribution footer, Safari/iOS verification as first build checkpoint; naming `<slug>.bcc.{json,html,png}`; empty sections render label-only.
- [Prototype: empty state & teaching hints](wayfinder/tickets/009-empty-state-hints.md) — "Placeholder questions" wins in one round: no hint layer, no seeding, no tour — the form teaches; empty-field placeholders and empty-section ghost adds ask the section's question, reverting to terse labels at first content and returning whenever emptied; ghost adds always visible on empty sections. Prototype on branch `prototype/empty-state` (winner: `1-placeholder-questions/`).
- [Decision: keyboard model & accessibility](wayfinder/tickets/010-keyboard-a11y.md) — editor: full keyboard operability + sound semantics, no formal WCAG claim; HTML artifact: WCAG AA (tokens shift if a contrast pair fails); linear tab order, focus-reveals-what-hover-reveals with tabbable controls plus shortcut accelerators, Alt+arrow reorder, listbox/checkbox popover grammar, ink `:focus-visible` rings, textbox roles named by field identity, native list semantics with type-led names, one polite live region for structural/non-local changes, `prefers-reduced-motion` honored; keyboard discoverability delegated to reference-material.
- [Decision: UI copy](wayfinder/tickets/011-ui-copy.md) — app named **BC Canvas**; Import/Export verbs (never Open/Save); dirty indicator is the bare words "Unexported changes", clean state shows nothing; confirmation dialogs, refusal notices, multi-tab notice, footer legend + CC BY attribution line drafted final; placeholder-question table finalized ("Why these roles?" dropped); popover microcopy "custom…" / "— none —"; terse type-led live-region strings. Final strings live in the ticket.

## Not yet specified

_(empty — the editing-interactions decision graduated the last four patches into tickets: [empty-state-hints](wayfinder/tickets/009-empty-state-hints.md), [keyboard-a11y](wayfinder/tickets/010-keyboard-a11y.md), [ui-copy](wayfinder/tickets/011-ui-copy.md), [reference-material](wayfinder/tickets/012-reference-material.md).)_

## Out of scope

- Backend, auth, real-time collaboration, team libraries — sharing happens via exported files/artifacts.
- Multi-canvas library and context-map relationships between canvases — single-document editor only.
- Use Case Swimlanes layout variant — V5 canonical only.
- PDF export — browsers print the HTML artifact fine.
- Importing foreign formats (Contexture, Excalidraw, Miro) — own Canvas file schema only.
- Mobile/tablet editing — desktop-first; only the read-only HTML artifact is responsive.

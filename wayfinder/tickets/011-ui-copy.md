---
name: ui-copy
title: "Decision: UI copy"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: [empty-state-hints]
---

## Question

Settle the concrete user-facing text, in the calm documentary register set by the quiet sheet. The surfaces are now known from the live-sheet model: ghost affordance labels ("+ trait", "+ collaborator", "+ term", "+ decision"…); popover microcopy ("custom…", "— none —", picker hints); empty-field placeholders and the per-section teaching hints from [empty-state-hints](wayfinder/tickets/009-empty-state-hints.md); chrome outside the sheet (app name, import/export/undo controls, unexported-changes indicator wording per [state-undo-autosave](wayfinder/tickets/006-state-undo-autosave.md)); dialogs and notices (import/new over unexported changes, refusing a newer-version file, the canvas-open-in-another-tab notice); and the footer legend + CC BY 4.0 attribution line.

Use `/grilling` with `writing-copy`.

## Resolution

Settled in a grilling session (2026-08-07), one round, all ten recommendations accepted. This ticket is the canonical home of the final strings; the spec compiles from here.

**App name: BC Canvas.** Title bar: `<canvas name> — BC Canvas`; unnamed canvas: `Untitled — BC Canvas`.

**File verbs: Import / Export** (never Open/Save — "Save" would promise a file-system write the browser can't quietly do, and the dirty flag is already *unexported changes*). Chrome controls:

- **Import…** — one control, accepts `.bcc.json` and `.bcc.html`.
- **Export** menu: **Canvas file (.bcc.json)** · **HTML artifact (.bcc.html)** · **PNG image (2x)**.
- **New canvas**.
- Undo/Redo: conventional labels with shortcut in tooltip — `Undo (⌘Z)` / `Redo (⇧⌘Z)` (derived, not separately grilled).

**Unexported-changes indicator:** dirty state shows the two words **Unexported changes**, small, near the Export control. Clean state shows nothing — the indicator's presence is the signal.

**Confirmation dialogs** (two buttons only; no "Export first…" third button — Cancel plus the ever-present Export control is the same remedy). Unnamed canvas substitutes "this canvas" for the name.

> **Replace "Order Fulfillment"?**
> Its latest changes haven't been exported. Importing replaces the canvas and clears undo history.
> [ Cancel ] [ **Replace** ]

> **Start a new canvas?**
> "Order Fulfillment" has changes that haven't been exported. Starting fresh discards them and clears undo history.
> [ Cancel ] [ **Start new** ]

**File-refusal notices:**

> **This file is from a newer version of BC Canvas.**
> It was exported with format version 3; this app reads up to version 1. The file hasn't been touched. Reload the page to pick up the latest app, then import again.

> **This file couldn't be read as a Canvas file.**
> It isn't a Canvas file export, or it's been modified. Nothing was imported.

**Multi-tab notice** (persistent, both tabs):

> **This canvas is open in another tab.** Whichever tab edits last overwrites the other — close one of them.

**Footer legend + attribution** (on the sheet, inside the PNG capture region): swatch + lowercase mono labels on one line — `command · query · event · decision · collaborator · open question` — with the attribution line **"Based on the Bounded Context Canvas by the ddd-crew · CC BY 4.0"**, linked to the ddd-crew repo and license in the editor and HTML artifact, plain text in the PNG.

**Placeholder questions (final):**

| Surface | Copy |
|---|---|
| Name | *Name this context* |
| Description | *What does this context exist to do? A few sentences in business language.* |
| Classification values | — (em dash until picked; teaching lives in the picker) |
| Domain roles ghost | *+ trait — how does this context behave?* |
| Inbound ghost | *+ collaborator — who sends this context commands, queries or events?* |
| Outbound ghost | *+ collaborator — who consumes what this context emits?* |
| Ubiquitous language ghost | *+ term — which words mean something precise here?* |
| Term definition field | *What it means here* |
| Business decisions ghost | *+ decision — which rules does this context enforce?* |
| Assumptions ghost | *+ assumption — what are you taking to be true?* |
| Verification metrics ghost | *+ metric — what would verify this design?* |
| Open questions ghost | *+ question — what's still unresolved?* |

Terse row-field placeholders once a section has content: `Collaborator`, `Message name`, `Term`, `Rule`, `detail`, `…`. The prototype's *"Why these roles?"* placeholder is **dropped** — a prototype artifact with no backing schema field; no roles free-text note is added.

**Popover microcopy:** escape hatch **custom…** (lowercase, ellipsis signals it opens a field); clear/unset entry **— none —**, except the relationship picker where it reads **— no relationship —** ("none" is ambiguous next to pattern names). No hint lines in any picker — the trait descriptions are the teaching.

**Screen-reader announcements** (the one polite live region from [keyboard-a11y](wayfinder/tickets/010-keyboard-a11y.md)): terse, type-led, no sentence dressing — `Collaborator removed` · `Trait added` · `Moved up` / `Moved down` · `Undone: <section name>` / `Redone: <section name>` · `Canvas imported` · `New canvas`. Local edits the caret already evidences are not announced.

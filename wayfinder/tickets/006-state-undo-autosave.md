---
name: state-undo-autosave
title: "Decision: document state, undo/redo & autosave model"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: [canvas-file-schema, inline-editing-prototype]
---

## Question

Define the in-memory document model and its behavior over time: relationship between runtime state and the Canvas file schema (same shape or mapped?); the single linear undo/redo history — what constitutes one history entry given the editing interactions (per keystroke? per field commit? per structural change?); autosave-to-localStorage details (debounce, storage key, behavior across multiple tabs, dirty/saved indicator); and what happens on import over unsaved work.

## Resolution

Settled in a grilling session (2026-08-07). Builds on the settled commit granularity from [inline-editing-prototype](wayfinder/tickets/005-inline-editing-prototype.md) (one field blur = one commit; one structural action = one commit) and the id-free file schema from [canvas-file-schema](wayfinder/tickets/003-canvas-file-schema.md).

**Runtime document**

- The runtime document is *exactly* the Canvas file shape, with an ephemeral `id` stamped onto each row/lane object on load/creation for keyed rendering and drag-reorder. Serialization strips ids (plus fixed key order) — ids never reach the file. One model, one serializer; no normalized store.

**Undo/redo**

- Single linear history of **full-document snapshots**, one per commit; undo/redo swaps the document. Uncapped within the session (a full canvas is a few KB; snapshots make correctness trivial). History is session-scoped: cleared on import/new, not persisted across reloads.
- **Cmd+Z is intercepted globally.** If the focused field has uncommitted edits, Cmd+Z reverts the field (synonym of Esc); otherwise it pops app history. Native contenteditable undo is never in play — one coherent mental model, no cross-browser undo-stack fights.
- Undo/redo **scrolls the affected region into view with a brief highlight**, but never moves focus (no uninvited carets in prose — a hazard the prototype flagged).

**Autosave**

- Serialize and write to localStorage **on every commit** — commits are discrete and writes are tiny, so no debounce. A `beforeunload`/`visibilitychange` flush commits any mid-edit field first.
- Payload is the serialized Canvas file JSON only; history is not persisted. Single fixed storage key (`bcc.autosave`) — single-document app, one slot.
- On app load: restore the autosave slot if present, else a blank canvas.
- **Multi-tab:** last write wins, softened by a persistent notice in both tabs (via the `storage` event) that the canvas is open elsewhere. No locking machinery. Notice wording → [ui-copy](wayfinder/tickets/011-ui-copy.md).

**Dirty state & import**

- The meaningful dirty state is **unexported changes**: the Canvas has changed since it was last exported to or imported from a Canvas file. It drives the quiet indicator and the confirmation gate below. Autosave status alone is near information-free (the browser copy is never stale) — and localStorage is evictable, so only the Canvas file counts as durable.
- *Corollary (derived, not separately grilled):* Artifact exports (HTML/PNG) do **not** clear the flag — Artifacts are presentation-only and not re-importable, so they don't secure the work. Only Canvas-file export/import resets it.
- **Import or New over unexported changes:** confirmation dialog first; on proceed the document is **replaced and history cleared** — a session boundary, not an undoable edit (no cross-document snapshots in one linear history). With nothing unexported, import/new proceeds without ceremony. Refusing newer-version files was settled in the schema ticket.

---
name: editor-views
title: "Task: build the three views in the editor"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [shared-digest-seam, view-switcher-prototype, json-buffer-prototype, json-refusal-copy]
---

## Question

Build what the three tickets ahead of this one decided: the switcher on the sheet's top edge, the JSON View with its buffer and Apply, the Markdown View as source. Everything here is drawing a settled decision, so the ticket's real work is the seams between them.

**The switcher.** Real `role="tablist"`, arrow-key selection, one tab stop for the set, panels associated by `aria-controls`/`aria-labelledby`. Sheet is the default and the app always opens on it — the `bcc.autosave` slot is the Canvas file byte-for-byte and does not grow app-UI state. No `⌘1/2/3` at v1. The switcher renders in the editor only; the offscreen artifact mount must not see it, the same way the responsive tiers are inert there (§5) and affordances never leak into a serialized mount (§9).

**The JSON View.** Plain `<textarea>`, mono, showing `serializeCanvas`'s exact bytes and re-rendering from the document. Apply runs the full `parseCanvasImport` path — version check, ordered migrations, strict validation — and on success replaces the document as **one commit**, byte-compared first so a no-op never enters history. On failure, the copy and placement [json-refusal-copy](wayfinder/tickets/044-json-refusal-copy.md) settled, with `detail` shown. The buffer lives for the session, survives tab switches, is never overwritten by the document moving underneath, is never persisted, and is never touched by `flush.ts`.

**The Markdown View.** Read-only source in a mono block, straight from `src/lib/model/digest.ts`. It re-renders from the document like the JSON does. Nothing else — no rendering, no editing, no wrapping decisions beyond what makes long lines readable.

**Copy.** JSON and Markdown each get copy-to-clipboard; the Sheet tab gets none. Copy announces politely through the existing live region (§8.5) and shows no toast — this app has no toast pattern and is not growing one here. Copy does **not** clear Unexported changes.

**Where the seams are, and what to watch:**

- **Undo across the tabs.** Undo/redo scrolls the affected region into view with a brief highlight and never moves focus (§6.1). An undo that lands while the JSON or Markdown tab is showing has no region to scroll to. Decide what "scroll into view with a highlight" means when the affected region is not on screen, and do not let it yank the user's tab out from under them.
- **The 1080px floor.** Chrome and sheet share the floor; the switcher is now part of that band. Below it the page scrolls horizontally and nothing deforms.
- **Empty canvas.** The Markdown of a blank canvas is nearly one line. Ship it as it renders and note how it reads — the map's fog is waiting on exactly this observation.

`SPEC.md` gains the switcher in §5, the JSON commit model and the buffer in §6/§6.1, and every new string in §10. Both suites and `svelte-check` green.

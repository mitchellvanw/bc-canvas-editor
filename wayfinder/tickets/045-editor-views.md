---
name: editor-views
title: "Task: build the three views in the editor"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [shared-digest-seam, view-switcher-prototype, json-buffer-prototype, json-refusal-copy]
---

## Question

Build what the three tickets ahead of this one decided: the switcher, the JSON View with its buffer and Apply, the Markdown View as source. Everything here is drawing a settled decision, so the ticket's real work is the seams between them.

**The switcher.** A left-aligned segmented pill in the gutter band **above** the sheet — not on the sheet's top edge, which is where charting expected it to land before [view-switcher-prototype](wayfinder/tickets/042-view-switcher-prototype.md) drew it. 4px radius, 1px `--color-line` border, sheet fill, 1px dividers, active segment filled ink at weight 600, focus ring **inset** (`outline-offset: -2px`). The title block does not persist across Views: it belongs to the Sheet, and switching replaces it along with everything else below the pill. `CanvasSheet` is untouched — the strip is a sibling, which is the property that keeps the shared component free of a switcher seam.

Real `role="tablist"`, arrow-key selection, one tab stop for the set, panels associated by `aria-controls`/`aria-labelledby`. **The keydown handler rides each tab, not the tablist** — on the container, the linter correctly wants a `tabindex` of its own. Sheet is the default and the app always opens on it — the `bcc.autosave` slot is the Canvas file byte-for-byte and does not grow app-UI state. No `⌘1/2/3` at v1. The switcher renders in the editor only; the offscreen artifact mount must not see it, the same way the responsive tiers are inert there (§5) and affordances never leak into a serialized mount (§9).

**The three labels are this ticket's to settle.** 042 deferred them here so `writing-copy` runs over them with §10's table in one pass. **"Sheet · JSON · Markdown" carries as provisional** — every variant was drawn with it, and 043 and 047 reference the tabs by those names. `Canvas` is ruled out (it is the document); `Digest` is ruled out (MCP jargon, per `CONTEXT.md`). The live alternative is `Canvas file` for the middle tab, matching the Export menu's own noun for the same bytes at the cost of a longer label.

**Soften the chrome resemblance here.** 042 accepted it as a §6 known risk rather than solving it: the pill and the chrome buttons are the same family, and it bites hardest at the stack tier where the chrome wraps and the pill lands directly under `Import…` (`.scratch/view-switcher/evidence/C-4-stack-sheet.png` on `prototype/view-switcher`). Levers that don't change the model: transparent fill, dividers without the outer border, smaller type, a wider gap below the chrome band.

**The JSON View.** Plain `<textarea>`, mono, showing `serializeCanvas`'s exact bytes and re-rendering from the document. Apply runs the full `parseCanvasImport` path — version check, ordered migrations, strict validation — and on success replaces the document as **one commit**. On failure, the copy and placement [json-refusal-copy](wayfinder/tickets/044-json-refusal-copy.md) settled, with `detail` shown.

The buffer is [json-buffer-prototype](wayfinder/tickets/043-json-buffer-prototype.md)'s two-state model, and its module lifts nearly as written from `.scratch/json-buffer/json-buffer.js` on `prototype/json-buffer`. What that ticket binds here:

- **Two states, one invariant.** The box **follows** the canvas (`text === null`) or **disagrees** with it; a keystroke that makes the text equal the document's bytes returns it to following. The marker is `text !== null` — not a flag to maintain — and the segment carrying it dims by colour, never `opacity`.
- **The no-op test is on the parse result**, not the raw text: `serialize(parse(text)) === serialize(doc)`. Raw bytes would let a whitespace-only reformat land an undo step that undoes nothing. Every successful Apply returns to following, which is also what makes a migration visible in the box.
- **Give the buffer a `$state` home beside `document.svelte.ts`**, not inside a component — the View unmounts on every switch and the buffer must not.
- **⌘Z inside the box is native textarea undo**, already true by construction (`undo.ts:58` skips `textarea`); **Esc does nothing** there. Neither needs code, and neither should acquire any.
- **The session boundary discards the buffer** — import, new, load example — with no dialog. It is the only thing that does; the document moving underneath never touches it, another tab's write moves nothing on screen, `flush.ts` cannot reach it (nothing registers), and it is never persisted.
- **A `basis`** — the document's bytes when the proposal was born, fixed once — drives one line above Apply when the canvas has since moved: *"The canvas has changed since you started typing this. Applying replaces it."* (provisional; **this ticket's `writing-copy` pass owns it**, not 044 — it is not a failure). It blocks nothing; Apply is still one commit and one undo.
- **Apply stays enabled while the box is following** and settles to nothing when pressed. Caret and scroll position while the box re-renders under a following state are unexamined — watch them here.

**The Markdown View.** Read-only source in a mono block, straight from `src/lib/model/digest.ts`. It re-renders from the document like the JSON does. Nothing else — no rendering, no editing, no wrapping decisions beyond what makes long lines readable.

**Copy.** JSON and Markdown each get copy-to-clipboard; the Sheet tab gets none. Copy announces politely through the existing live region (§8.5) and shows no toast — this app has no toast pattern and is not growing one here. Copy does **not** clear Unexported changes.

**Where the seams are, and what to watch:**

- **Undo across the tabs.** Undo/redo scrolls the affected region into view with a brief highlight and never moves focus (§6.1). An undo that lands while the JSON or Markdown tab is showing has no region to scroll to. Decide what "scroll into view with a highlight" means when the affected region is not on screen, and do not let it yank the user's tab out from under them.
- **The responsive tiers.** There is no 1080px floor any more — commit `f633bc4` replaced it with the trim tier, and §5 is already written that way. The switcher was drawn at 1440 / 1080 / 900 / 660 and the pill is fixed-size, so it survives every tier unchanged; what moves is the chrome above it, which wraps at the narrow tiers.
- **Empty canvas.** The Markdown of a blank canvas is nearly one line. Ship it as it renders and note how it reads — the map's fog is waiting on exactly this observation.

`SPEC.md` gains the switcher in §5, the JSON commit model and the buffer in §6/§6.1, and every new string in §10. Both suites and `svelte-check` green.

## Resolution

**Built.** The switcher, the JSON View with its buffer and Apply, and the
Markdown View as source — drawn from three closed tickets, so the work was the
seams between them and the two or three things only a running app says.

### What shipped

- `src/lib/editor/views.ts` — the three View keys, the labels, the tablist
  keyboard grammar. `ViewSwitcher.svelte` is the pill; `JsonView.svelte` and
  `MarkdownView.svelte` are the panes; `+page.svelte` holds which View is
  showing and mounts one panel. `CanvasSheet` is untouched, and the switcher
  cannot reach an artifact by construction — the offscreen mount renders
  `CanvasSheet` directly, and `offscreen.test.ts` already refuses any `button`
  in that tree.
- `src/lib/editor/json-buffer.svelte.ts` — 043's module, lifted nearly as
  written into a `$state` home beside `document.svelte.ts`, since the View
  unmounts on every switch. It imports the parser and serializer and nothing
  else: it *decides*, the caller commits, which is what keeps the boundary able
  to reach in without a cycle.
- `document.svelte.ts` gained two lines of surface: `replace()` clears the
  buffer (the session boundary, in the one place all four callers pass), and
  `commitReplace(doc)` is Apply's whole-document commit — one history entry,
  undone in one step. Apply as an `Object.assign` inside `commit()` would have
  worked and would have hidden a document replacement inside a mutation
  callback; the pipeline that owns commits should say what a commit can be.
- `SPEC.md`: §1 scope, §5 (the pill, in full), §6 (three Views, the JSON commit
  model, Markdown as source, and the fourth known accepted risk), §6.1 (the
  buffer's two states, the boundary, the ⌘Z/Esc rules, undo while a text View
  shows), §8.1 (the tablist's one tab stop), §10 (every new string).

### The three labels: Sheet · JSON · Markdown

The provisional carries. `Canvas file` was the live alternative for the middle
tab and is ruled out on the same grounds as `Canvas` and `Digest`: it is the
**Export menu's** name for a download, so a tab wearing it promises a file
rather than a way of looking. Two of the three labels naming formats and one
naming a drawing is not the asymmetry it looks like — the Sheet *is* the canvas
drawn, and the other two are its two texts.

### `migratedFrom`, because the box changes under the user

§10 asks a successful Apply to say `Canvas replaced, migrated from format
version 1`, and nothing could: `ParseResult` reported the file, never the
version it arrived as. Rather than re-parse the buffer in the View to fish out
`version` — a second place that knows how to read a Canvas file — the ok branch
gained an optional `migratedFrom`, set only when migrations ran. The parser is
the only thing that knows it. `mcp/dist/server.js` rebuilt, per the
committed-bundle rule.

### What the running app said that the drawings could not

- **042's inset focus ring is invisible where it lands.** Roving tabindex plus
  focus-follows-selection means the only tab that can hold focus is the
  *selected* one, which is filled ink — and an inset ink ring on ink is nothing.
  The ring inverts to sheet on the selected segment, the same inversion
  `.field--ink` already makes on the title block. Verified in WebKit
  (`evidence/focus-ring-kbd-json.png`, `outline: rgb(253,253,251) solid 2px,
  offset -2px`, `:focus-visible` true).
- **The Markdown pane grew to the height of the document**, which put Copy below
  the fold on any real canvas while the JSON box stayed one boxful. Both panes
  are now one boxful — `max(24rem, calc(100vh - 12rem))` — with the source
  scrolling inside and the controls where they were left. It is also the honest
  reading of "the two text Views must not behave differently for no gain".
- **The box lost the reader's place.** While following, the one thing that can
  move the document is the chrome's Undo/Redo, and rewriting the textarea's
  value scrolls it to the top (measured: 400 → 0). The View now holds
  `scrollTop` across a following re-render, and only while following — while
  proposing the value never changes under the user, so this never fights the
  caret's own scrolling (measured: typing at the end still scrolls, marker on).
- **The chrome resemblance is softened by inverting the button, not by
  weakening it.** The pill rests *unfilled* on the paper and fills sheet on
  hover; a chrome button rests sheet and darkens to paper. Held in one frame
  (`evidence/1-canonical-band.png`, `4-stack-band.png`) the two families read
  apart at every tier, with the pill a step further down from the chrome band.
  Model unchanged, per 042.

### Seams the ticket flagged, resolved

- **Undo across the tabs.** Nothing to build: `reveal()` looks the affected
  region up in the DOM, finds nothing while a text View is showing, and returns.
  The announcement still fires, the View is not yanked. Pinned in
  `views.test.ts`, and now written into §6.1 so it reads as a decision rather
  than an accident of a null check.
- **Responsive tiers.** The pill is fixed-size and survives 1440 / 1080 / 900 /
  660 unchanged; what moves is the chrome above it.
- **⌘Z and Esc in the box** needed no code and got none, exactly as 043 said.
  The test asserts the *absence*: a ⌘Z dispatched inside the textarea is not
  `defaultPrevented`, so the browser keeps it.

### The empty-canvas Markdown, which was a fog patch

A blank canvas reads as two lines — `# Untitled`, then `Nothing yet under:` and
all eleven sections (`evidence/markdown-blank.png`). It is terse, honest and
needs nothing from §7, so that patch of the map is cleared rather than
ticketed. It did surface one wart for the *other* open patch: `Name` appears in
the missing list directly under the `# Untitled` heading that stands in for it.
That is a question about the digest's prose, not about the empty state, and it
is now the first concrete piece of evidence under "whether the shared Markdown
needs a human-facing knob".

### Evidence

`.scratch/views-editor/shoot.mjs` — a production build driven in WebKit
(safaridriver stays admin-gated): the band at all four tiers, both text Views,
the keyboard focus ring, the marker, the moved-canvas line, both refusal
classes, a v1 paste coming back migrated, and the blank canvas as Markdown.
WebKit's malformed-JSON detail, printed by the script and unchanged from 044:
`expected valid JSON (JSON Parse error: Expected '}')` — no position, as
predicted.

Suites green: 368 app tests (22 new in `views.test.ts`, one in `parse.test.ts`),
85 MCP tests, `svelte-check` 0 errors.

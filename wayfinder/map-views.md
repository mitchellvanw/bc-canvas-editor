---
name: bc-canvas-views-map
title: "Wayfinder map: three views of one canvas"
labels: [wayfinder:map]
---

# Wayfinder map: three views of one canvas

## Destination

One Canvas, three **Views** — the Sheet as it is today, the Canvas file's JSON, and Markdown — in both surfaces that render a canvas. In the editor the Sheet and the JSON are editable and the Markdown is read; in an exported HTML artifact all three are read-only, tab-switched, and present in the file whether or not script runs. Markdown becomes a fourth export (`.bcc.md`) and never an import. The map is done when a canvas can be inspected and hand-fixed as JSON without leaving the app, read and copied as Markdown from either surface, and when that Markdown provably comes from **one renderer**: the app's Markdown export, the artifact's Markdown panel and `bcc_read_canvas`'s return are byte-identical for the same file. Its gate: a document survives the round trip through the JSON view and hand-edit back to a byte-identical export; a v1 canvas pasted into the box comes back migrated to v2 in the box itself; the exported artifact's three panels are all reachable with JavaScript disabled; and both suites plus `svelte-check` are green with the MCP bundle rebuilt after the seam inversion.

## Notes

- **This map carries execution**, like the hosting, examples and canonical-v5 maps before it. The product is shipped and live; these are increments on it, so task tickets *do* — move, build, render, rebuild — once the decision and prototype tickets clear.
- **The seam inverts, and that is the structural change here.** `mcp/tsconfig.json` aliases `$lib/*` into `../src/lib/*` — a one-directional seam, MCP reaching into the app and never the reverse. `mcp/src/digest.ts` is already a Markdown rendering of a `CanvasFile` and is the *only* one that will exist, so it moves to `src/lib/model/digest.ts` and MCP imports it like everything else it borrows. Nothing about the seam's direction changes; what changes is which side owns the renderer.
- **Two names, one renderer, and CONTEXT says which is which.** The app's user-facing term is **View**; `digest` stays MCP-internal jargon for the same output. The word was coined for a model-facing tool return ("the model's screen-reader view of the sheet") and means nothing to someone clicking a tab — a label reading "Digest" would be the app talking to itself. `CONTEXT.md` gains **View**, and its **Artifact** entry gains a line, since an Artifact now carries all three.
- **Settled context (from charting, 2026-08-12):**
  - **Both surfaces.** Editor and HTML artifact. PNG is untouched and unmentioned; it captures the Sheet, which is what a picture of a canvas is.
  - **Views *and* exports.** The on-screen View is the feature; JSON and Markdown each carry copy-to-clipboard, and Markdown additionally becomes a real export because a file is what people paste into a repo.
  - **Peer tabs, on the sheet's own top edge — not in the chrome.** The chrome is *file verbs* (`SPEC.md` §10); a View switcher is not one, and "Markdown" sitting beside "Export" would read as a fourth export rather than a way of looking. An editable JSON surface is not a peek you dismiss, and a split view would make two-way sync between a live document and a text buffer the hardest problem in the app while breaking the 1080px floor the responsive tiers just won.
  - **Editable JSON, explicit Apply.** The box shows the **exact export bytes** (fixed key order, ids stripped, as `serialize.ts` writes them) and re-renders from the document; **Apply** parses and replaces the document as **one commit**, one undo step. Not live-on-keystroke — half-typed JSON is invalid for most keystrokes and every valid intermediate would pollute undo. Not commit-on-blur — that hides a full-document replacement behind an accidental click.
  - **Apply runs the full `parseCanvasImport` path** — version check, ordered migrations, strict validation. A v1 document pasted in comes back as migrated v2 bytes in the box, which is the visible feedback that a migration happened. A second, stricter door would mean the app refuses text it accepts as a file.
  - **The JSON view is the one place `detail` reaches a human**, and this **scopes** [parse-refusal-detail](wayfinder/tickets/026-parse-refusal-detail.md) rather than overturning it. 026's argument was that an *importer* dialog should not dump a JSON path at someone who picked the wrong file — that user has no text in front of them. A JSON editor inverts every premise: the offending path is a location in a buffer they are looking at. The import dialog keeps its one sentence, and `import-refusal.test.ts` keeps asserting exactly that.
  - **The unapplied buffer is preserved for the session** with a visible marker on the tab, and the document changing underneath — undo, or another tab's `storage` event under last-write-wins — **never overwrites it**. No confirmation dialog on leaving with unapplied text: the buffer is not the Canvas, losing it costs a re-paste, and the app spends its one confirmation budget on unexported *canvas* changes.
  - **Markdown is source, not a rendered document.** The raw `.md` text in a mono block — exactly the bytes Copy and Export produce. Rendering would mean a Markdown-to-HTML renderer in the app *and* in every artifact, and would make the two text tabs behave differently for no gain. Someone who wants to *read* the canvas has the Sheet, which is a far better rendering than Markdown could be.
  - **The artifact gets a script tag for the first time** — a few lines of progressive enhancement over pre-rendered panels, for real `role="tablist"` semantics. Not CSS-only (the checkbox-hack has no accessible tab semantics, and §8.6 is a written AA commitment); not shipped renderers (that would put `digest.ts` inside every artifact and make a shared document depend on script to show its own content). **All three panels are in the DOM**, so a script-less viewer gets everything, stacked and visible rather than hidden.
  - **The print pass prints the Sheet only** (§9.1). Printing is the PDF answer for the *canvas*; a printed JSON dump is nobody's PDF.
  - **Markdown does not clear Unexported changes**, and neither does Copy. §6.1 clears the dirty state only for re-importable forms — Markdown lands on the lossy side of that rule, beside PNG. Changing it would let a user export Markdown, close the tab, and lose the canvas with the app having told them they were safe.
  - **Always Sheet on reload.** The `bcc.autosave` slot is the Canvas file byte-for-byte and does not grow app-UI state. No tab shortcuts at v1 — `⌘1/2/3` is tempting, but the Reference dialog is a signed-off surface and the tabs are one Tab key away.
  - **Plain textarea, no code editor.** The JSON View exists to inspect and hand-fix, not to author. The error path names a line in prose without needing a gutter, and CodeMirror would be the first dependency this app has taken since SnapDOM.
- **`SPEC.md` is amended as each ticket lands**, per this repo's habit — §1 scope, §5 for the tab's visual language, §6/§6.1 for the JSON commit model and the buffer, §9.1 for the artifact's panels and script, §10 for every new string. `CONTEXT.md` is maintained as terms sharpen.
- **Skills:** `/prototype` + `visual-design-brainstorming` for the two prototype tickets; `/grilling` + `/domain-modeling` for the refusal-copy ticket; `writing-copy` for every user-facing string; the `run` skill and the WebKit-checkpoint habit for anything that needs a live look.
- **Tracker (local markdown):** tickets live in `wayfinder/tickets/*.md`. Frontmatter: `status: open|closed`, `assignee` (non-empty = claimed), `blocked-by: [ticket names]`. Frontier = open, unassigned, all blockers closed. Resolutions are appended to the ticket under `## Resolution`, then `status: closed`. Commit tracker changes to `main`.

## Decisions so far

<!-- one line per closed ticket -->

_(none yet — the map was charted 2026-08-12.)_

## Not yet specified

- **Whether the shared Markdown needs a human-facing knob.** The digest's prose was argued for a *model* audience — empty sections collapsed to one line at the end, sr-prefix idiom (`Collaborator: … → this context: …`), headings mirroring the artifact hierarchy. It ships byte-identical for both audiences and `digest.test.ts`'s pinned fixtures keep it honest. If pasting a real one into a README reads badly, that becomes a ticket arguing for one specific knob with a reason — never an options bag designed up front.
- **Whether the JSON View earns a code editor after all.** Revisit trigger is evidence from use: people losing their place in a long document, or the error line proving unfindable without a gutter. Cheap to revisit, expensive to undo once it is in the artifact pipeline.
- **Tab keyboard shortcuts and the Reference dialog.** Deferred at v1. If the tabs prove hard to reach in practice, `⌘1/2/3` plus rows in the Reference dialog (§12) is the shape — but that reopens a signed-off surface, so it needs evidence, not taste.
- **How a nearly-empty canvas reads as Markdown.** A blank canvas's digest is close to one line naming eleven empty sections. That is correct for a model and may be a confusing thing to be shown a tab of; whether the empty state (§7) has anything to say here is unknown until the View exists.
- **Whether the plugin's workshop and drafting skills should point at the app's Markdown export** now that a human-reachable one exists. The plugin owns procedure, never content — so this is a sentence in a skill at most, and only if the seam inversion changes what those skills can honestly say.

## Out of scope

- **Markdown import.** No `.bcc.md` comes back in, ever. Importable Markdown would make the digest's collapsing and prose load-bearing and freeze them, and `CONTEXT.md` already says the Canvas file is *the* portable re-importable serialization. One-way and explicitly lossy.
- **Editing Markdown anywhere**, in either surface. It is a rendering of the document, not a second document.
- **Editing in the artifact.** An Artifact is read-only as a document — the existing glossary line, unchanged. All three of its Views are read-only, including the JSON.
- **A rendered-Markdown preview.** Ruled out with the renderer-in-every-artifact argument above; the Sheet is the rendering this app offers.
- **PNG changes.** No JSON or Markdown PNG, no capture-region change, no new export kind beyond `.bcc.md`.
- **A split view or live two-way sync** between the Sheet and a JSON pane. Considered and refused while naming the destination; it would be its own effort with its own destination, not a step on this route.
- **Reopening [parse-refusal-detail](wayfinder/tickets/026-parse-refusal-detail.md)'s importer decision.** The JSON View's disclosure scopes that decision to the surface it was argued for; the import dialog's single sentence and the test that pins it stay exactly as they are.

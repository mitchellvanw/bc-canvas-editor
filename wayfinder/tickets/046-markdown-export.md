---
name: markdown-export
title: "Task: Markdown as a fourth export"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [shared-digest-seam]
---

## Question

`.bcc.md` joins `.bcc.json`, `.bcc.html` and `.bcc.png`. Small ticket, three sharp edges.

**The type widens.** `src/lib/model/filename.ts` hard-codes `ExportKind = 'json' | 'html' | 'png'` and builds `<slug>.bcc.<ext>` with the `bounded-context-canvas` fallback when unnamed. Adding `'md'` is one union member and the naming falls out — but check every switch over `ExportKind` that the compiler now flags, because the point of the union is that it flags them.

**The Export menu grows a fourth entry.** §10 currently reads **Canvas file (.bcc.json)** · **HTML artifact (.bcc.html)** · **PNG image (2x)**. The new entry's label needs `writing-copy`, and it needs to say what it is without implying re-importability — the first two entries are round-trippable and this one is not, and the menu is the only place a user sees all four side by side. Order matters too: it is not the third-most-important export, it is the lossy one, so it belongs where PNG lives rather than beside the Canvas file.

**It does not clear Unexported changes.** §6.1 clears the dirty state only when the canvas leaves the browser in a re-importable form — Markdown is lossy and lands beside PNG. This is the edge most likely to be got wrong by someone pattern-matching on "it's an export, so it exports", and it is the one where being wrong costs a user their canvas: export Markdown, close the tab, and the indicator said they were safe. Test it explicitly rather than trusting the code path.

Delivered as a Blob download like the others. `SPEC.md` §3.4 and §10 amended; `README.md` says the app exports Markdown too, in the sentence that already lists the three formats.

## Resolution

**The label is `Markdown (.bcc.md)`, and it is last.** The three entries it joins name a *thing* — Canvas file, HTML artifact, PNG image — so the obvious fourth was "Markdown ⟨noun⟩", and every candidate noun failed a gate. *Summary* is untrue: nothing is summarized, the digest renders everything the canvas says. *Rendering* explains the design rather than saying what you get, and the PNG is a rendering too. *Text* passes `writing-copy`'s first gate only by failing it — it tells a reader nothing about Markdown they don't already know. What is left is the format's own name, which is also **the word on the View's tab**: one name for one thing, learned once, and a format name promises no round trip the way "Canvas file" does. The parenthetical carries the extension, as two of the other three do.

The re-import claim is made by **position**, not by the label. Markdown sits last, below PNG: the two entries above leave in a form `Import…` takes back and the two below don't, and this menu is the only place a reader sees all four together. Beside the Canvas file it would have read as a third round-trippable format. No separator rule between the pairs — four items don't need new visual language, and the ordering already says it.

**It does not clear Unexported changes, and the test says so in those words.** `src/lib/chrome/markdown-export.test.ts` pins the menu's four labels in order, the `<slug>.bcc.md` filename with its unnamed fallback, the `text/markdown` blob, the bytes, and the indicator still standing after an export over a dirty canvas. §6.1's sentence stopped listing PNG as the lone exception and now names **the lossy pair**, with the reason attached — the failure mode is a user closing the tab on a clean indicator.

**One expression, not a new seam.** The handler is four lines in `Chrome.svelte` beside `exportCanvasFile`, rendering `canvasDigest(toCanvasFile(canvas.doc))` — the Markdown View's own expression. A shared `canvasMarkdown(doc)` wrapper was considered (`serialize.ts`'s `serializeCanvas`/`serializeCanvasFile` pair is the precedent) and dropped: MCP calls `canvasDigest(file)` and the artifact will hold a `CanvasFile` too, so the doc-shaped variant would have had exactly one caller. What guards the drift is the test, not the function — `views.test.ts` pins the pane to that expression and this file pins the download to it. No `src/lib/artifact/markdown.ts`: `html.ts` and `png.ts` exist because they mount and rasterize, and CONTEXT.md's **Artifact** is HTML-or-PNG, which a Markdown module in that directory would have quietly widened.

`ExportKind` gained `'md'` and the compiler flagged nothing else — `exportFileName` is the only switch over it, which is the answer to the ticket's "check every switch". Both suites (372 + 85) and `svelte-check` green; the MCP bundle is untouched, since nothing under `mcp/`'s import reach changed.

**Live, in WebKit** (`.scratch/markdown-export/`, `evidence/report.json`): the real anchor-click download out of a Blob — the one path jsdom can't reach, since it mocks `downloadBlob` — saves `order-fulfillment-edited.bcc.md`, its bytes are the Markdown pane's character for character, and `Unexported changes` is still showing afterwards.

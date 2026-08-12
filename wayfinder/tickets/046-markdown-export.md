---
name: markdown-export
title: "Task: Markdown as a fourth export"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [shared-digest-seam]
---

## Question

`.bcc.md` joins `.bcc.json`, `.bcc.html` and `.bcc.png`. Small ticket, three sharp edges.

**The type widens.** `src/lib/model/filename.ts` hard-codes `ExportKind = 'json' | 'html' | 'png'` and builds `<slug>.bcc.<ext>` with the `bounded-context-canvas` fallback when unnamed. Adding `'md'` is one union member and the naming falls out — but check every switch over `ExportKind` that the compiler now flags, because the point of the union is that it flags them.

**The Export menu grows a fourth entry.** §10 currently reads **Canvas file (.bcc.json)** · **HTML artifact (.bcc.html)** · **PNG image (2x)**. The new entry's label needs `writing-copy`, and it needs to say what it is without implying re-importability — the first two entries are round-trippable and this one is not, and the menu is the only place a user sees all four side by side. Order matters too: it is not the third-most-important export, it is the lossy one, so it belongs where PNG lives rather than beside the Canvas file.

**It does not clear Unexported changes.** §6.1 clears the dirty state only when the canvas leaves the browser in a re-importable form — Markdown is lossy and lands beside PNG. This is the edge most likely to be got wrong by someone pattern-matching on "it's an export, so it exports", and it is the one where being wrong costs a user their canvas: export Markdown, close the tab, and the indicator said they were safe. Test it explicitly rather than trusting the code path.

Delivered as a Blob download like the others. `SPEC.md` §3.4 and §10 amended; `README.md` says the app exports Markdown too, in the sentence that already lists the three formats.

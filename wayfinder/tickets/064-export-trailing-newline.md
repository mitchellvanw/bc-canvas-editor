---
name: export-trailing-newline
title: "Task: the editor's Canvas-file download is one byte short of canonical"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: []
---

## Question

[render-checkpoint](wayfinder/tickets/060-render-checkpoint.md) leg 6: the editor's Canvas-file export downloads `serializeCanvas` — no trailing newline — while the on-disk canonical form is `canvasBytes` = the same plus `\n`, whose own doc comment calls the newline "part of what the file format is" (SPEC §3.5; `examples.test.ts:96` pins exactly that shape for committed files). So a CLI-written file imported and re-exported comes back one byte short, and an editor-exported file committed as-is is rewritten once by `bcc fmt` — a fmt-clean CI hook would flag every editor-exported file until fmt touches it.

Decide: does the download blob gain the newline (the candidate fix is one line in `Chrome.svelte`'s `exportCanvasFile`, plus a test finally pinning the download's bytes — the artifact embed and the `markExported` baseline compare `serializeCanvas` on both sides and are untouched), or is the current shape pinned deliberately? The round trip is perfect at the canvas level either way; this is a coherence call between the editor's download and the file format the rest of the system defines.

## Resolution

**The download gains the newline — the current shape was an accident, not a pin.** No test held the newline-less form and nothing consumed it; the shape was whatever `exportCanvasFile()` happened to return before `canvasBytes` existed to name the on-disk form. With `bcc fmt` and the committed examples both defining `.bcc.json` as serializer bytes plus `\n`, a download that commits one byte short is incoherence with no compensating story.

**The seam is one level lower than the candidate fix.** The ticket named `Chrome.svelte`'s blob; the change landed in `document.svelte.ts` instead — `exportCanvasFile()` now returns `canvasBytes(this.doc)`. A `+ '\n'` in the blob would restate at the UI layer the knowledge `canvasBytes`'s own doc comment claims to own ("the newline is part of what the file format is"); the document method is the one that says *export*, so it is the one that speaks file bytes. `Chrome.svelte` is untouched.

**The baseline is untouched, as the ticket predicted.** `markExported` and `#settle` compare `serializeCanvas` on both sides; the newline is the file's, not the canvas's, so dirtiness never sees it. The artifact embed likewise: `.bcc.html` carries `serializeCanvas` bytes inside a document with its own framing, and gains nothing from a file-format newline.

**The pin is the round trip the ticket described**, not a tautology: `examples.test.ts` now imports a committed file through the real parse path, re-exports it, and asserts byte-identity — the CLI-written file coming back whole, with the export landing clean. And **SPEC §3.2 gains a "one on-disk form" bullet**, because the newline was stated as a property of the examples (§3.5) but nowhere as a property of the format — which is exactly the gap this ticket fell out of.

Verified: 507 root tests, 36 MCP tests, `svelte-check` clean.

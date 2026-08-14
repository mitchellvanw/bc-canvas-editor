---
name: export-trailing-newline
title: "Task: the editor's Canvas-file download is one byte short of canonical"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: []
---

## Question

[render-checkpoint](wayfinder/tickets/060-render-checkpoint.md) leg 6: the editor's Canvas-file export downloads `serializeCanvas` — no trailing newline — while the on-disk canonical form is `canvasBytes` = the same plus `\n`, whose own doc comment calls the newline "part of what the file format is" (SPEC §3.5; `examples.test.ts:96` pins exactly that shape for committed files). So a CLI-written file imported and re-exported comes back one byte short, and an editor-exported file committed as-is is rewritten once by `bcc fmt` — a fmt-clean CI hook would flag every editor-exported file until fmt touches it.

Decide: does the download blob gain the newline (the candidate fix is one line in `Chrome.svelte`'s `exportCanvasFile`, plus a test finally pinning the download's bytes — the artifact embed and the `markExported` baseline compare `serializeCanvas` on both sides and are untouched), or is the current shape pinned deliberately? The round trip is perfect at the canvas level either way; this is a coherence call between the editor's download and the file format the rest of the system defines.

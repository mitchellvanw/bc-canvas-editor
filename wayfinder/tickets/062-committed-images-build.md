---
name: committed-images-build
title: "Task: the committed .bcc.svg — the sheet's namespace, the editor's fifth export, four files and the README"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [committed-images, bcc-cli]
---

## Question

Build what [committed-images](wayfinder/tickets/056-committed-images.md) settled. Nothing here is a decision — that ticket made fourteen and this one spends them. It is separate from [bcc-cli](wayfinder/tickets/055-bcc-cli.md) because almost none of this is CLI work: it touches the sheet, the editor's Export menu, SPEC, four committed files and the README.

**The sheet, and the renderer.** `CanvasSheet.svelte:130` gains `xmlns="http://www.w3.org/2000/svg"` on its one `<svg>` — the whole of decision 1, covering the four lane glyphs and the footer legend keys at once, with a regression assertion in `render.test.ts` beside the XHTML-shape guards at `render.test.ts:191-197` (an attribute whose effect nobody can see is an attribute that gets refactored away). `sheetSvg` draws the sheet in `FRAME_CSS` like `sheetDocument` does, which is decision 3 and a real fix: today the SVG lays out at a 1440px content box where every other surface uses 1360, and `FRAME_CSS`'s own comment already claims otherwise. Both changes rebuild `src/lib/render/dist/render.js`, which cascades into `cli/`'s inlined bundle — hence the ordering behind [bcc-cli](wayfinder/tickets/055-bcc-cli.md) rather than ahead of it.

**The editor's fifth export.** `svg` joins `ExportKind` (`src/lib/model/filename.ts:10`) and the Export menu gains **"SVG image"** fourth, between PNG and Markdown. It measures the way `png.ts:45` already does — `getBoundingClientRect` on the offscreen mount — and hands the height to `sheetSvg`. One-way: Import… is untouched. `writing-copy` for the menu entry and for the CLI's no-Chrome refusal if that lands here rather than in [bcc-cli](wayfinder/tickets/055-bcc-cli.md).

**The four files, and the README.** `examples/*.bcc.svg` beside their JSON, all four committed, with `*.bcc.svg -diff` in `.gitattributes`. The README grows **one** image — Order Fulfillment, above the existing list — wrapped in a link to its `.bcc.json`, which is decision 11's whole recourse for a reader who suspects the sheet is stale. Each file carries the CC BY comment `.bcc.html` already carries.

Two things left in the way by [remark-plugin](wayfinder/tickets/057-remark-plugin.md): `.scratch/stray-renders/` holds eight renders that were sitting untracked in `examples/` from [bcc-cli](wayfinder/tickets/055-bcc-cli.md)'s verification — delete them, this ticket authors the real four — and committing images makes `bcc.test.ts:152`'s `check` assertion read *"4 canvases check out."* plus an image line, which is this ticket's to update.

**The guard.** The repo's suite fails when a committed image is stale, by re-rendering at the height parsed out of the file under test and diffing the bytes — `server.test.ts:74-82`'s shape, and the same comparison [bcc-cli](wayfinder/tickets/055-bcc-cli.md)'s `check` leg calls, not a second implementation of it.

**SPEC.** §9.3 "SVG artifact" is written here and is the only place these constraints are stated: the fixed width and frame, the embedded fonts, the `xmlns` requirement, one-way membership, and 049's raw-URL caveat — opened directly the SVG is a top-level document under `default-src 'none'` and the embedded fonts genuinely are blocked, so a future reader files a bug against them unless this is written down. §3.4's family line and §10's menu entry gain their strings. `CONTEXT.md` wants an entry for **Render** if [bcc-cli](wayfinder/tickets/055-bcc-cli.md) has not already added one.

Done when the four images are committed and rendering on github.com, the README carries one, the suite fails on a stale image, `svelte-check` and both suites are green, and SPEC §9.3 exists.

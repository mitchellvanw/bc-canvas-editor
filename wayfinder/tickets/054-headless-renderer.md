---
name: headless-renderer
title: "Task: the renderer leaves the browser — one sheet, rendered in Node"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [renderer-shape]
---

## Question

Build what [renderer-shape](wayfinder/tickets/050-renderer-shape.md) decided. This is the keystone: the CLI, the remark plugin and the VS Code extension all call it, and the map's gate is a property of its output.

The prototype exists — `.scratch/helicopter/headless-artifact.mjs`, roughly 40 lines, produces a complete standalone document from Node with no browser and no live app (204,576 bytes with 8 WOFF2 faces inlined). Promote it; do not restart from it. What it does not yet have is a home, an API, a test, and whatever 050 settled about replacing versus sitting beside the browser export.

Carry in:

- **`sr-only`** moves into `CanvasSheet.svelte`'s own `<style>`; **tokens** are parsed from `app.css`'s `@theme` and land on the sheet's wrapper, never `:root`. The token half touches `src/app.css`, which `contrast.test.ts` and `head.test.ts` already parse, so it has two existing readers to keep green.
- The **`.woff` fix**, which lands here — the renderer authors the `@font-face` rules from `node_modules` rather than rewriting fontsource's `src:` list, so it never writes a `.woff` entry and the fix needs no separate work.
- **What it emits:** neither of the two shapes charting offered. A core returning parts (`renderSheetParts` → `{ markup, css }`, `fontFaceCss()`) with thin named containers over it (`sheetDocument`, `sheetSvg`, `artifactDocument`), homed in `src/lib/render/` and built like `mcp/` into one committed plain-JS module.
- **Delete on the way through:** `collectAppCss()`, `inlineFonts()`, `fetchAsset()`, and `html.test.ts`'s jsdom environment and fetch mock. `artifact/html.ts` stays and becomes `artifactDocument`; its View CSS, tab script and print pass do not move.

**The identity test 050 was asked to make possible is no longer the test to write.** 050 answered *replace*, and then answered it structurally: the editor's Export HTML imports the same built module the CLI does, so "the sheet this renders and the sheet the editor exports are the same sheet" is not a property to compare on four examples — it is one function, called twice. Charting expected a normalized comparison here; measurement showed such a comparison could only ever license drift, so it is gone rather than relaxed.

Three tests replace it, all named in 050's resolution: the **staleness test** (rebuild to a scratch path, diff the committed bytes) so `CanvasSheet.svelte` cannot move without the renderer following; the **determinism test** (one doc rendered twice, identical bytes) so the committed-SVG contract fails loudly the day an id reaches the markup; and the **token-crossing test** (the `@theme` extraction finds all 26 properties the sheet reads).

Two things already known to break a naive port:

1. `render()` returns `head: ''` under Vite's default `css: 'external'`; the scoped CSS comes back only when the component is compiled with `css: 'injected'`. 050's decision 2 needs the scoped CSS in `renderSheetParts`, and decision 3 puts `sr-only` there too — so this build is `css: 'injected'`, not a choice.
2. `png.ts:41` **requires** `mountArtifactSheet` — snapdom rasterizes a live subtree — so the client mount cannot be deleted, only stopped being used by the HTML path. What 050 established is that this is fine: two *compiles* are unavoidable while PNG exists, and what matters is that only one of them ever emits bytes anyone could diff.

Done when the renderer has a home and a public API, the identity test is green on all four examples, `npm test`, `npm run check` and the MCP suite are green, and the bundle is rebuilt if anything under `src/lib/` moved.

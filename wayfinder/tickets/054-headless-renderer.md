---
name: headless-renderer
title: "Task: the renderer leaves the browser — one sheet, rendered in Node"
labels: [wayfinder:task]
status: closed
assignee: mitchell
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

## Resolution

**Built as [renderer-shape](wayfinder/tickets/050-renderer-shape.md) specified, and the gate property is demonstrated rather than asserted:** the `.bcc.html` Chromium downloads from the live editor is **byte-identical** to the one Node writes from the same module — 225,907 bytes both ways, `cmp` clean. That is not a test in the suite, because there is nothing left to compare; it is what the shape buys, checked once by hand.

### What was built

`src/lib/render/`, five files:

- **`module.ts`** — the entry, never imported from source. `renderSheetParts(doc) → { markup, css }`, `fontFaceCss()`, `sheetDocument(doc)`, `sheetSvg(doc, size)`, `SCOPE_CLASS`.
- **`build.js`** — one Vite SSR build, `emitCss: false`, tokens and fonts substituted through `define`.
- **`dist/render.js`** — committed, 275,294 bytes, zero imports, no Node builtins.
- **`index.ts`** — the typed facade the app imports; forwards, adds nothing.
- **`metrics.ts`** — `SHEET_WIDTH` / `SHEET_MARGIN`, formerly `ARTIFACT_WIDTH` / `ARTIFACT_MARGIN` on `offscreen.ts`.

`artifact/html.ts` kept its View panels, CSS and print pass and became `artifactDocument` — the fourth container, now synchronous. Dead and deleted: `collectAppCss`, `inlineFonts`, `fetchAsset`, `toBase64`, and `html.test.ts`'s jsdom environment and fetch mock.

Measured: the artifact fell from ~446 KB to **225,907 bytes**; `sheetDocument` is 206,019; `fontFaceCss()` is 172,869 of it. The `.woff` half of the win landed exactly as 050 said it would — by authoring the `@font-face` rules rather than rewriting fontsource's `src:` list, the legacy files are never named, so there was nothing to fix.

### The eight decisions the build made that 050 did not

1. **The scope class is `bcc-canvas`, and `renderSheetParts().markup` carries the wrapper itself.** 050 put the tokens on "the wrapper that already carries `paper-ground`" — but that wrapper only exists inside a document, and decision 6 has the fragment consumers composing parts plus `fontFaceCss()` with no container in between. So the core emits the wrapper, or a fence's CSS applies to nothing and the failure is silent.
2. **The artifact neutralises the wrapper's ground with one rule** — `.views__panel .bcc-canvas { background: none; }`. `<body>` carries `bcc-canvas` for tokens and ground exactly as it carried `paper-ground`; the nested wrapper painting a second ground restarts the 32px drafting grid at its own origin, which is a visible seam around the Sheet panel and not a theoretical one.
3. **A scoped preflight ships in the renderer's CSS.** Nowhere in 050, and the artifact would have been subtly wrong without it: the sheet takes `box-sizing: border-box` and the absence of UA margins from Tailwind's preflight and never restates them, and the artifact no longer inlines Tailwind. `RESET_CSS` is scoped to the wrapper and written with `:where` at zero specificity, so it reaches nothing of a host page and loses to every rule the sheet has of its own. Checked by screenshot against `.scratch/helicopter/headless-sm.png`, in Chromium and WebKit.
4. **`sheetSvg(doc, { width, height })` takes its size from the caller**, because laying the sheet out is precisely the work a headless renderer does not do. Not a flag — a fact it cannot know. What the values are, and whether the page frame's margin belongs inside the SVG at all, is [committed-images](wayfinder/tickets/056-committed-images.md)'s.
5. **The build pins `NODE_ENV=production` before Vite loads.** `vitest` sets it to `test`, the Svelte compiler reads that as dev mode, and the staleness check rebuilt an 82 KB larger module and called the committed one stale. Committed bytes must not depend on who ran the build.
6. **`generate: 'server'` cannot be asked for** — `vite-plugin-svelte` ignores the option and derives it from Vite's SSR flag, and says so on stderr. The build asks for `build.ssr: true` instead. 050's reasoning about why one build cannot emit both compiles is confirmed from the other side: you cannot even name the compile you want.
7. **The committed bundle carries a `// @ts-nocheck` banner.** The root tsconfig runs `checkJs` over `src/**/*.js`, and svelte-check has no business grading build output; `index.ts` is where the types are declared.
8. **`Chrome.svelte` loads `artifact/html.ts` on demand.** The fonts moved from a fetch at export time into bytes in a module, and a static import would have put ~225 KB into the first load of a live public app for a feature most sessions never use. Verified in the built site: the chunk is a dynamic import and nothing preloads it.

### Two tests beyond the three 050 named

The staleness, determinism and token-crossing tests are all in `src/lib/render/render.test.ts` as specified. Two more earned their place:

- **The bundle has no imports and no Node builtins.** The property `bcc`, a plugin install and a webview all rest on, and the reason the same file runs in a browser. It was measurement 2 in 050; now it fails loudly.
- **`sheetSvg` output is well-formed XML.** Svelte's SSR output happens to be XHTML-shaped — nothing promises it. One unclosed void element in the sheet and every committed image stops rendering, silently, everywhere.

### For [committed-images](wayfinder/tickets/056-committed-images.md)

`sheetSvg` was rendered through `<img>` in Chromium from a `file://` page. It draws: layout, colour, and the embedded fonts, all correct. **The four collaborator-kind glyphs are missing** — [github-svg-probe](wayfinder/tickets/049-github-svg-probe.md)'s nested-`<svg>`-inside-`foreignObject` finding, reproduced first-hand on our own output rather than on a specimen. Screenshots in the session scratchpad. The sheet also touches the SVG's edges, because `sheetSvg` writes no page frame.

### SPEC

§9's render source now describes two compiles of one component and names the headless one as the artifact's source. §9.1's **CSS** bullet no longer describes inlining Tailwind, its **Fonts** bullet records the WOFF2-only authoring, its **Views** bullet points the Sheet at the renderer, its **print** bullet keeps the class-over-`hidden` rule while recording that the preflight hazard which forced it left with the stylesheet, and **Size** is ~225 KB. §13 risk 3 is **retired**: the question was which of two ways to get the compiled stylesheet into an artifact, and the renderer needs neither.

No `CONTEXT.md` entry, holding 050's line — nothing user-facing gained a name here.

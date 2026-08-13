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

- The **`sr-only`** and **token-crossing** answers from 050 — both touch `src/app.css`, which `contrast.test.ts` and `head.test.ts` already parse, so a change there has two existing readers to keep green.
- The **`.woff` fix** if 050 landed it here rather than separately.
- Whatever 050 decided about **what it emits** — one output with options, or `artifact` and `sheet` as named outputs.

The test that matters is the map's gate, and it is worth writing before the code: **the sheet this renders and the sheet the editor exports are the same sheet**, on all four committed examples. Bytes where bytes can be equal; a pixel comparison where they legitimately cannot, since SSR emits hydration comments client `innerHTML` does not. This is the guard against the one thing this codebase refuses to have — a second renderer — and it is why 050 was asked to decide replace-versus-beside rather than left to drift into "beside" by default.

Two things already known to break a naive port, both established during charting:

1. `render()` returns `head: ''` under Vite's default `css: 'external'`; the scoped CSS comes back only when the component is compiled with `css: 'injected'`. Either is workable; they are different builds.
2. `png.ts:41` **requires** `mountArtifactSheet` — snapdom rasterizes a live subtree — so the client mount cannot be deleted, only stopped being used by the HTML path. "Switch outright" is not available while PNG exists in its current form.

Done when the renderer has a home and a public API, the identity test is green on all four examples, `npm test`, `npm run check` and the MCP suite are green, and the bundle is rebuilt if anything under `src/lib/` moved.

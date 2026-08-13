# BC Canvas

A client-side editor for the [ddd-crew Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas), live at [bc-canvas.pages.dev](https://bc-canvas.pages.dev). Edits happen inline on the rendered sheet; the canvas stays on your machine until you export it as a re-importable Canvas file (`.bcc.json`), a self-contained HTML artifact (`.bcc.html`), a PNG, or Markdown (`.bcc.md`, one-way). `SPEC.md` is the full specification.

## Examples

Four curated example canvases ship in the app's **Examples** menu. The same files are downloadable here and re-importable as-is:

- [Order Fulfillment](examples/order-fulfillment.bcc.json) — coordinates picking, packing and shipping once an order is paid; every section of the canvas filled.
- [Notifications](examples/notifications.bcc.json) — delivers order updates to customers on their preferred channel; what a generic context looks like, receiving Order Fulfillment's `Order Shipped` event.
- [Appointment Scheduling](examples/appointment-scheduling.bcc.json) — books patients into clinic slots and keeps no-shows down; a supporting context with falsifiable metrics.
- [Royalty Distribution](examples/royalty-distribution.bcc.json) — splits streaming revenue among rights holders; captured mid-workshop, open questions still outnumbering decisions.

`examples/` is the canonical source the app bundles from; a test pins every file byte-exactly through the real import path.

## MCP server

`mcp/` is a local stdio MCP server over the canvas files in a project — listing them, reading them as prose or as bytes, and writing them back in the form this editor imports. It ships as the **bc-canvas** plugin (`/plugin marketplace add mitchellvanw/bc-canvas-editor`), which adds a facilitated workshop skill, a draft-from-code skill, and a reviewer agent beside the server. See [`mcp/README.md`](mcp/README.md) for both hosts.

## Developing

```sh
npm install
npm run dev
```

## Building

```sh
npm run build
```

Preview the production build with `npm run preview`. Pushes to `main` deploy to Cloudflare Pages.

`src/lib/render/dist/render.js` is a committed build artifact: the quiet sheet compiled for the server, plus the design tokens and fonts read off disk, so that a canvas can be drawn in plain Node with no browser. The editor's HTML export imports it, and so will every surface outside the browser. Rebuild it with `npm run build:render` after changing `CanvasSheet.svelte` or `src/app.css` — `npm test` fails if you forget.

## License & attribution

The Bounded Context Canvas is by the [ddd-crew](https://github.com/ddd-crew/bounded-context-canvas), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The example canvases are invented domains, published under the same attribution.

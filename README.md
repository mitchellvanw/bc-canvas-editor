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

## Command line

`bcc` (`cli/`) is the same canvases from a terminal, in a checkout that need not be this one:

```sh
alias bcc='npx --yes github:mitchellvanw/bc-canvas-editor'

bcc ls                        # what canvases are here, and how full each one is
bcc check                     # do they all still read, and are the images beside them current
bcc fmt                       # canonical bytes, in place
bcc render orders.bcc.json    # the HTML artifact, beside the canvas
bcc render --svg orders.bcc.json
```

`check` and `fmt` are what make a canvas behave like source code rather than an attachment: `check` reads through the parser **Import…** uses, so a canvas that passes opens in the editor, and `fmt` writes the bytes an export would have written. `render` calls the same function the Export menu calls, so its `.bcc.html` is byte-identical to the downloaded one. Everything runs in plain Node; only `render --svg` needs a browser, and only to measure a height that `--height` can supply instead.

Unpublished, so there is no registry package: `npx` resolves this repo's `main` at the moment it runs, and `…bc-canvas-editor#<sha>` pins it. In this checkout it is `npm run bcc -- ls`, because npm does not link a package's own bin.

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

`src/lib/render/dist/render.js` is a committed build artifact: the quiet sheet compiled for the server, plus the design tokens and fonts read off disk, so that a canvas can be drawn in plain Node with no browser. The editor's HTML export imports it, and so does every surface outside the browser. `cli/dist/bcc.js` is committed for a different reason — an install runs no build step — and it inlines that renderer rather than compiling the sheet a second time, which is what keeps every surface drawing one sheet.

So the two rebuild in order, and `npm run build:bundles` is that order:

```sh
npm run build:bundles   # build:render, then build:cli
```

Run it after changing `CanvasSheet.svelte`, `src/app.css` or anything under `cli/src/`. `npm test` fails if you forget — each bundle is diffed against a fresh build of itself.

## License & attribution

The Bounded Context Canvas is by the [ddd-crew](https://github.com/ddd-crew/bounded-context-canvas), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The example canvases are invented domains, published under the same attribution.

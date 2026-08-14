# BC Canvas

A client-side editor for the [ddd-crew Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas), live at [bc-canvas.pages.dev](https://bc-canvas.pages.dev). Edits happen inline on the rendered sheet; the canvas stays on your machine until you export it as a re-importable Canvas file (`.bcc.json`), a self-contained HTML artifact (`.bcc.html`), a PNG or SVG image, or Markdown (`.bcc.md`, one-way). `SPEC.md` is the full specification.

## Examples

Four curated example canvases ship in the app's **Examples** menu. The same files are downloadable here and re-importable as-is:

[![The Order Fulfillment canvas as a rendered sheet](examples/order-fulfillment.bcc.svg)](examples/order-fulfillment.bcc.json)

- [Order Fulfillment](examples/order-fulfillment.bcc.json) — coordinates picking, packing and shipping once an order is paid; every section of the canvas filled.
- [Notifications](examples/notifications.bcc.json) — delivers order updates to customers on their preferred channel; what a generic context looks like, receiving Order Fulfillment's `Order Shipped` event.
- [Appointment Scheduling](examples/appointment-scheduling.bcc.json) — books patients into clinic slots and keeps no-shows down; a supporting context with falsifiable metrics.
- [Royalty Distribution](examples/royalty-distribution.bcc.json) — splits streaming revenue among rights holders; captured mid-workshop, open questions still outnumbering decisions.

`examples/` is the canonical source the app bundles from; a test pins every file byte-exactly through the real import path.

Each canvas has a `.bcc.svg` beside it — the sheet as one self-contained image, which is what draws above and what any markdown file can point an `<img>` at. `bcc check` re-renders each one and compares the bytes, so the suite fails on an image that has fallen behind the canvas it was drawn from. The image links to its Canvas file for anyone who would rather read the source than trust the picture.

## MCP server

`mcp/` is a local stdio MCP server over the canvas files in a project: it reads one as prose, explains what each section is for, and offers every canvas as a resource a conversation can attach. It does not write — that is `bcc`, below — which makes the split the plugin is built on: **the server is how a canvas gets into a conversation, the command line is how one changes on disk.**

It ships as the **bc-canvas** plugin (`/plugin marketplace add mitchellvanw/bc-canvas-editor`), which adds a facilitated workshop skill, a draft-from-code skill, and a reviewer agent beside the server. See [`mcp/README.md`](mcp/README.md).

## Command line

`bcc` (`cli/`) is the same canvases from a terminal. **In this checkout it runs through npm**, because npm does not link a package's own bin:

```sh
npm run bcc -- ls                        # what canvases are here, what each is for, how full each one is
npm run bcc -- check                     # do they all still read, and are the images beside them current
npm run bcc -- fmt                       # canonical bytes, in place
npm run bcc -- render orders.bcc.json    # the HTML artifact, beside the canvas
npm run bcc -- render --svg orders.bcc.json
```

`check` and `fmt` are what make a canvas behave like source code rather than an attachment: `check` reads through the parser **Import…** uses, so a canvas that passes opens in the editor, and `fmt` writes the bytes an export would have written. `render` calls the same function the Export menu calls, so its `.bcc.html` is byte-identical to the downloaded one. Everything runs in plain Node; only `render --svg` needs a browser, and only to measure a height that `--height` can supply instead.

**In another repo** — a project with canvases committed beside its code — there is nothing to install:

```sh
npx --yes github:mitchellvanw/bc-canvas-editor ls
```

It is unpublished, so there is no registry package and no version contract: `npx` resolves this repo's `main` at the moment it runs, and `…bc-canvas-editor#<sha>` pins it if you need reproducibility. Aliasing that to `bcc` is convenient there and a trap here — inside this checkout it would fetch a copy of the repo rather than run the bundle you just built.

## In a markdown file

A **`bcc` fence** points at a canvas, and the sheet is drawn there when the site is built:

````md
```bcc
../canvases/order-fulfillment.bcc.json
```
````

One path, resolved relative to the markdown file holding it. `../` is fine; a leading `/` is not, because it reads as the repo root to some tools and as a filesystem path to others. Nothing else goes in the fence — no JSON, no options.

Two adapters draw it, over one shared contract (`web/src/lib/fence/fence.ts`), so a fence means the same thing on both.

### In VS Code, while you write

`vscode/` is an extension that draws the fence in the built-in markdown preview, re-drawing it when the canvas beside it changes. There is no marketplace listing — build a `.vsix` and install it by hand:

```sh
cd vscode && npx --yes @vscode/vsce package --no-dependencies
code --install-extension bc-canvas-fence-0.0.1.vsix
```

See [`vscode/README.md`](vscode/README.md) for what it does when a fence cannot be drawn, and for the three places it does not reach (notebook cells, web hosts, a file opened outside a workspace).

### On a site, when it builds

`remark/dist/plugin.js` is a [remark](https://remark.js.org) plugin, so it covers every site generator built on unified. Install this repo (there is no registry package — `npx`/`npm i` take the git URL, and `#<sha>` pins it):

```sh
npm i github:mitchellvanw/bc-canvas-editor
```

**Astro** needs nothing else:

```js
// astro.config.mjs
import remarkBcc from 'bc-canvas-editor/remark';

export default defineConfig({ markdown: { remarkPlugins: [remarkBcc] } });
```

**Docusaurus** needs two things, and neither is guessable. It compiles both `.md` and `.mdx` through MDX, which fails the build on a raw HTML node (`Cannot handle unknown node 'raw'`) unless `rehype-raw` is in the pipeline; and it renders through React, whose server pass escapes the text inside a `<style>` element — an inlined stylesheet arrives with `'Archivo'` as `&#x27;Archivo&#x27;` and the sheet draws in Times. So the CSS comes from a file instead:

```js
// docusaurus.config.js — inside the docs/blog preset options
remarkPlugins: [[remarkBcc, { css: 'imported' }]],
rehypePlugins: [[rehypeRaw, { passThrough: ['mdxjsEsm', 'mdxFlowExpression',
  'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression'] }]]
```

```css
/* src/css/custom.css */
@import 'bc-canvas-editor/sheet.css';
```

Anywhere else, the rule is that **raw HTML has to survive** — `remark-rehype` and `rehype-stringify` both take `allowDangerousHtml: true` — and the sheet's CSS has to reach the page one of two ways:

| `css` | what it does | when |
| --- | --- | --- |
| `'inline'` (default) | a `<style>` in the page, once, ahead of the first fence | one or two pages; nothing to configure |
| `'imported'` | nothing — you import `bc-canvas-editor/sheet.css` | React-rendered sites, and any site with fences on many pages: the fonts are ~190 KB and a stylesheet is fetched once |

The sheet brings its own fonts, its own reset and its own design tokens, all under one `.bcc-canvas` wrapper, so it neither picks up your site's styles nor pushes anything onto the page around it.

A fence that cannot be drawn leaves **a visible placeholder saying why**, and the build carries on — escalating is your site's call, through its own fail-on-warn, reading the warning this plugin puts on the VFile. Be warned that most generators discard those messages, so the placeholder is usually the whole story. `root` is the other option: paths never resolve outside it, and it defaults to the directory the build runs in.

## Developing

```sh
npm install
npm run dev
```

Node 26 or newer. `engine-strict` is on, so an older Node refuses at `npm install` rather than failing somewhere later.

## Building

```sh
npm run build
```

Preview the production build with `npm run preview`. Pushes to `main` deploy to Cloudflare Pages.

`web/src/lib/render/dist/render.js` is a committed build artifact: the quiet sheet compiled for the server, plus the design tokens and fonts read off disk, so that a canvas can be drawn in plain Node with no browser. The editor's HTML export imports it, and so does every surface outside the browser. `cli/dist/bcc.js`, `remark/dist/plugin.js` and `vscode/dist/extension.js` are committed for a different reason — an install (or a `.vsix`) runs no build step — and all three inline that renderer rather than compiling the sheet a second time, which is what keeps every surface drawing one sheet. `remark/dist/sheet.css` falls out of the same build, so the stylesheet a site imports cannot describe a sheet that is no longer the one being drawn.

So they rebuild in order, and `npm run build:bundles` is that order:

```sh
npm run build:bundles   # build:render, then build:cli, build:remark, build:vscode
```

Run it after changing `CanvasSheet.svelte`, `web/src/app.css` or anything under `cli/src/`, `remark/src/` or `vscode/src/`. `npm test` fails if you forget — each bundle is diffed against a fresh build of itself.

## License & attribution

The code is [MIT](LICENSE). The Bounded Context Canvas is by the [ddd-crew](https://github.com/ddd-crew/bounded-context-canvas), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The example canvases are invented domains, published under the same attribution.

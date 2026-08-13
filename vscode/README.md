# BC Canvas — bcc fence

A `bcc` fence in a markdown file draws the [Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas) it points at, in VS Code's markdown preview:

````md
```bcc
../canvases/order-fulfillment.bcc.json
```
````

One path, resolved relative to the markdown file holding it. `../` is fine; a leading `/` is not, because it reads as the repo root to some tools and as a filesystem path to others. Nothing else goes in the fence — no JSON, no options.

The sheet is the same one the editor at [bc-canvas.pages.dev](https://bc-canvas.pages.dev) draws and the same one `bcc render` writes into a `.bcc.html`: one renderer, inlined into this extension, so the three cannot drift. It brings its own fonts, its own reset and its own design tokens under one wrapper, so it neither picks up the preview's styling nor pushes anything onto the document around it, and it reflows with the width of the pane.

## Install

There is no marketplace listing. Build a `.vsix` from a checkout of the repo and install it by hand:

```sh
npm run build:vscode                      # in the repo root, if you changed anything
cd vscode && npx --yes @vscode/vsce package --no-dependencies
code --install-extension bc-canvas-fence-0.0.1.vsix
```

`--no-dependencies` is accurate rather than a shortcut: the bundle has none. The renderer, the fonts and the parser are inlined into `dist/extension.js`, and the only thing the extension asks the host for is `vscode` itself.

## When a fence cannot be drawn

The preview gets **a visible placeholder saying why** — never a blank, and never silence. The full detail behind it, which names paths on this machine, goes to an output channel instead: **BC Canvas**, reachable from the command palette as **BC Canvas: Show fence log**. A problem is reported once, not once per keystroke.

Editing the canvas re-draws the preview. It is a different file from the one the preview is watching, so the extension watches every canvas a fence resolved to — including one that is not there yet, so a fence pointing at a file you have not written heals when you write it.

## Limits

- **Notebook cells never resolve a pointer.** The notebook markdown renderer is a separate contribution running in a webview with no filesystem and no document identity. This extension does not reach it, and a `bcc` fence there stays a code block.
- **Web hosts** (vscode.dev, github.dev) have no filesystem for a synchronous render to read, so the extension does not load there.
- **A markdown file opened on its own**, outside any workspace folder, resolves against its own directory — so a pointer beside it reads and `../` does not.

## Developing

`src/extension.ts` is the whole adapter, and deliberately small: the fence's grammar, resolution, placeholder and preamble are `src/lib/fence/fence.ts` in the repo root, shared with the [remark plugin](../README.md#in-a-markdown-file). What lives here is the markdown-it rule, the per-render preamble hoist, the file watcher, and the two CSS rules a live pane needs that a file does not.

`dist/extension.js` is committed and a test fails if it is stale. Run the extension against a scratch workspace with:

```sh
code --extensionDevelopmentPath=$(pwd)/vscode <some-folder-with-canvases>
```

---
name: vscode-extension
title: "Task: the bcc fence in VS Code's markdown preview"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [fence-shape, vscode-preview-spike, headless-renderer]
---

## Question

The surface where the canvases actually are — a developer with the repo open, writing the doc that points at the canvas sitting beside the code.

[vscode-preview-spike](wayfinder/tickets/053-vscode-preview-spike.md) came back green and settled the shape — the disk read works, the sheet arrives whole, and its `@container` tiers and `subgrid` all compute in the preview. It also left a working `extendMarkdownIt` skeleton and a minimal contributions block in `.scratch/vscode-preview-spike/`, which is where this ticket starts. Read that resolution before writing anything; what follows is only what the spike says the build must not get wrong.

- **Never emit `<script>`.** It is parsed into the DOM, never runs (nonce CSP), *and* raises the yellow "Some content has been disabled in this document" banner over the whole preview. If the sheet ever needs runtime behaviour, `previewScripts` is the only route — not an alternative.
- **Contribute `markdown.previewStyles` even if it is nearly empty.** `previewResourceRoots` is empty unless styles or scripts are contributed, so an extension contributing only `markdownItPlugins` **cannot serve one file from its own directory**. The sheet CSS itself belongs in the plugin's emitted inline `<style>` — it wins the cascade and it is the same string the renderer already injects into the artifact head, so one code path serves both surfaces.
- **Fonts as `data:` URIs need nothing.** All three routes were measured working; the `data:` one is what the renderer already does.
- **Wrap the sheet in its own `container-type: inline-size`.** The preview provides no container, and the tiers do fire in practice — a narrower preview pane returned the stacked single-column tier.
- **Reset element defaults inside the wrapper.** `media/markdown.css` carries unscoped `h1…h6`, `p, ol, ul, pre`, `a`, `table`, `li p` selectors that inherit into fence output.
- **Resolve in the renderer rule, synchronously**, and handle `env.currentDocument === undefined` with a readable refusal — 052 drafted that sentence, and it is one of only two refusals this extension writes itself; the other four come from `readProblem`.
- **The whole resolution step is `readCanvas(root, path)`**, per 052 decision 6, with the workspace folder holding the document as the root. `readFileSync` and `parseCanvasImport` are not called here directly. [fs-seam](wayfinder/tickets/061-fs-seam.md) puts it in `src/lib/fs/`; if that ticket has not landed when this one starts, it lands first rather than being worked around.
- **`fontFaceCss()` once per document, not once per fence** ([fence-shape](wayfinder/tickets/052-fence-shape.md) decision 9). ~200 KB of base64 is not optional here — `localResourceRoots`, not CSP, is why the fonts cannot be served from the extension directory — so three self-contained fences would be 600 KB per keystroke-triggered re-render. A flag on `env` is the hoist: per-render, and therefore correctly scoped.

Points to get right:

- **Re-render on change.** The preview updates when the *markdown* changes; the canvas is a different file. A canvas edited in the BC Canvas editor — or by an agent through the MCP server — should not leave a stale sheet in the preview. A file watcher on resolved canvases, or an accepted limitation, but decided rather than discovered.
- **The preview's own cascade**, per the spike's finding (3).
- **Failure**, per 052, in the live-preview flavour: the same visible preamble-free placeholder both adapters emit, carrying `readProblem`'s sentence, with `detail` going to the output channel rather than into the preview. 052 considered and declined the split — the preview's reader is the author, with the offending file one click away, which is an argument for showing `detail` inline — because SPEC §3.3's rule is that `detail` reaches a human where the offending bytes are *on screen*, and in a preview they are in another file. Worth re-testing against a real broken canvas before accepting it: if the output channel turns out to be somewhere nobody looks, that is evidence 052 did not have.
- **Installation.** Repo-local and unpublished, per the map: a `.vsix` built from the repo and installed by hand, not a marketplace listing. Say so in the README so the two adapters' install stories sit together.

Done when a `bcc` fence renders the sheet in VS Code's markdown preview on a real repo, the canvas-changed case behaves as decided, and the install path is written down. Screenshots in `.scratch/vscode-extension/`.

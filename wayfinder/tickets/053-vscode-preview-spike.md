---
name: vscode-preview-spike
title: "Research: what does VS Code's markdown preview allow a markdown-it plugin to emit?"
labels: [wayfinder:research]
status: closed
assignee: mitchell
blocked-by: []
---

## Question

[vscode-extension](wayfinder/tickets/058-vscode-extension.md) assumes the preview will render what the plugin hands it. The API docs sanction the extension points but say nothing about what survives the webview, and the sheet is an unusually demanding payload — a 12-column grid with `subgrid`, three `@container` tiers, and three web fonts.

**What the docs establish** (charting, 2026-08-13). Three official contribution points: `contributes."markdown.markdownItPlugins": true` plus an `extendMarkdownIt(md)` returned from `activate()`, which receives the live markdown-it instance; `contributes."markdown.previewStyles"`, stylesheets inserted after the built-in styles and before the user's `markdown.styles`; and `contributes."markdown.previewScripts"`. All three are scoped to the built-in preview — not hovers, not the gutter, not the same file opened in a browser.

**What is unverified, and what this ticket settles:**

1. **Does VS Code sanitize markdown-it plugin output?** The preview is a webview and webviews carry a CSP. If a DOMPurify-style pass runs over the HTML, the question is what it strips — inline `<style>`, `<svg>`, custom attributes. This decides whether the sheet arrives whole or in pieces.
2. **Does the webview CSP admit fonts?** Two routes: fonts referenced from a `previewStyles` stylesheet (relative to the extension), and fonts base64'd as `data:` URIs inside it. The second is what the renderer already does for the artifact. If neither works, the preview renders in a system stack, and that is a visual-fidelity answer [renderer-shape](wayfinder/tickets/050-renderer-shape.md) may want to hear about.
3. **Does the sheet's CSS survive?** `@container` queries, `grid-template-areas`, `grid-template-rows: subgrid`. The preview's own stylesheet is in the cascade too — does anything in it collide with the sheet's scoped classes, and does the sheet need its own containment wrapper?
4. **Where does the CSS have to go?** `previewStyles` versus an inline `<style>` emitted by the plugin versus the SSR renderer's injected head CSS. Only one of these may survive (1), and it decides the extension's shape.
5. **Can the plugin skip `previewScripts` entirely?** The sheet has no runtime behaviour, so rendering straight to HTML inside the markdown-it rule should be enough. Confirm rather than assume — it is the difference between a static rule and a client bundle.
6. **How does a plugin resolve a path relative to the document?** [fence-shape](wayfinder/tickets/052-fence-shape.md) needs a real answer per surface; markdown-it rules do not obviously get the document URI, so name the mechanism (`md.set`/env, an `extendMarkdownIt` closure, whatever it actually is).
7. **Can the plugin read a file off disk at render time at all?** The fence holds a pointer, so the extension must load and parse a `.bcc.json` during preview rendering — in a webview-adjacent context, possibly with workspace-trust implications. If it cannot, the pointer fence does not work in VS Code and [fence-shape](wayfinder/tickets/052-fence-shape.md) needs to know before it decides.

Primary sources first — `code.visualstudio.com/api`, the `vscode-markdown-languageservice` and markdown extension sources — then a throwaway extension in `.scratch/vscode-preview-spike/` if the docs do not answer (2), (3) or (7), because those are the three that would actually change the plan. Screenshots and the minimal `package.json` contributions block belong in the findings.

Item (7) is the one that can invalidate a decision on another ticket, so report it as soon as it is known rather than holding it for a complete write-up.

## Resolution

Resolved 2026-08-13 by an AFK research pass, measured against **VS Code 1.133.0** (Electron 42.6.0, extension-host Node 24.18.0) driven over the Chromium DevTools protocol — so these are measurements, not impressions. The run began on 1.130.0 and VS Code auto-updated mid-spike; the whole probe was re-run end to end and every result was identical. Runnable spike, `host-probe.json` and `preview.png` in `.scratch/vscode-preview-spike/`.

### 7 — Can a plugin read a file off disk at render time? **MEASURED: YES.** The pointer fence stands.

The question that could have sent work back to [fence-shape](wayfinder/tickets/052-fence-shape.md) comes back green. A synchronous `fs.readFileSync` inside a markdown-it **renderer rule** works in the ordinary desktop extension host with no proposed API: `diskReadOk: true`, 3,849 bytes, canvas name `Order Fulfillment`, resolved via `env.currentDocument` + `Uri.joinPath`.

The reason is structural rather than lucky: **`extendMarkdownIt` does not run in the webview.** `MarkdownContributions.fromExtension` stores the function, `MarkdownItEngine.#getEngine` applies it, and `engine.renderer.render(...)` executes in the **extension-host process** — full Node, no sandbox. Only the resulting HTML string crosses into the webview, so the webview's CSP has no bearing on the read at all. Three shipped extensions already rely on this in the same render path: `jebbs.plantuml` (3.6M installs), `svsool.markdown-memo`, `abechanta.vscode-ext-paged-media`.

Three constraints ride along. **The read must be synchronous** — renderer rules return a string and there is no async escape, so `workspace.fs.readFile` cannot be awaited inside one. **Web hosts have no `fs`** (vscode.dev, github.dev): an extension with only a `main` entrypoint does not load there and the fence degrades cleanly to a plain code block; the only shipped web-safe pattern is prefetch-into-cache with a `FileSystemWatcher`, as `marp-vscode` does, and nobody has solved async-read-in-a-sync-rule. **Workspace trust gates activation, not the read** — SOURCE, not measured, because an Extension Development Host always reports `workspaceIsTrusted: true`; an extension that does not declare `untrustedWorkspaces` support simply never registers its plugin and the fence renders as a code block. `markdown-language-features` itself is the precedent to copy.

### 1 — Sanitizing? **MEASURED: NO.** But never emit `<script>`.

No DOMPurify-style pass exists. The HTML rides in a `data-initial-md-content` attribute and the webview does `new DOMParser().parseFromString(…)` then appends. Inline `<style>` survives as a live stylesheet (20 `cssRules`), inline `<svg>` renders in the SVG namespace at 40px, custom `data-*` and `aria-label` are intact.

The one exception is a CSP block rather than a strip, and it has a cost worth knowing: an inline `<script>` is parsed into the DOM and **never runs** (`script-src 'nonce-…'` with a nonce you cannot know, plus DOMParser's non-executing scripts) **and it raises the yellow "Some content has been disabled in this document" banner** — visible in `preview.png`. So the rule is not "scripts are stripped", it is *never emit one, because it does nothing and it accuses the document of being unsafe*.

### 2 — Fonts? **MEASURED: YES, all three routes** — and `localResourceRoots` is the real constraint, not CSP.

The live document's CSP carries `font-src 'self' … https: data:` and `style-src … 'unsafe-inline' … data:` — the `Strict` branch of `#getCsp`, not an accident of this machine. Measured `FontFace.status: loaded` for a base64 `data:` URI in the plugin's inline `<style>`, for an extension file via `asWebviewUri`, and for a relative `url()` in a `previewStyles` sheet. A file outside every `localResourceRoot` fails — `status: error`.

The constraint that follows is sharp: `previewResourceRoots` is `previewStyles.length || previewScripts.length ? [extensionUri] : []`, so **an extension contributing only `markdown.markdownItPlugins` cannot serve a single file from its own directory.** Fonts-as-files therefore make a `previewStyles` entry mandatory; fonts-as-`data:` — which is what the artifact renderer already does — need nothing but the plugin.

### 3 — Does the sheet's CSS survive? **MEASURED: YES, in full.**

`container-type: inline-size` computes, `@container` matches, `@supports (grid-template-rows: subgrid)` passes, `subgrid` computes, twelve tracks at 85.33px, `grid-template-areas` verbatim, and the row-1 5-4-3 split lands on one row. **The `@container` tiers respond to the preview pane** — a narrower pane returned the stacked single-column tier — so a side-by-side preview hits them routinely, and the sheet needs its own wrapper declaring `container-type: inline-size` because the preview provides no container.

Collisions are real and one-directional: `media/markdown.css` carries unscoped element selectors (`h1…h6`, `p, ol, ul, pre`, `a`, `img, video`, `table`, `li p`, `sup`) and an `<h3>` inside fence output inherited `-apple-system` at 17.5px. Keep the scoped-class discipline and reset element defaults inside the wrapper rather than assuming a clean slate. Nothing is injected *inside* the returned string — the preview's `data-line`/`code-line` decoration applies to tokens it renders itself, verified byte-for-byte.

### 4 — Where the CSS goes, 5 — `previewScripts`, 6 — path resolution

Cascade measured at nine layers, contributed `previewStyles` landing after every built-in and the plugin's own inline `<style>` after that. **Recommendation: the sheet CSS goes in the plugin's emitted inline `<style>`, with a near-empty `previewStyles` file kept for `localResourceRoots`** — it wins the cascade, and it is the same string the SSR renderer already injects into the artifact head, so one code path serves both surfaces.

`previewScripts` can be skipped entirely: everything above rendered from the fence rule's returned HTML alone. Two riders — contributing it is one of the two ways into `localResourceRoots`, and since the plugin cannot ship an inline `<script>`, it is the *only* route if the sheet ever grows runtime behaviour.

Path resolution is `env.currentDocument`, a real `vscode.Uri` handed to renderer rules as the fourth argument, alongside `env.resourceProvider.asWebviewUri` and `cspSource`. **Three sharp edges, all SOURCE:** it is populated at *render* and never at *parse* (`#tokenizeString` hard-codes `undefined`), so a `core`/`block`/`inline` rule cannot see it and **the fence must resolve inside the renderer rule**; parse output is cached against document text, so parse-time side effects would not re-run when a *referenced* file changes; and it is `undefined` when a caller passes a string, which the public `markdown.api.render` command does — so the rule needs a defined refusal for that case rather than a throw.

**Scope note (SOURCE), and it is a real limit:** all of this is the *preview* only. The notebook markdown renderer is a separate contribution running a different markdown-it instance in a notebook webview, with no Node and no `env.currentDocument`. **A `bcc` fence in a notebook cell will not resolve a pointer.**

### Unresolved

Restricted Mode end to end (not measurable from an Extension Development Host — needs a packaged `.vsix` in a normal window on an untrusted folder), and the web extension host (vscode.dev / github.dev), where prefetch-into-cache is the known-good shape but was not exercised.

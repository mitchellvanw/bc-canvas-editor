---
name: vscode-preview-spike
title: "Research: what does VS Code's markdown preview allow a markdown-it plugin to emit?"
labels: [wayfinder:research]
status: open
assignee:
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

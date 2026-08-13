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

Build to what [vscode-preview-spike](wayfinder/tickets/053-vscode-preview-spike.md) found, which decides more of this ticket than the code does: whether preview output is sanitized, whether the CSP admits fonts, where the CSS has to be contributed, whether `previewScripts` is needed at all, and — the one that can invalidate the plan — whether a markdown-it rule can read a `.bcc.json` off disk at render time.

If the spike says it cannot read from disk, **stop and hand back to [fence-shape](wayfinder/tickets/052-fence-shape.md)** rather than working around it. A pointer fence that cannot resolve its pointer in the surface this ticket exists to serve is a fact about the fence's design, not an obstacle for this ticket to route past.

Otherwise: `contributes."markdown.markdownItPlugins"`, an `extendMarkdownIt` that registers the `bcc` fence rule, CSS wherever the spike said it has to go, and the renderer called per fence.

Points to get right:

- **Re-render on change.** The preview updates when the *markdown* changes; the canvas is a different file. A canvas edited in the BC Canvas editor — or by an agent through the MCP server — should not leave a stale sheet in the preview. A file watcher on resolved canvases, or an accepted limitation, but decided rather than discovered.
- **The preview's own cascade**, per the spike's finding (3).
- **Failure**, per 052, in the live-preview flavour — which is a different event from a CI docs build, and the same broken fence should not necessarily read the same way in both.
- **Installation.** Repo-local and unpublished, per the map: a `.vsix` built from the repo and installed by hand, not a marketplace listing. Say so in the README so the two adapters' install stories sit together.

Done when a `bcc` fence renders the sheet in VS Code's markdown preview on a real repo, the canvas-changed case behaves as decided, and the install path is written down. Screenshots in `.scratch/vscode-extension/`.

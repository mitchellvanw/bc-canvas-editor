---
name: render-checkpoint
title: "Task: the gate — one renderer, two surfaces, and the sheet that cannot drift"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [bcc-cli, committed-images, committed-images-build, remark-plugin, vscode-extension, mcp-diet]
---

## Question

The map's destination, run against the shipped result rather than asserted from the tickets. Per the checkpoint habit, every leg produces evidence in `.scratch/render-checkpoint/` and a red leg goes back to the ticket that owns it rather than being patched here.

1. **Identity — the leg this map exists to protect.** The sheet `bcc render` produces and the sheet the editor exports are the **same sheet**, on all four committed examples. Bytes where bytes can be equal; a pixel comparison where they legitimately cannot, since SSR emits hydration comments client `innerHTML` does not. Read the editor's side back through a real browser rather than reasoning about it — the precedent is [views-checkpoint](wayfinder/tickets/048-views-checkpoint.md), where the artifact leg was only honest because it was read back through a DOM. **Build a fifth specimen if the four examples do not exercise the transformation**, exactly as 048 had to when none of the four contained a `<`, `>` or `&`.
2. **GitHub.** A canvas committed in a repo renders in a markdown file on github.com — the real surface, not a local replay of its headers, which is the gap [github-svg-probe](wayfinder/tickets/049-github-svg-probe.md) was created to close. Fonts as decided in [committed-images](wayfinder/tickets/056-committed-images.md).
3. **VS Code.** A `bcc` fence renders in the markdown preview on a real repo, and a canvas edited underneath behaves as [vscode-extension](wayfinder/tickets/058-vscode-extension.md) decided.
4. **A unified-based site.** The remark plugin renders on at least two targets from a real build.
5. **No browser in the chain.** `bcc render` produces its HTML and its committed image with Node alone — no Playwright, no Chromium — unless [committed-images](wayfinder/tickets/056-committed-images.md) knowingly bought one for PNG, in which case the SVG path still runs without it.
6. **Round trip.** A canvas written by the CLI opens unchanged in the editor, and a canvas exported by the editor is read unchanged by the CLI. The property [mcp-hosts-checkpoint](wayfinder/tickets/030-mcp-hosts-checkpoint.md) established for the server, re-run for the surface that has joined since.
7. **Staleness.** The mechanism [committed-images](wayfinder/tickets/056-committed-images.md) chose actually catches a stale image — change a canvas, do not regenerate, and confirm the check fails. A freshness guarantee nobody has tried failing is a comment.
8. **The MCP surface after the diet.** `tools/list` re-measured against the rebuilt bundle, the plugin's skills driven once in Claude Code to confirm they instruct tools that exist, and the resource still reachable.
9. **Both suites plus `svelte-check` green**, with the MCP bundle rebuilt if anything under `src/lib/` moved.

Green here reaches the destination and closes the map. What a red leg forces goes back on the map before anything else is built.

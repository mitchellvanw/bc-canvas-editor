---
name: cli-home
title: "Grilling: where does the bcc CLI live, given mcp/ is the plugin root?"
labels: [wayfinder:grilling]
status: open
assignee:
blocked-by: []
---

## Question

The CLI is a new artifact, not a migration — nothing in this repo is runnable as a command except the MCP stdio server, whose only flag is `--root`. So it needs a home, and the obvious one is booby-trapped.

**The constraint that makes this a decision.** [bcc-plugin](wayfinder/tickets/033-bcc-plugin.md) made **`mcp/` itself the plugin root**, because a marketplace install copies only the `source` subdirectory and runs no build step. Anything put in `mcp/` therefore ships inside the plugin to every user who installs it — including a CLI they have no way to run, and every byte of a second committed bundle. `mcp/dist/server.js` is already 1.2 MB committed, and `server.test.ts` byte-diffs it against a fresh build so it cannot go stale silently.

### The options

- **Inside `mcp/`**, second `bin` entry, second bundle. Shares `package.json`, `tsconfig.json` and the `$lib/*` alias with zero new plumbing — and ships a CLI to every plugin installer.
- **A sibling `cli/`**, its own package. Clean separation and the plugin stays what it is; costs a third `package.json`, a third `tsconfig`, a third `node_modules`, and duplicates the `$lib` alias and the esbuild config. Note the repo already accepted "a second build system in a repo that has one" ([mcp-server-shape](wayfinder/tickets/025-mcp-server-shape.md) decision 5); this is the third.
- **The root package**, a `bin` on the app itself. One package, but the app's `package.json` is a SvelteKit app and Vite must already be told to ignore `mcp/`.
- **Rename and restructure** — `mcp/` becomes something like `tools/`, with the plugin root moved to a subdirectory. Cleanest naming, reopens a signed-off decision and every install path in two READMEs.

### The questions under it

1. Which home, and what does it cost the plugin install?
2. **Is the CLI bundled and committed like the server, or run from source?** The server's bundle is committed because a plugin install runs no build step. A CLI run from a checkout has no such constraint — `node cli/src/main.ts` under a loader, or an esbuild bundle, or `vite-node`. Committing a second 1.2 MB artifact to a repo that diffs it in CI is a real cost with no install story demanding it.
3. **How is it invoked?** `npx --yes github:mitchellvanw/bc-canvas-editor`, a global `npm link`, an npm script, or a bare path. This decides what a pre-commit hook in *another* repo can call — and [committed-images](wayfinder/tickets/056-committed-images.md) depends on the answer.
4. **Does the filesystem cluster move or get shared?** `root.ts` (123 lines of containment, symlink resolution, the `/` refusal), `discover.ts` (78, the walk and its skip list) and `write.ts`'s `writeAtomic` are filesystem concerns the CLI needs verbatim, with 31 tests that travel unmodified. But `write.ts` also holds `canvasBytes()`, which is the canonical-bytes concern, and `main.ts` is roughly half MCP transport wiring. Moving, sharing or copying — and if sharing, across which seam, given the CLI and the server are different packages.
5. **Does the server keep working unchanged through all of it?** Non-negotiable in practice: [workshop-drive](wayfinder/tickets/034-workshop-drive.md) is still open against the shipped plugin, and this ticket must not break the thing that ticket is measuring.

Done when the CLI has a home, an invocation, a bundling answer, and a decision on the filesystem cluster — enough for [bcc-cli](wayfinder/tickets/055-bcc-cli.md) to build without re-litigating layout.

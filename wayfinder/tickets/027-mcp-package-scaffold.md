---
name: mcp-package-scaffold
title: "Task: scaffold the mcp/ package — build, transport, root and containment"
labels: [wayfinder:task]
status: open
assignee: mitchell
blocked-by: [mcp-server-shape]
---

## Question

Stand up `mcp/` as a buildable, launchable stdio server with nothing in it yet but the plumbing — so [mcp-tools-and-resource](wayfinder/tickets/028-mcp-tools-and-resource.md) is about tools and not about esbuild.

- **Package:** `mcp/package.json`, private, with a `bin`. `tsconfig` maps `$lib/* → ../src/lib/*`; bundle with esbuild/tsdown to a single `dist/server.js` so the alias resolves at build time and `src/lib/model/*` stays exactly where it is. Root `vite.config.ts` must ignore `mcp/`.
- **Verify the model layer actually imports clean in Node.** The research note calls it DOM-free, and it is — but `src/lib/editor/vocab.ts` type-imports `PickKind` from `src/lib/sheet/pick-slots.ts`, which type-imports back from `model/canvas`. Type-only, so it should erase; confirm rather than assume, because `vocab.ts` is load-bearing for the vocabularies.
- **Transport: `serveStdio(() => buildServer())`** from `@modelcontextprotocol/server` v2, **not** `server.connect(new StdioServerTransport())`. The SDK does not put a 2026-07-28 byte on the wire by default — the hand-constructed form stays on the 2025-era protocol. Accept legacy clients (do **not** pass `legacy: 'reject'`): last-week npm downloads run ~52M for the v1 SDK against ~2M for v2, so refusing 2025-era clients means choosing to break hosts that haven't migrated.
- **`--root`, defaulting to CWD.** Single root. Resolve it once at startup; fail loudly on stderr and exit if it doesn't exist.
- **Containment.** Every path a tool accepts is resolved and verified inside the root before anything touches the filesystem — the spec's directory-traversal MUST is the server's job, not the model's. This is the security seam of the whole package; give it its own tests, symlinks included.
- **Discovery**, since every tool needs it: recurse from root matching `*.bcc.json` and `*.bcc.html`, skipping `node_modules`, `.git`, `dist`, `build`, `.svelte-kit`.
- **Atomic write helper**: temp file in the same directory, then rename. Canonical bytes — serializer output plus the trailing newline `examples/` carries. Likely wants `serializeCanvasFile(file: CanvasFile): string` in the model layer, since `serializeCanvas` takes the runtime `CanvasDoc`; one function, and it belongs next to its sibling rather than in `mcp/`.
- **Nothing on stdout, ever.** On stdio the server MUST NOT write anything to stdout that isn't a valid MCP message, and this repo's day-to-day is Vite and Svelte where a stray `console.log` is normal. Diagnostics go to stderr — *not* `notifications/message`, which is deprecated in this revision. Worth a lint rule or a guard rather than a convention.
- **Proof it runs:** the server starts, a host connects, `tools/list` returns an empty-but-well-formed list. That's the whole bar for this ticket.

Resolution records the build setup, the transport call, and what the containment tests cover.

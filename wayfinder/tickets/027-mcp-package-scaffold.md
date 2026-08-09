---
name: mcp-package-scaffold
title: "Task: scaffold the mcp/ package — build, transport, root and containment"
labels: [wayfinder:task]
status: closed
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

## Resolution

Done (2026-08-09). `mcp/` is a buildable, launchable stdio server with no tools in it; `npm run build && npx vitest run` in `mcp/` is green (35 tests), and the app's own suite (312) and `npm run check` are untouched by the one change that reached into `src/`.

### The build

`mcp/package.json` is private, `type: module`, `bin: { "bc-canvas-mcp": "./dist/server.js" }`, and holds its own `node_modules` — the SDK and zod never enter the app's dependency tree. `mcp/tsconfig.json` maps `$lib/* → ../src/lib/*` with **no `baseUrl`** (TypeScript 6 errors on it as deprecated; `paths` alone resolves relative to the tsconfig, and esbuild reads it the same way). `build.js` is nine lines of esbuild: one entry, `format: 'esm'`, `platform: 'node'`, `packages: 'external'`, `tsconfig: 'tsconfig.json'`, a `#!/usr/bin/env node` banner and a `chmod 755`. Bundling is what makes the `$lib` alias a build-time concern and nothing else's; `src/lib` did not move and gained no awareness of the server.

Root `vite.config.ts` gets `server: { watch: { ignored: ['**/mcp/**'] } }`; root `.gitignore` gets `mcp/dist`; root `package.json` gets `test:mcp`. The app's `vitest.config.ts` already scoped itself to `src/**`, so the two suites stay separate: `npm test` is the app, `npm run test:mcp` is the server.

### The model layer imports clean — verified, not assumed

`mcp/src/model.test.ts` bundles a probe importing `$lib/editor/vocab`, `$lib/model/{canvas,embed,parse,serialize}` through the real tsconfig and runs it in a real Node process, then reads what comes out: the three domain values, the relationship count, a parse refusal's `detail`, the first bytes of a serialization, and `extractEmbeddedCanvas` on a non-artifact. The `vocab.ts → pick-slots.ts → model/canvas` type-import cycle erases exactly as expected. Nothing in the model layer touches the DOM.

**One change did reach into `src/`,** as the ticket anticipated: `serializeCanvasFile(file: CanvasFile): string` now sits beside `serializeCanvas` in `src/lib/model/serialize.ts`. Rather than duplicating the key order, `toCanvasFile` was **widened** to take a `CanvasFile` — a `CanvasDoc` already satisfies that structurally, its rows just carry an extra `id` — so both the editor's document and a file off the parser normalize through one walk, and `serializeCanvas` is now a one-line call into `serializeCanvasFile`. Two tests pin it: same bytes as the editor's export, and canonical whatever key order the file arrives in.

### The transport, and a fact worth recording

`main.ts` ends in `serveStdio(() => buildServer(root), { onerror })` with **no `legacy` option**, so the default `'serve'` stands and 2025-era clients are served rather than rejected. `src/server.test.ts` drives the built `dist/server.js` as a subprocess over raw newline-delimited JSON — not through the client SDK, because half of what is being proved is what does *not* appear on stdout — and pins both eras:

- A 2026-07-28 client gets `{"tools":[],"resultType":"complete","_meta":{"io.modelcontextprotocol/serverInfo":{...}}}`. `resultType` is the tell: it exists only on the modern wire.
- A 2025-06-18 client gets an `initialize` result and a bare `{"tools":[]}` with no `resultType`.

**The mechanism behind the map's warning, now concrete.** In SDK v2.0.0 the modern era is not selected by `initialize` at all — `LATEST_PROTOCOL_VERSION` is `2025-11-25` and `SUPPORTED_PROTOCOL_VERSIONS` tops out there, because those name the *legacy* ladder. 2026-07-28 lives on a separate axis (`FIRST_MODERN_PROTOCOL_VERSION`, `SUPPORTED_MODERN_PROTOCOL_VERSIONS`) and a modern client claims it with a per-request `_meta` envelope carrying `io.modelcontextprotocol/protocolVersion` and a required `io.modelcontextprotocol/clientCapabilities`; there is no handshake. `server.connect(new StdioServerTransport())` has no way to see that claim, which is exactly why it stays on the old wire. Ticket 028's tool tests will want the envelope constant from `server.test.ts`.

### Root, containment, discovery, writes

- **`--root`** (`--root <dir>` or `--root=<dir>`), defaulting to CWD, resolved once at startup through `openRoot`, which realpaths it and refuses a missing path or a file. A bad root exits 1 with the reason on stderr and nothing on stdout; an unknown option does the same.
- **Containment** is `CanvasRoot.resolve()`, and it is the seam everything else trusts. It resolves symlinks *before* comparing, walking up to the deepest ancestor that actually exists so a path that is about to be written is still checked. `root.test.ts` covers: relative inside; `..` that stays inside; absolute inside; a file that does not exist yet; a *directory* that does not exist yet; traversal out; absolute out (`/etc/passwd`); a symlinked file pointing out; a symlinked directory reached through — including a not-yet-existing path behind it, which is the case a string check on `..` and a `startsWith` on the resolved path both miss. The refusal names the path and the root.
- **Discovery** (`findCanvases`) recurses for `*.bcc.json` and `*.bcc.html`, skips `node_modules`, `.git`, `dist`, `build`, `.svelte-kit`, returns root-relative `/`-separated paths sorted, and **does not follow symlinks** — following one is how a walk leaves the root or loops.
- **Writes**: `canvasBytes(file)` is `serializeCanvasFile(file) + '\n'`, pinned against a committed example byte for byte; `writeAtomic` writes a sibling temp file and renames over the target, removing the temp if anything throws.

### Nothing on stdout, ever

Not a convention: `src/stderr.ts` rebinds `globalThis.console` to a `Console` over `process.stderr` at import time, and `main.ts` imports it before the SDK so the rebinding beats every other module's evaluation. A stray `console.log` — the normal debugging move in this repo — lands on stderr instead of corrupting the stream. `stderr.test.ts` proves it in a separate process (importing it in-process would rebind the test runner's own console): `console.log`/`.info`/`.error` all arrive on stderr, stdout stays empty, and `fail()` exits 1 the same way.

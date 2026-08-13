---
name: fs-seam
title: "Task: the filesystem seam — one cluster, two callers"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: []
---

## Question

Move what [cli-home](wayfinder/tickets/051-cli-home.md) decisions 7 and 10 settled, before anything is built on top of it. Nothing here is a decision — this ticket exists because it is two packages, 31 relocating tests, a tsconfig change and a 1.2 MB bundle rebuild, and folding it into [bcc-cli](wayfinder/tickets/055-bcc-cli.md) would crowd the CLI out of its own session.

**What moves:**

- `mcp/src/root.ts` (123 lines) and `root.test.ts` (133) → `src/lib/fs/`
- `mcp/src/discover.ts` (78) and `discover.test.ts` (120) → `src/lib/fs/`
- `writeAtomic` out of `mcp/src/write.ts` → `src/lib/fs/`
- **`mcp/src/read.ts` (81 lines) and `readProblem` out of `mcp/src/errors.ts` → `src/lib/fs/`** — added by [fence-shape](wayfinder/tickets/052-fence-shape.md) decision 6, which found `readCanvas` *is* the fence's resolution step (containment, read and parse, returning a closed refusal union) and `readProblem` *is* the sentence a fence placeholder shows. This inventory was right when written, with the server the only caller; the fence makes it three, and leaving `read.ts` here would have both adapters importing out of the plugin package. `readRefusal` and `refuse` stay in `mcp/` — they are MCP-shaped down to `isError` and the tool names in their tails, so `errors.ts` splits along the same line `write.ts` does. `read.test.ts` does not exist today — the coverage rides in the tests of its five call sites (`tools.ts`, `prompt.ts`, `resource.ts`, `catalog.ts`) and stays with them, so this half of the move relocates one file and no tests.
- `canvasBytes()` out of `mcp/src/write.ts` → `src/lib/model/`, beside `serialize.ts` — it is the serializer plus SPEC §3.5's trailing newline, not a filesystem concern, and `bcc fmt` is entirely that function

Both callers reach it through the `$lib/*` alias, which `mcp/tsconfig.json` already resolves and esbuild already inlines at build time — the same seam `src/lib/render/` uses. `write.test.ts` splits along the same line its subject does.

**The friction, which is the whole reason this is a task and not a rename.** `src/lib/` has zero `node:` imports today. `tsconfig.json` extends SvelteKit's generated config without `"types": ["node"]` and gains it (one line, repo-wide — the app's own code simply never imports a builtin). Root `vitest.config.ts`'s global `conditions: ['browser']` is expected to be a non-issue, since the cluster imports nothing but builtins, but it is the thing to check first rather than assume. `svelte-check` runs over all of `src`.

**The server must come through unchanged in behaviour.** [workshop-drive](wayfinder/tickets/034-workshop-drive.md) is open against the shipped plugin and is measuring model behaviour through the tool surface; this ticket moves imports, not bytes the model sees. `mcp/dist/server.js` is rebuilt and re-committed — `server.test.ts`'s byte-diff is what proves the rebuild happened, and the existing suite is what proves nothing else did.

Copy: `OutsideRoot`'s message is rewritten audience-neutral here rather than in [bcc-cli](wayfinder/tickets/055-bcc-cli.md), since this is where it stops being the server's ([cli-home](wayfinder/tickets/051-cli-home.md) decision 9). It currently reads *"…and the server will not follow one out of it"*, and its readers become a model and a developer at a terminal. `writing-copy`.

Done when the cluster lives in `src/lib/fs/` with its tests running in the root suite, `canvasBytes` is in `src/lib/model/`, `mcp/` imports across the `$lib` seam with its bundle rebuilt and its suite green, `svelte-check` is green, and no behaviour changed anywhere.

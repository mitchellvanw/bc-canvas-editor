---
name: fs-seam
title: "Task: the filesystem seam — one cluster, two callers"
labels: [wayfinder:task]
status: closed
assignee: mitchell
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

## Resolution

**Done, with no behaviour change anywhere and the exact 31 tests the ticket counted** — 29 into `src/lib/fs/` (17 `root`, 9 `discover`, 3 `writeAtomic`) and 2 into `serialize.test.ts`. Root suite 421 green, `mcp/` 54 green, `svelte-check` 0 errors over 420 files, `vite build` clean.

**The move, as inventoried.** `root.ts`, `root.test.ts`, `discover.ts`, `discover.test.ts` and `read.ts` went across as `git mv`; `writeAtomic` became `src/lib/fs/write.ts` with its three tests; `canvasBytes` went to `src/lib/model/`; `mcp/src/write.ts` and `write.test.ts` are gone. `mcp/` reaches all of it through `$lib/fs/*`, the alias it already resolved for `$lib/model/*`.

**The friction the ticket flagged was smaller than feared, in both directions it named.** `conditions: ['browser']` is a non-issue exactly as predicted — the cluster imports nothing but builtins, and it was the first thing checked rather than assumed. `"types": ["node"]` on the root tsconfig is the one line it was said to be. `vite build` does not pull a builtin into the client bundle, because nothing reachable from the app imports `src/lib/fs/`.

**The bundle diff is the proof, and it is a stronger one than the byte-diff test.** `server.test.ts` failed before the rebuild, as designed. After it, an *order-insensitive* diff of the old and new 1.2 MB bundles comes back as exactly four things: the two copy strings below, and the `// ../src/lib/fs/*.ts` module-path comments replacing `// src/*.ts`. Not one other line moved — which is what "the existing suite proves nothing else did" wanted, said as a property rather than as a green tick.

**Four decisions the ticket left implicit:**

1. **`readProblem` landed *in* `read.ts`, not in a file of its own.** The ticket's "this half of the move relocates one file" reads that way, and it is right for a reason worth writing down: `readCanvas` and `readProblem` are the two halves of one import for every caller that has a path and a surface to write on. Both fence adapters take exactly that pair.

2. **`canvasBytes` went *into* `serialize.ts`, not beside it as a new file.** "Beside `serialize.ts`" admitted both readings; this repo pairs one test file to one source file, and a one-function `bytes.ts` would have bought a fifth model file plus a fifth test file to hold two assertions. Its two tests joined `serialize.test.ts`, which is the same split the ticket asked for on `write.test.ts`, landed one directory over.

3. **`readProblem`'s `newer-version` sentence was rewritten too, beyond the one string the ticket named.** It said *"this server reads up to version 2"*, and it is now read by a model, a terminal and a markdown preview — the identical problem `OutsideRoot` was rewritten for, in a function moving across the same seam in the same commit. Leaving it would have been fixing half a copy bug on purpose. It now reads *"version 2 is the newest that can be read here"*: no actor named, and `here` is true on every surface. `readRefusal`'s copy of the sentence stays server-voiced in `mcp/`, correctly — it is the branch that also promises *"Nothing was read, and nothing was changed"*, which only a write surface can say.

4. **`OutsideRoot`** now reads `<path>: outside the canvas root. Paths are relative to <root>, and a path out of it is not followed.` The rule keeps its subject (the root), loses its actor (the server), and stays a rule rather than a retry — which is what the class's own comment promised and the old wording delivered only for the server.

**Containment's justification was rewritten, per [cli-home](wayfinder/tickets/051-cli-home.md) decision 9, and the honest version is narrower than "not a security seam".** `root.ts` called itself *"the security seam of the whole package"*. It is the **bound on the walk**: `findCanvases` needs to know where to stop and `relative()` needs a base to name against, and neither is meaningful without a root — containment is what makes the root a root. The `/` case is the proof it is not a lock: a caller that wants the whole disk opens `/` and gets it. The tests did not change and did not need to — traversal, absolute paths and symlinks are still exactly the right probes, because they are how a walk leaves its bound *by accident*, which is now the only way it happens. `root.test.ts`'s own docblock says that rather than the attacker framing.

**The other shared string turned out not to need a rewrite, which is worth saying because it looked like it did.** `whyUnservable` travelled inside `root.ts` still ending *"Pass `--root <directory>`"* — apparently the same server-voiced problem. It is not: [bcc-cli](wayfinder/tickets/055-bcc-cli.md) already gives `bcc` *the server's own* `--root <dir>`, so the sentence is already true for both callers, and the third surface cannot reach it at all — a fence takes its root from the document rather than a flag, and there is no workspace folder at `/`. Only the docblock needed the edit, to stop implying Claude Desktop is the only way to land there. A string is audience-neutral when it is true for every audience, not when it names none of them.

**Two blocking edges were missing and are now wired.** [remark-plugin](wayfinder/tickets/057-remark-plugin.md) and [vscode-extension](wayfinder/tickets/058-vscode-extension.md) both said in prose that `readCanvas` comes from `src/lib/fs/` and that this ticket lands first — 058 in as many words: *"if that ticket has not landed when this one starts, it lands first rather than being worked around."* A dependency written only in a body does not reach the frontier query, and both sat on it unblocked while the thing they depend on sat beside them. `blocked-by` now carries `fs-seam` on each; both are back on the frontier now that it is closed.

`mcp/README.md`'s development section said the server reuses `src/lib/model/*` through `$lib/*`; it now names `src/lib/fs/*` alongside it and states the direction — only `src/` is shared, and nothing in the app imports out of `mcp/`. SPEC needs no amendment: §10 is UI copy, and neither rewritten string is one.

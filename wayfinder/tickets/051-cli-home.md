---
name: cli-home
title: "Grilling: where does the bcc CLI live, given mcp/ is the plugin root?"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
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

## Resolution

**`cli/` at the repo root, a directory of the root package rather than a third package — its `bin` on the root `package.json`, its bundle committed and self-contained, and the filesystem cluster lifted into `src/lib/fs/` where both callers reach it.** The ticket's four options were the wrong axis: the real fork was never *which directory* but **whether `bcc` ever runs outside this checkout**, and that answer forces most of the rest.

### What the option list got wrong before any of this was decided

Two of the ticket's stated costs turned out not to exist, and both were load-bearing.

**The CLI's dependency set is a subset of the app's.** `mcp/` is a separate package because it needs `@modelcontextprotocol/server` and `zod`. `bcc` needs neither — it wants `parseCanvasFile`, the renderer module, and `node:` builtins. So the dependency argument that justified `mcp/`'s package boundary has no analogue here, and "a third `package.json`, a third `tsconfig`, a third `node_modules`" is a price only one option actually pays.

**A build script is not a package.** [renderer-shape](wayfinder/tickets/050-renderer-shape.md) decision 8 landed after this ticket was written and already put `src/lib/render/` — own build script, committed module — *inside the app package*. The precedent existed before this ticket read its own options.

### The measurements

Four facts came off probes rather than recollection, in `scratchpad/npx-probe` and `scratchpad/subdir-probe` (throwaway; not committed).

1. **`"private": true` does not block a git install.** `npm install github:mitchellvanw/bc-canvas-editor` succeeded, exit 0. [mcp-server-shape](wayfinder/tickets/025-mcp-server-shape.md) decision 1 survives decision 1 below *literally*.
2. **`prepare` never ran.** npm 11.16 gated it: `npm warn allow-scripts 1 package has install scripts not yet covered by allowScripts`. devDependencies were not installed either — 5 packages, 11 MB, no svelte, vite, tailwind or esbuild. An install-time build is blocked by default on npm 11 and drags the full devDep tree on npm 10, which is worse than either alone: it *behaves differently across npm versions*.
3. **A git install carries the whole repo** — `CONTEXT.md`, `docs`, `examples`, `wayfinder`, `src`, `static`, and `mcp/dist/server.js`'s 1.2 MB — because root `package.json` has no `files` field, so npm fell back to `.gitignore`. All four root `dependencies` installed too.
4. **npm's git subdirectory spec is a trap, and `#workspace=` is not a spec.** `#path:/mcp` *succeeded* and looked right — folder named `bc-canvas-mcp`, `@modelcontextprotocol` and `zod` installed from `mcp/package.json` — but the tree it installed is the **repo root**, and the manifest inside reads `"name": "bc-canvas-editor"`. Folder name and `name` field disagree, and npx reads the installed manifest, so a `bin` in `mcp/package.json` would never be found. `#workspace=bc-canvas-mcp` was parsed as a git ref and died on `git checkout`.

Plus one that kills an option outright: **npm does not link a package's own `bin` locally.** `mcp/node_modules/.bin/` contains no `bc-canvas-mcp`.

### The decisions

**1. `bcc` runs outside this checkout, via `npx --yes github:mitchellvanw/bc-canvas-editor`.** The ticket carried a live contradiction — the map's Notes said *"repo-local and unpublished, run from a checkout"* while question 3 asked what *"a pre-commit hook in another repo can call"* and handed the answer to [committed-images](wayfinder/tickets/056-committed-images.md). Foreign reach wins, and everything below is downstream of it. The map's Notes are amended rather than left to outlive the decision: **unpublished stays true, repo-local does not.**

**2. Git-install, not publishing — and this does not fire the publishing trigger.** Measurement 1 means `private` stays, no registry name is claimed, no semver contract exists, and the map's *"Not yet specified"* publishing entry keeps its meaning: a **registry package** is still the thing that hasn't happened, and *"a second repo needing `bcc` in CI"* is still what would make it happen. Publishing by the side door was the failure mode to avoid, and a tag scheme is publishing by the side door.

**3. The bundle is committed, and that is settled by observation rather than preference.** Measurement 2 removes install-time builds from the table entirely — not "expensive" but *blocked by default, and version-dependently so*. So `cli/dist/bcc.js` is committed exactly as `mcp/dist/server.js` is, with a staleness test that rebuilds to a scratch path and byte-diffs. This is the ticket's question 2 answered against its own framing: it worried that committing a second bundle had *"no install story demanding it"*, and there is now one.

**4. Source in `cli/` at the repo root; the `bin` on the root `package.json`, because measurement 4 leaves no choice.** `cli/tsconfig.json` declares the `$lib/*` path directly, mirroring `mcp/tsconfig.json`, so esbuild resolves the alias identically in both. `src/` in a SvelteKit repo is a claim about what ships to a browser and a CLI is the clearest counterexample; the one concession is `src/lib/fs/` below, which is genuinely shared library code. Costs one line broadening root `vitest.config.ts`'s `include` to `'cli/**/*.test.ts'`. **Cost to the plugin install: zero** — `mcp/` gains nothing, which was this ticket's entire reason for existing.

**5. `cli/build.js` inlines the *committed renderer module*, never re-deriving it from `CanvasSheet.svelte`.** This is the decision the map's gate rests on. [renderer-shape](wayfinder/tickets/050-renderer-shape.md) made byte-identity structural by ruling every consumer imports one built module; a `cli/build.js` running its own Svelte server-compile would quietly restore two compiles that can drift and turn the structural property back into a tested-for one. The price is the fonts' ~200 KB base64 living in two committed bundles, and it is worth paying: `mcp/build.js`'s own comment states the rule — *"the one committed file has to run with nothing beside it but Node"* — and a foreign `npx` install is precisely that situation. Shipping the renderer module beside the CLI and importing it saves the duplication but makes correctness depend on a second file surviving packing. **Rider: three committed bundles are now under byte-diff, with a rebuild order (`render` → `cli`) the suite must fail loudly on rather than assume.**

**6. A foreign install carries `cli/dist` and nothing else, and installs zero dependencies.** Add `"files": ["cli/dist"]` to the root `package.json`, and move `@fontsource/archivo`, `@fontsource/ibm-plex-mono`, `@fontsource/source-serif-4` and `@zumer/snapdom` from `dependencies` to `devDependencies`. The move is a correction independent of this ticket: Vite bundles `snapdom` into the app, and [renderer-shape](wayfinder/tickets/050-renderer-shape.md)'s build reads the `@fontsource` files off disk *at build time* to inline them — nothing at runtime of an installed package imports any of them. Local `npm install` installs devDependencies anyway, so the app build is untouched. `files` affects exactly one thing for a `private` package: what a git install carries.

**7. The filesystem cluster moves to `src/lib/fs/`, and `canvasBytes()` moves to `src/lib/model/`.** `root.ts`, `discover.ts` and `writeAtomic` go to `src/lib/fs/` with their 31 tests, reached through the `$lib/*` alias both `mcp/` and `cli/` already resolve at build time — matching `src/lib/render/` and holding this map's *"`src/lib/model/` does not move"* line rather than opening a second seam. `canvasBytes()` is not a filesystem concern at all: it is `serializeCanvasFile` plus SPEC §3.5's trailing newline, sitting in `write.ts` only because writing was the first thing to need it, and `bcc fmt` is *entirely* that function. Leaving the cluster in `mcp/` was the live alternative and it fails on direction: the CLI would depend on the package [mcp-diet](wayfinder/tickets/059-mcp-diet.md) is about to cut down.

**8. `bcc` keeps containment, with the justification rewritten rather than the code.** `root.ts` calls itself *"the security seam of the whole package: the model proposes a path"* — a rationale about an untrusted proposer, and a developer at a shell is not one; `bcc render ../../etc/passwd` refuses nothing the shell wouldn't allow. But the code survives on a different footing: `ls` and `fmt` need a root to **bound a walk**, `discover.ts`'s `findCanvases(root: CanvasRoot)` is typed against it, and `openRoot`'s symlink resolution and `/` refusal are right regardless of trust — a `fmt` that walks from `/` is a bug, not an attack. Dropping containment means inventing a second root-shaped type and running two notions of "the project" in one repo. **`--root <dir>` defaulting to cwd, mirroring the server exactly** — which is already what a hook in a foreign repo gets for free, where a `.git` walk would be wrong in a submodule or a worktree.

**9. One `OutsideRoot` message, rewritten audience-neutral.** Shared, the string is read by a model *and* by a developer at a terminal; it currently says *"the **server** will not follow one out of it."* Forking it means two strings to keep true about one rule. Rewriting the one string is a `writing-copy` line item in [bcc-cli](wayfinder/tickets/055-bcc-cli.md), not a second error class.

**10. `"types": ["node"]` on the root `tsconfig.json`.** Decision 7 puts `node:` builtins inside `src/lib/` for the first time and the app's tsconfig extends SvelteKit's generated config without node types. One line, repo-wide, and the app's own code simply never imports a builtin. Root `vitest.config.ts`'s global `conditions: ['browser']` is a red herring — it affects package-exports resolution and the fs cluster imports nothing but builtins, so its tests run unchanged in the root suite alongside the 30 already there. Nested tsconfigs are a pattern this repo doesn't have and `svelte-check` wouldn't honour cleanly.

**11. `npm run bcc -- render …` locally; `mcp/` is not frozen.** npm not linking a package's own bin makes decision 4's `bin` inert in this checkout, so the everyday invocation needs its own answer, and the scripts block is where this repo already advertises entry points — `bcc` joins `test:mcp` there. `npm link` was declined for the same reason decision 2 declined publishing, and because a linked global would shadow a checkout's own build with whatever was linked last, which is the exact drift the staleness tests exist to prevent. On question 5: no freeze on `mcp/` while [workshop-drive](wayfinder/tickets/034-workshop-drive.md) is open — it measures model behaviour through the tool surface (does whole-document write lose rows, does the model read before writing), and a moved import changes no byte the model sees. The guard is `server.test.ts`'s byte-diff plus the existing suite, not a moratorium.

**12. No stability promise; `main` is the default ref.** A foreign `npx` resolves `main` at the moment it runs. Release tags are the versioning contract decision 2 declined, arriving by the side door — a tag hooks depend on is a release that must be cut. Pinning is the caller's, and git-install supports a SHA natively (`…editor#a1b2c3d`). There is currently exactly one repo with `.bcc.json` files in it, so the caller whose reproducibility this protects is hypothetical until they are not, and the escape hatch exists the moment they are.

### What this hands downstream

[bcc-cli](wayfinder/tickets/055-bcc-cli.md) loses its containment question — decision 8 answers what its own body asked it to decide *"in cli-home or here"* — and gains the packaging work (decisions 3, 4, 6, 11). The cluster move (decisions 7, 10) is split out as [fs-seam](wayfinder/tickets/061-fs-seam.md): it is two packages, 31 relocating tests, a tsconfig change and a 1.2 MB bundle rebuild, it needs no renderer, and it is takeable now — so it is a session of its own rather than a prologue that would crowd the CLI out of one.

[committed-images](wayfinder/tickets/056-committed-images.md) gets the invocation its staleness guard was waiting on: `npx --yes github:mitchellvanw/bc-canvas-editor render …`, unpinned by default, and it may pin a SHA if it wants reproducibility.

### No CONTEXT.md entry

Nothing here gained a user-facing name. **Fence** and **Render** are still the terms the map tracks, and they land with [fence-shape](wayfinder/tickets/052-fence-shape.md) and [committed-images](wayfinder/tickets/056-committed-images.md). SPEC §1's scope and §10's strings are amended by [bcc-cli](wayfinder/tickets/055-bcc-cli.md) when the commands and their copy actually exist, not here.

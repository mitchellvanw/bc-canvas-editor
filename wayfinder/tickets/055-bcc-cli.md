---
name: bcc-cli
title: "Task: bcc — render, check, fmt, ls"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [fs-seam, headless-renderer]
---

## Question

Build the CLI in the home [cli-home](wayfinder/tickets/051-cli-home.md) chose, over the renderer [headless-renderer](wayfinder/tickets/054-headless-renderer.md) built.

Four subcommands, and the pairing is the point — `check` and `fmt` are what make canvases behave like source code rather than attachments, and `render` is what the fence chain consumes:

- **`bcc render <canvas>`** — the sheet, in whatever forms 050 and [committed-images](wayfinder/tickets/056-committed-images.md) settled on. This is the one with a consumer waiting.
- **`bcc check <canvas>...`** — validate through the real parser, version gate included, exiting non-zero on refusal. The value is that it is the *same* `parseCanvasFile` the editor's Import… uses, so a canvas that passes here opens there. SPEC §3.3's path-carrying `detail` is what makes the output worth reading — a terminal is exactly the surface that rule was written for, and this is its first non-model consumer.
- **`bcc fmt <canvas>...`** — canonical bytes through `serializeCanvasFile` plus the trailing newline, so a hand-edited canvas normalises to what the editor would have written. `--check` for CI.
- **`bcc ls`** — the catalog, over `discover.ts`'s walk and skip list.

Deliberately **not** here: `bcc write`. It arrives with [mcp-diet](wayfinder/tickets/059-mcp-diet.md) if that ticket moves writing off the server. Chaining this ticket behind the diet would block the entire map on a HITL workshop session, and the four subcommands above are needed by the fence chain regardless of where writing ends up.

Copy is real work, not an afterthought: `writing-copy`, with a developer at a terminal as the reader. Help text, refusals and the `check` output are the whole interface. `errors.ts` is the register to match — name what went wrong, say what would have been legal, name the command that gets there — one step less deferential, because the reader chose to run this.

Containment is settled and does not get relitigated here: [cli-home](wayfinder/tickets/051-cli-home.md) decision 8 keeps `root.ts`'s rule with a different justification — not a security seam against an untrusted proposer, but a bound on the walk that `ls` and `fmt` need and that `discover.ts` is typed against — and gives `bcc` the server's own `--root <dir>` defaulting to cwd. [fs-seam](wayfinder/tickets/061-fs-seam.md) has already moved the code and rewritten `OutsideRoot`'s copy.

**The packaging, which is as much of this ticket as the subcommands:**

- `cli/` at the repo root — a directory of the root package, not a third package. Its own `tsconfig.json` declaring the `$lib/*` path directly (mirroring `mcp/tsconfig.json`), its own `build.js`.
- `cli/build.js` **inlines the committed `src/lib/render/` module** and never re-derives it from `CanvasSheet.svelte` — the map's byte-identity property is structural only while that holds ([renderer-shape](wayfinder/tickets/050-renderer-shape.md) decision 8, [cli-home](wayfinder/tickets/051-cli-home.md) decision 5). `cli/dist/bcc.js` is committed and self-contained, with a staleness test that rebuilds to a scratch path and byte-diffs — and the rebuild order `render` → `cli` must fail loudly rather than be assumed.
- Root `package.json` gains `"bin": { "bcc": "./cli/dist/bcc.js" }`, `"files": ["cli/dist"]`, a `"bcc"` script, and moves `@fontsource/*` and `@zumer/snapdom` to `devDependencies` — nothing at runtime of an installed package imports them.
- Root `vitest.config.ts`'s `include` broadens to cover `cli/**/*.test.ts`.

Locally it runs as `npm run bcc -- render …` (npm does not link a package's own bin). From a foreign checkout it runs as `npx --yes github:mitchellvanw/bc-canvas-editor render …`, unpinned — which is what [committed-images](wayfinder/tickets/056-committed-images.md) calls.

Done when the four subcommands work as above, a `npx` install from a scratch directory carries `cli/dist` and zero dependencies and renders an example, `bcc fmt` reproduces every committed `examples/*.bcc.json` byte for byte, `bcc check` refuses a v1 file and a corrupt one with the parser's own detail, all three committed bundles are byte-diffed green, both suites and `svelte-check` pass, and `mcp/README.md` says what the CLI is so the two surfaces are not discovered separately.

## Resolution

**Built: `bcc render`, `check`, `fmt` and `ls` in `cli/`, over the committed renderer, in a bundle a foreign `npx` install runs with zero dependencies — and the gate property came out as a number rather than a claim.** The `.bcc.html` the CLI writes from a scratch directory, with nothing installed beside it, is **225,907 bytes** — the same figure [headless-renderer](wayfinder/tickets/054-headless-renderer.md) measured for the file Chromium downloads from the live editor. One function, called twice.

### The packaging, measured rather than assumed

`npm pack` carries **three files**: `package.json`, `README.md`, `cli/dist/bcc.js` (317.9 KB). Installed into an empty directory it pulls **no dependencies at all**, links `node_modules/.bin/bcc`, and `bcc ls`, `bcc render`, `bcc fmt` and `bcc check` all work — including the SVG, given `--height`. [cli-home](wayfinder/tickets/051-cli-home.md)'s decisions 3, 4, 6 and 11 land as written; `prepare` was gated by npm's `allow-scripts` exactly as measurement 2 predicted, and the `|| echo ''` means it would have been harmless either way.

### The nine calls the ticket did not make

**1. `render` writes `artifactDocument`, not `sheetDocument` — and the ticket's own gate is what forced it.** The obvious reading of "the sheet, in whatever forms 050 settled on" is `sheetDocument`, and the first build did that. `bcc check` then **refused the file `bcc render` had just written**, one command later, because a bare sheet page carries no embedded Canvas file and `parseCanvasImport` is right to say so. `.bcc.html` is a family member with a contract — re-importable, all three Views (SPEC §9.1) — and writing something else under that extension is [committed-images](wayfinder/tickets/056-committed-images.md) decision 10's failure verbatim: *a file family that means one thing in the app and another in the CLI*. So the CLI calls the function the Export menu calls. `sheetDocument` keeps its two consumers: it is what `measure.ts` measures, and it is what a fence adapter will want.

**2. `playwright-core` is a devDependency and a lazy import, not a dependency.** [committed-images](wayfinder/tickets/056-committed-images.md) handed this forward as *"a lazily-imported dependency the committed bundle must not inline"*, which reads as `dependencies` — and that would put 3 MB into every install to serve one flag, against this ticket's own *"zero dependencies"*. The seam that dissolves it: **only measuring needs a browser**. `sheetSvg` is pure Node, so `bcc render --svg --height <px>` works in a bare install, `bcc check` works in a bare install, and the only thing missing is the measurement. `esbuild`'s `external: ['playwright-core']` keeps it out of the bundle; the dynamic import's failure is caught and answered with a sentence naming both ways forward.

**3. The output name is the canvas's *stem*, not `exportFileName`'s slug of its name.** `orders.bcc.json` → `orders.bcc.svg`. This is forced by [committed-images](wayfinder/tickets/056-committed-images.md) decision 6 and easy to get wrong, since the app has a naming function right there: a slug of the canvas *name* would move the image whenever someone renamed the context inside the file, and the staleness check would then have nothing to compare. Pinned in `bcc.test.ts` with the reason.

**4. Flag spelling, which 056 left to this ticket.** `--svg` as a boolean rather than `--format svg`: there are two forms and one is the default, so a mode word would be ceremony. `--height <pixels>` and `--out <file>` as values, `--root <directory>` on every command, `--check` on `fmt` alone. `--out` and `--height` are both **refused when more than one canvas is in reach**, because each names one file's property; `--height` is refused with `--svg` absent, since an HTML artifact has no viewport to size.

**5. `check` compares each image once.** A `.bcc.json` and the `.bcc.html` exported from it name the same `.bcc.svg`, so a root holding both compared it twice and reported *"2 images match"* over one file. Keyed by image path now.

**6. `fmt` and `render` skip `.bcc.html` on a walk, and refuse it by name.** An artifact carries a canvas rather than being one: `fmt` would rewrite a rendering as JSON, and `render` without `--out` would derive the artifact's own path and **overwrite the file it had just read**. Both are refused with what to name instead. A root holding artifacts and no Canvas files gets its own sentence — *"nothing here"* and *"nothing here is a file this command writes"* are different answers and only one of them is true.

**7. Three exit codes, not two.** **0** nothing to report, **1** something did not check out, **2** the command was not usable as typed. A script that shells out to `bcc check` in a hook wants to tell a stale image from a typo in a flag, and one non-zero code cannot. Results go to stdout one path per line so `bcc render` and `bcc fmt` pipe; every refusal goes to stderr.

**8. `ls` reports and never judges — exit 0 even when a file it found will not parse.** `ls` answers *what is here* and `check` answers *is it good*; a listing that failed on a bad file would be a check with no way to see the rest of the listing. It names the unparseable files and the unopenable directories at the end, the way the server's listing does.

**9. `cli/tsconfig.json` takes `lib: ["es2023", "dom"]`, unlike `mcp/`'s.** Reaching `artifactDocument` reaches its neighbours — `download.ts`, `views.ts` — which are typed against a browser they legitimately have. The alternative was splitting two app files to suit a consumer that wants one function. What it gives up is a type-level guarantee that the CLI touches no DOM, and the replacement is stronger: every command in `bcc.test.ts` runs the **built bundle** in plain Node, where a stray `document` throws rather than passing a compile.

### Two things moved that the ticket did not name

- **`V1_REFERENCE_FILE` moved into `src/lib/model/reference.fixture.ts`** and `parse.test.ts` imports it. The fixture file exists to be single-sourced *"so the copies can't drift"*, and the v1 example now has a second consumer: the CLI is driven against it to show the version gate is **one-sided**. Which corrects this ticket's own wording — *"`bcc check` refuses a v1 file"* is wrong, and refusing one would be a regression. A v1 file is **migrated**: `check` accepts it and `fmt` writes it back at version 2.
- **The root `README.md` gained a "Command line" section**, not just `mcp/README.md`. The ticket's reasoning — *"so the two surfaces are not discovered separately"* — applies harder to the front page, which documents `mcp/` and the renderer bundle and would otherwise be the one place `bcc` was invisible. The build note there now names the rebuild **order** and `npm run build:bundles`, which is decision 5's rider made runnable rather than remembered.

### What is not here, and why

- **No `bcc write`**, as chartered — it arrives with [mcp-diet](wayfinder/tickets/059-mcp-diet.md) or not at all.
- **SPEC §10 gains nothing.** The map's Notes say *"§10 for every new string"*, and §10 is the editor's UI copy; the CLI adds no editor string. Its own register is deliberately not §10's — one step less deferential, because the reader chose to run this. §1 gains the CLI, because a scope section that says *"Export of a self-contained HTML artifact"* while a command line also writes it is incomplete. `CONTEXT.md` gains **Render**, which [committed-images-build](wayfinder/tickets/062-committed-images-build.md) was holding as a fallback.
- **No `.gitattributes`.** `cli/dist/bcc.js` is a 318 KB committed bundle in diffs, and so is `mcp/dist/server.js` at 1.2 MB, unmarked. [committed-images-build](wayfinder/tickets/062-committed-images-build.md) creates the file for `*.bcc.svg -diff` and can fold both bundles in there rather than this ticket opening it for a rider nobody asked for.

### One constraint handed to [committed-images-build](wayfinder/tickets/062-committed-images-build.md)

`measure.ts` measures **`sheetDocument`** — the sheet in `FRAME_CSS`'s page frame — because [committed-images](wayfinder/tickets/056-committed-images.md) decision 3 makes that frame the SVG's target. `sheetSvg` does not draw in it *yet*: that is 062's first edit, deliberately ordered after this ticket so the `render.js` rebuild cascades into `cli/dist/bcc.js` once. Until it lands, `bcc render --svg` measures 1292 against ~1115 of content and the image carries **~177px of slack at the bottom** — verified as slack and not clipping, and closed by 062's frame fix rather than by a number written here. No image is committed in the meantime.

### Done

Four subcommands work; a packed install carries `cli/dist` and zero dependencies and renders an example byte-identically to the editor's export; `bcc fmt --check` reproduces every committed `examples/*.bcc.json`; `bcc check` refuses a newer-version file and a corrupt one with the parser's own detail, and migrates a v1 one; all three committed bundles are byte-diffed green; **457 root tests, 54 mcp tests, `svelte-check` 0 errors, `check:cli` clean**; and both READMEs say what the CLI is.

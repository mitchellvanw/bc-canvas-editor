---
name: bcc-cli
title: "Task: bcc — render, check, fmt, ls"
labels: [wayfinder:task]
status: open
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

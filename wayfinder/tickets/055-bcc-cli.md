---
name: bcc-cli
title: "Task: bcc — render, check, fmt, ls"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [cli-home, headless-renderer]
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

Watch the containment seam. `root.ts` refuses a path that resolves outside its root, symlinks included, and refuses `/` at launch on the grounds that listing it would walk the whole disk. A CLI invoked in a checkout has a legitimately different relationship to the filesystem than a server handed a root by a host — decide deliberately (in [cli-home](wayfinder/tickets/051-cli-home.md) or here) whether `bcc` keeps that rule, and do not let it lapse by accident.

Done when the four subcommands work from a checkout as [cli-home](wayfinder/tickets/051-cli-home.md) specified, `bcc fmt` reproduces every committed `examples/*.bcc.json` byte for byte, `bcc check` refuses a v1 file and a corrupt one with the parser's own detail, both suites and `svelte-check` are green, and `mcp/README.md` says what the CLI is so the two surfaces are not discovered separately.

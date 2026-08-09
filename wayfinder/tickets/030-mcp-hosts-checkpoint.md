---
name: mcp-hosts-checkpoint
title: "Task: the destination gate — round-trip holds, both hosts drive it"
labels: [wayfinder:task]
status: open
assignee: mitchell
blocked-by: [review-prompt-and-readme]
---

## Question

The destination gate, per [mcp-server-shape](wayfinder/tickets/025-mcp-server-shape.md) (3, 20) and the checkpoint habit this project has kept since the hosting map. Two halves, and the first is load-bearing.

**The round-trip property.** If bytes don't survive the boundary, nothing else about the server matters.

- A canvas the server writes opens in the live app and renders correctly — through the real import path, not a test harness.
- A canvas the app exports reads in the server unchanged, `.bcc.html` included, since `extractEmbeddedCanvas()` puts artifacts on the same path.
- Byte-identity both directions, allowing only the trailing-newline convention SPEC §3.5 defines.

**Both hosts, driven by hand.** Automated tests can't see what a host actually does with a `tools/list`, and Desktop is the one you can't reason about from a terminal.

- **Claude Code:** all four tools exercised against a real repo — draft a canvas for an actual service from its code, list, read both views, and write. The drafted canvas then opens in the app.
- **Claude Desktop:** the config snippet from the README works as written, on a `--root` that is not a repo. `review-canvas` appears as a slash command, its `path` completion offers discovered canvases, and the review runs.
- The teaching paths, since they are the reason the server exists rather than a skill: `bcc_explain` returns the SPEC §10 question verbatim for a spot-checked section; an off-vocabulary relationship value is **accepted with a warning**, not refused; a file with a bad `message.type` produces an error that names the field path; a hand-bumped `version` is refused with the file untouched on disk.

Record the transcript and evidence in `.scratch/mcp-hosts-checkpoint/`, following the habit from [examples-live-checkpoint](wayfinder/tickets/024-examples-live-checkpoint.md).

Green here closes the map, and unblocks the workshop phase — `bcc_edit_canvas`, `canvas-workshop` and `draft-canvas-from-code` — which graduates from the map's *Not yet specified* to a decision ticket informed by what driving the day-one server actually felt like. Note anything that annoyed you: that list is the workshop ticket's real input.

## Checkpoint so far — 2026-08-09

**Everything runnable without a GUI is green. Claude Desktop is outstanding and is the only thing between here and closing the map.** Scripts and evidence in `.scratch/mcp-hosts-checkpoint/` (`drive-server.mjs`, `round-trip.mjs`, `claude-code-mcp.json`, `evidence/`, `host-drive/`).

### The round-trip property — holds, both directions, closed loop byte-identical

Run against the live origin `https://bc-canvas.pages.dev` on Playwright WebKit, driving the shipped Import…/Export controls; the server end is the built `mcp/dist/server.js` as a subprocess.

- **Out.** A canvas the server wrote (`Canvas MCP Server`, 4759 bytes, drafted from `mcp/src/*`) went through the app's real Import… control, landed clean, and rendered — eight spot-checks across classification, domain roles, both communication lanes, ubiquitous language, business decisions and open questions. Re-exported untouched as **Canvas file**, it came back at 4758 bytes: identical to the written bytes up to the trailing newline SPEC §3.5 defines, which is the one allowed difference. The **HTML artifact** (423 KB) embeds the written bytes exactly.
- **In.** Both exports read back through the built server unchanged — the `.bcc.json` byte-identical, the `.bcc.html` resolving through `extractEmbeddedCanvas()` to the same bytes. Writing what came out of the artifact back through `bcc_write_canvas` lands on the original file byte for byte, so the whole loop closes.
- Separately, the artifact the app exported in [examples-live-checkpoint](wayfinder/tickets/024-examples-live-checkpoint.md) reads here as the committed `examples/royalty-distribution.bcc.json` bytes.
- Ride-along: the session touched only `bc-canvas.pages.dev` and the two `cloudflareinsights.com` beacon hosts.

### The protocol surface — green on a root that is not a repo

`drive-server.mjs` launches the built server over real stdio with the SDK client, `--root` on a tmpdir with no git above it — the Desktop shape.

- `tools/list` in the fixed order, 12.7 KB, matching [mcp-tools-and-resource](wayfinder/tickets/028-mcp-tools-and-resource.md)'s measurement.
- Write → list → read (both views) → resource all agree on one URI; `view: 'json'` is the bytes on disk; `bcc://canvas/{+path}` carries digest and bytes under one URI; read-then-write is byte-identical.
- `review-canvas` lists with its required `path`; completion on `docs/` offers both discovered canvases; `prompts/get` returns the embedded resource plus the instruction text; a bad path throws `-32602`, so the cost [review-prompt-and-readme](wayfinder/tickets/029-review-prompt-and-readme.md) accepted is the one actually paid.

### The teaching paths — all four green

- **`bcc_explain` is verbatim SPEC §10.** Checked by reading the §10 placeholder table off `SPEC.md` rather than retyping it, for `inboundCommunication`, `ubiquitousLanguage` and `openQuestions`. A drifted placeholder fails the script.
- **Off-vocabulary is accepted with a note.** `strangler-fig` and a custom trait `shepherd context` both landed on disk as written, with a warning naming each and listing the curated set. Not refused.
- **A bad `message.type` names the field path.** On read: `inboundCommunication[0].messages[0].type: expected one of "command", "query", "event", got "notification"`. On write the input schema catches it first, as [mcp-tools-and-resource](wayfinder/tickets/028-mcp-tools-and-resource.md) already recorded.
- **A hand-bumped `version` is refused with the file untouched** — bytes on disk identical before and after.

### Claude Code — all four tools driven by the real host

Driven headlessly with `--strict-mcp-config --mcp-config`, so nothing was written into any persistent MCP configuration. The host listed and drafted a canvas for `src/lib/editor/` from its code (`.scratch/mcp-hosts-checkpoint/host-drive/canvas-editing.bcc.json`, eleven sections filled, no warnings), read it back as a digest, and quoted `bcc_explain`'s heading verbatim.

### Three findings — the workshop ticket's real input

1. **A host with an `outputSchema` throws the prose away.** Claude Code hands the model *only* `structuredContent` for `bcc_list_canvases` and `bcc_write_canvas`; the `content` text block never arrives. Confirmed on the wire with `--output-format stream-json`: the tool result is the raw JSON object, and the drafting session reported "the tool returned a JSON object, not a sentence." `bcc_read_canvas` and `bcc_explain` declare no `outputSchema`, and their text arrives intact. So the sentence "Nothing came out under: …" and the off-vocabulary warnings-as-prose — copy written specifically for a model reader — are unread in the host that matters most. The facts survive in `empty` and `warnings`, so nothing is lost; what is lost is the register. This is exactly what the ticket said automated tests cannot see, and it reopens whether `outputSchema` earns its place on a tool whose value is its wording.
2. **Discovery has no ignore rule beyond five hard-coded names.** `bcc_list_canvases` found **13 canvases in this repo, 9 of them checkpoint evidence under `.scratch/`** — including a mangled v1-era fixture whose description reads `…once  Extra.an order is paid.`, presenting itself as a real canvas. The skip list (`node_modules`, `.git`, `dist`, `build`, `.svelte-kit`) does not cover scratch directories, and by extension does not cover anything gitignored. In a repo that keeps canvas fixtures around, the listing is mostly noise — and the listing is the tool the description tells the model to *start* with.
3. **The digest saves less than the README claims.** "About half the tokens" measured 59% of the file on `notifications` and 67% on the densely-filled draft. [mcp-tools-and-resource](wayfinder/tickets/028-mcp-tools-and-resource.md)'s 48% was one canvas, and a well-filled canvas is the case that matters. Character counts are not tokens, but the direction is consistent; the claim wants softening.

Also a copy nit: `parse.ts`'s detail carries no terminal punctuation, so `refuse()`'s space-join produces `…got "notification" A Canvas file is the eleven-section document…`. Two sentences run together in a model-facing string.

### Outstanding — Claude Desktop

Not run: Desktop is a GUI that needs a config edit and a restart, and the lines below are things to see rather than assert. Everything the protocol can prove about them is green above — the `--root`-on-a-plain-folder shape, the prompt's arguments, its completion values, and the `-32602` on a bad path.

1. Put the README snippet into `~/Library/Application Support/Claude/claude_desktop_config.json` **as written**, with `--root` on a folder that is not a repo, and restart Desktop.
2. Confirm the four tools appear, and that **Review a canvas** appears as a slash command.
3. Type the slash command and confirm the `path` argument offers the discovered canvases as completions.
4. Run the review and confirm it comes back with what is missing and the open questions put back to you — not answered.
5. Note whether Desktop, like Claude Code, shows only the structured JSON for `bcc_list_canvases` and `bcc_write_canvas`. If it does the same thing, finding 1 is a property of the protocol's reception rather than one host's choice, and the follow-up ticket gets much sharper.

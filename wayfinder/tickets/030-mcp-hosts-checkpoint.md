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
3. **The digest saves less than the README claims — fixed.** Measured across the committed examples: 49% of the file on `order-fulfillment`, 54% on `appointment-scheduling`, 59% on `notifications`, 60% on `royalty-distribution`, **67% on the densely-filled draft** — 54% over the four together. [mcp-tools-and-resource](wayfinder/tickets/028-mcp-tools-and-resource.md)'s 48% was one canvas, and a well-filled canvas is the case that matters. Both copies of the claim now read *"a third to a half shorter than the file"* with the fuller-canvas caveat: `mcp/README.md` and the `view` description in `tools.ts`, which is the same sentence in front of the model. The measurement is characters, not tokens, so the wording no longer says tokens.

**Copy nit — fixed.** `parse.ts`'s detail carried no terminal punctuation, so `refuse()`'s space-join produced `…got "notification" A Canvas file is the eleven-section document…`. The full stop now goes on in one place, `notCanvas()`, rather than at each of the fourteen call sites, and it does not double one already there — the clause is what the walk produces, the sentence is what the readers join. Every reader gains by it: the MCP refusal, `readProblem`'s resource and prompt errors, and the `problem` line in a listing. The app is untouched, as ticket 026 required — it keys off `reason` alone, and `chrome/import-refusal.test.ts` still proves no fragment of the detail reaches the dialog.

### Outstanding — Claude Desktop, staged and waiting on a restart

Desktop is a GUI: the lines below are things to *see*, and no script can see them. Everything the protocol can prove about them is green above.

**Staged 2026-08-09.** The config edit is done and the root exists, so what remains is the looking.

- `~/bc-canvas-desktop-check/` — a plain folder, no git anywhere above it, holding `order-fulfillment.bcc.json`, `notifications.bcc.json` and `contexts/royalty-distribution.bcc.json`. Throwaway; delete it when the ticket closes.
- `~/Library/Application Support/Claude/claude_desktop_config.json` — the README snippet added verbatim under `mcpServers`, which was `{}`, so nothing was displaced. Backup of the original alongside the session scratchpad; reverting means setting `mcpServers` back to `{}`.
- The exact Desktop invocation (`node mcp/dist/server.js --root ~/bc-canvas-desktop-check`) was driven over real stdio against that root first: four tools in order, `review-canvas` advertising a required `path`, the listing finding all three canvases including the nested one, completion on an empty `path` offering all three by relative path, and `prompts/get` returning the embedded resource plus the instruction text. So a failure in Desktop is a Desktop failure, not a server one.

**First Desktop run — 2026-08-09, in Cowork on the project `~/Projects/focal`.** The tools load and work: Desktop reported "loaded tools, used bc-canvas integration", `bcc_list_canvases` returned, and the model rendered the section counts and the empties faithfully — "Complete (11/11)", "9/11 — missing **Assumptions** and **Verification metrics**", "no structural problems were reported". So step 2 is green for the tools, and the listing's shape survives the trip.

**Finding 4 — `--root` is fixed at config time, and Cowork's project does not move it.** The session was working in `~/Projects/focal` and got the three canvases from `~/bc-canvas-desktop-check`. That is unambiguous: `focal` contains no canvas at all, so what came back could only be the staged root. Mitchell's reaction — *"I wouldn't expect the examples to come up"* — is the finding. The README's Desktop sentence, "Desktop has no project directory to inherit, so name the folder", was written against Desktop-as-chat and is now false for Cowork: Cowork *has* a project, and the server does not follow it. One host, one root, whatever project you are standing in.

**Answered — Cowork starts a stdio server at `/`.** The `bc-canvas-cwd` entry, launched with no `--root`, errored scanning `/Library/Application Support/Apple/AssetCache`. So the working directory a host hands the server is the filesystem root, and the README's advice was right for the wrong reason: `--root` is not a convenience in Desktop, it is the only thing standing between the first listing and a walk of the whole disk. The reasoning is now corrected in `mcp/README.md`, together with the fixed-for-the-life-of-the-config property and the remedy — name the directory the canvases live under, or one entry per project under different server names.

Worth recording that the model routed around it unaided: it noticed the wrong root, said so, and switched servers. Good behaviour from the host; not a reason for the tool to need it.

**Finding 5, fixed — one unreadable directory aborted the entire listing.** `findCanvases` called `readdirSync` unguarded, so a single `EPERM` anywhere under the root threw away every canvas already found — in the tool whose own description tells the model to start there. Not a `/`-only defect: any root with a protected directory, a stale mount, or a directory deleted mid-walk had the same hole. `findCanvases` now returns `{ paths, unreadable }`, an unopenable directory stops that branch and nothing else, and the ones it stopped at are named rather than swallowed — a listing that quietly covers less than it claims is worse than a short one. Carried through `Catalog`, the `bcc_list_canvases` output schema, and one closing sentence of prose. Two tests pin it (a locked directory mid-walk, and the root itself locked); the suite is 83.

Verified against the built bundle on the failing shape: `--root '/Library/Application Support/Apple'` now lists cleanly and closes with *"2 directories could not be opened, so a canvas under them would not appear above: AssetCache/Data, ParentalControls/Users."* Script at `.scratch/mcp-hosts-checkpoint/unreadable-root.mjs`.

**Finding 6, fixed — containment was inverted for a root of `/`, and the whole disk was a bad root anyway.** The next Desktop run showed a different error in the same place: `/Library/Application Support/Apple/AssetCache/Data: outside the canvas root. Paths are relative to /`. Every path on the machine reads as outside a root of `/`, because `inside()` compared against `root + sep` and `/` already ends in one — `//`, which nothing starts with. `relative()` had the matching arithmetic bug, slicing `path.length + 1` and eating the first character. Latent since [mcp-package-scaffold](wayfinder/tickets/027-mcp-package-scaffold.md); finding 5's catch handler is what surfaced it, by calling `relative()` where an unguarded `readdirSync` used to throw first. A single `boundary()` now supplies the one trailing separator both callers need, and `openRoot('/')` is tested for containment directly — a seam that is wrong for one root is a seam nobody can reason about.

Containment being right does not make `/` a sensible root, so the second half is policy: **the server now refuses to start on the filesystem root**, naming `--root` and the folder to pass. It costs nothing — nobody keeps a project at `/` — and it fails at launch, where a reader can act on it, instead of as a first listing that never comes back. `whyUnservable()` sits beside the containment rule as a pure function, so it is unit-tested rather than driven through a subprocess; the guard fires identically on an explicit `--root /` and on the default working directory, both checked against the built bundle. Suite is 87. Both README sentences updated.

The `bc-canvas-cwd` entry has done its job — it would now refuse to start — and has been removed from the Desktop config. `bc-canvas`, on the staged root, is the one the remaining steps use.

### Second Desktop run — the listing is clean, and a review runs on the tools alone

The fixed bundle lists without error. And a free-text *"review the order fulfillment canvas"* produced a review that meets the prompt's contract without the prompt: it named what the canvas cannot enforce, and closed by asking whether to write any of it back rather than writing it. The trace was four tool calls — `bcc_read_canvas`, `bcc_explain`, `bcc_read_canvas`, `bcc_explain` — so `review-canvas` was never involved.

Two things worth keeping from it, both bearing on decisions this map already made.

- **The neighbouring-context claim pays off.** `bcc_list_canvases`'s description argues that reading a neighbouring canvas is how you learn what this context is *not* responsible for. Unprompted, the model read Notifications alongside Order Fulfillment, checked `Order Shipped` matched on both sides, and used Notifications' conformist role to argue that the outbound section is too thin — the customer-facing states it knows about and never emits. That is the day-one thesis — authoring from code, reading neighbours as context — behaving as [mcp-server-shape](wayfinder/tickets/025-mcp-server-shape.md) said it would.
- **`bcc_explain` is load-bearing in the wild.** Called twice inside one review, unasked. The SPEC §10 questions travelling in the tools rather than being reconstructed by the model is the reason this is a server and not a skill, and this is the first evidence of it happening outside a script.

**Finding 7 — the prompt has a discovery problem, not a quality problem.** The obvious way to ask for a review is to ask for one, and asking for one does not invoke `review-canvas`. Everything the prompt guarantees — the embedded resource, the prohibition on answering the questions — the model reached anyway from the tool descriptions. So the prompt's remaining value is the parts free text does not reproduce: a fixed contract that does not depend on the model being strong that day, and a slash command a human can find without knowing what to type. Both are real, and neither is what it was sized on. Input for the workshop ticket, not a change here.

Remaining, by hand — one line, and it is the last one:

1. ~~Restart Desktop.~~ Done, twice — the second time on the fixed bundle.
2. ~~Confirm the four tools appear.~~ Done, and driven.
3. **Type `/` in Desktop and look for "Review a canvas".** If it is there, run it and confirm the `path` argument offers the three canvases as completions. If Cowork does not surface MCP prompts as slash commands at all, that is the answer and it is worth as much — record it and the map closes on it, since the protocol side is already green.
4. ~~Run the review.~~ Done on the tools path, above; the prompt path is what step 3 settles.
5. Note whether Desktop, like Claude Code, shows only the structured JSON for `bcc_list_canvases` and `bcc_write_canvas`. The first Desktop screenshot showed the raw `{"canvases":[…]}` object, which is consistent with it — one confirmation that the prose block never arrives makes finding 1 a property of the protocol's reception rather than one host's choice.

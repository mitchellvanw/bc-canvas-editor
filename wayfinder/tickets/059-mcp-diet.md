---
name: mcp-diet
title: "Grilling: what is left for the server once the filesystem has a CLI?"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: [workshop-drive, bcc-cli]
---

## Question

The same question the rest of this map asks, from the other end. With a CLI in the repo and Claude Desktop out of scope for now, what does an MCP server still do that only an MCP server can?

**The measurement** (charting, 2026-08-13, by driving the committed bundle over stdio): `tools/list` costs **3,526 tokens**, standing, every session, whether or not a canvas is ever touched.

| Tool | ≈ tokens | Share |
|---|---|---|
| `bcc_write_canvas` | 2,978 | 85% |
| `bcc_read_canvas` | 225 | 6% |
| `bcc_explain` | 205 | 6% |
| `bcc_list_canvases` | 115 | 3% |

For scale, a whole canvas costs 283–470 tokens as a digest — so the standing tax is eight to twelve canvases' worth of context. Of the write tool's 2,978, roughly 1,340 is generated vocabulary text, and 403 of that is the relationship one-liner block emitted **twice, byte-identically**, once for inbound and once for outbound.

### What the map has already settled

- The ticket **may propose the full re-shape** — server becomes the resource, `bcc_read_canvas` and `bcc_explain`; listing and writing become `bcc ls` and `bcc write`. Scoping it narrower now would decide the interesting question by declining to ask it.
- **The plugin's procedure moves in this ticket, not a follow-up.** [workshop-shape](wayfinder/tickets/031-workshop-shape.md) set the seam as server-owns-content, plugin-owns-procedure, so a tool moving to the CLI *is* a procedure change. Both skills name `bcc_write_canvas` and `bcc_read_canvas view:'json'` in nearly every step; `canvas-reviewer` names two tools. Splitting the rewrite out would leave the plugin instructing a tool that does not exist for as long as the second ticket sat open.

### What it has to weigh

1. **`bcc_list_canvases` cannot be replaced by the resource, and this is the trap.** `bcc://canvas/{+path}` already has `list`, path completion, and serves the digest and exact bytes under one URI — but resources are **application-driven** ([mcp-server-shape](wayfinder/tickets/025-mcp-server-shape.md) decision 10). A person attaches one. A self-directed agent drafting from code cannot count on one being there, and "read the neighbouring canvas first" is the most valuable instruction in both skills. The replacement for the tool is `bcc ls` over Bash, not the resource.
2. **What survives the substitution.** In Claude Code, `bcc_list_canvases` ≈ `Glob`, `bcc_read_canvas view:'json'` ≈ `Read`, `bcc_write_canvas` ≈ `Write` plus `bcc check`. What no filesystem tool replaces: the **digest** (a rendering, not a read), the **vocabularies at the moment of the pick**, the parser's **path-carrying refusal**, **canonical byte identity**, and **empty-section accounting**.
3. **Decision 13 is what a vocabulary cut reverses**, and it had a real argument: the write schema makes the vocabularies *unskippable*, and *"a model confident enough to guess won't call `bcc_explain`, and a wrong-but-legal `conformist` is the failure this server exists to prevent."* Weigh against the fact that the tool is now three times the size that decision priced it at — `schema.ts:8` still says "about 400 tokens"; measured, the vocabularies alone are ~1,340.
4. **The cheap fix, and the one that does not work.** Hoisting the duplicated relationship block to a shared constant the way `explain.ts` does with `LANE_VOCABULARY` changes **nothing** in the emitted schema: Zod's default is `reused: 'inline'`, and the SDK converts with no `reused` option and no hook on the `inputSchema: <zod>` path. Forcing `$ref` means leaving Zod for the SDK's `fromJsonSchema()`, which swaps in ajv, changes the refusal path a model reads from `canvas.inboundCommunication.0.messages.0.type` to ajv's slash form, breaks `tools.test.ts:272-273`, and drops the typed handler destructuring. What *does* work is prose: `lane()` already takes `direction`, so emit the pattern list on the inbound lane only and have the outbound describe point at it. ~350 tokens, `properties` tree and every `.enum` structurally identical, `tools.test.ts:104-120` untouched.
5. **What `workshop-drive` found.** Its observations 1 and 5 — whether whole-document write loses or alters rows across eleven cycles, and whether read-before-write is honoured or silently skipped — are direct evidence for whether writing through a model is sound at all. This ticket is blocked on it for exactly that reason. If it found `bcc_write_section`'s trigger, that fires as its own map and this ticket has to say how the two relate.

### The costs of any cut

`mcp/dist/server.js` is committed and byte-diffed against a fresh build, so every change is source plus a rebuilt 1.2 MB bundle. Three tests pin the exact tool names and order (`tools.test.ts:84-89`, `server.test.ts:29` asserted in both protocol eras). And the tools cross-reference each other in **result text and refusals** — `errors.ts:51,55,67`, `tools.ts:61,178`, and `bcc_explain`'s own output — which is easier to miss than the descriptions and is where a removal actually cascades.

Done when the server's shape is settled with reasons, the plugin's skills and agent match it, `mcp/README.md` and the root README describe the server and the CLI as one story, both suites are green and the bundle is rebuilt.

## Resolution

**Built. The server is a resource and two read-only tools, and `tools/list` fell from
3,915 tokens to 433** — an 89% cut, measured by driving the old and new bundles over stdio
the same way, so the comparison is one method against itself rather than this ticket's
estimate against the charting note's 3,526.

| | before | after |
| --- | --- | --- |
| `bcc_write_canvas` | 3,308 | — |
| `bcc_read_canvas` | 250 | 204 |
| `bcc_explain` | 228 | 228 |
| `bcc_list_canvases` | 128 | — |
| **`tools/list`** | **3,915** | **433** |

### 1. The motivation is coherence; the tax was the evidence

The ticket leads with tokens, and the resolution deliberately does not. 3,526 against a
prompt cache is real and not painful. What was actually wrong is that a developer had a CLI
that lists, checks, formats and renders, and a server that lists, reads and writes, and the
two overlapped on listing — **two front doors to one filesystem**. The token figure is what
made the write tool indefensible *given* that, not a cost worth restructuring for on its
own. The sentence the whole cut produces: **the server is how a canvas gets into a
conversation, `bcc` is how one changes on disk.**

### 2. The server survives because of the resource, and that was measured

[mcp-server-shape](wayfinder/tickets/025-mcp-server-shape.md) decision 3 said *"If Claude
Code were the only target, the skill would be the right answer"* — and with Desktop out of
scope, Claude Code **is** the only target, so the server's own reasoning pointed at its own
dissolution. It survives on one capability with no Bash equivalent: a *person* attaching a
canvas, with path completion.

That rested on a host behaviour worth checking rather than assuming, because
[anthropics/claude-code#3122](https://github.com/anthropics/claude-code/issues/3122) reports
resource **templates** are not `@`-mentionable. Driving the committed bundle: `resources/list`
answers with **four concrete URIs**, not the template — `bcc://canvas/order-fulfillment.bcc.json`
and friends, each with title and description — because the template is registered with a
`list` callback. Template expansion is never on the path. `completion/complete` returns all
four. The justification holds on evidence.

`tools.test.ts` and `server.test.ts` both pin this now, the second over the real wire out of
the committed bundle, because it is the load-bearing property of the surviving server.

### 3. What went, and what it cost

- **`bcc_write_canvas`.** Its replacement is not the `bcc write` the ticket assumed — there
  is no such subcommand and none was added. It is the host's own file tools followed by
  `bcc fmt`, which rewrites canonical bytes and refuses anything that is not a Canvas file,
  so the parser gate the write tool provided survives one command later.
- **`bcc_list_canvases`.** `bcc ls` absorbs it, and needed one thing to do so: the **purpose
  line**, which is what makes a listing usable for *choosing* a neighbour rather than merely
  counting. Two tests pin it, including that an empty purpose prints no line.
- **`view: 'json'`.** It existed to hand bytes back to the write tool. The honest cost,
  recorded rather than waved past: `readCanvas` also migrates a v1 file and extracts the
  canvas from a 226 KB `.bcc.html`, and `Read` does neither well — so the param was
  redundant for the common case, not all cases. The resource still serves both contents
  under one URI for anyone who wants bytes.
- **`review-canvas`.** Dropped, and for the seam reason rather than the unobserved one:
  `body()` was fourteen lines of pure facilitation procedure (*"ask, don't fill in"*,
  *"leave the questions open"*) living in the server, and
  [workshop-shape](wayfinder/tickets/031-workshop-shape.md) fixed the seam as *server owns
  content, plugin owns procedure*. **Never having been invoked is not evidence it was
  useless**, and that argument is deliberately not used;
  [workshop-drive](wayfinder/tickets/034-workshop-drive.md)'s observation 6 is answered by
  re-deciding the question, not by the silence. `prompts` leaves the declared capabilities.
- **The ticket's "cheap fix" (weighing item 4) is resolved by removal.** The duplicated
  relationship block lived in the write schema; there is no write schema. `explain.ts`
  already hoists `LANE_VOCABULARY` and pays it **per call, on demand**, which is correct
  there — inbound and outbound are two separate teachings a model asks for one at a time.
  Nothing was hoisted and nothing needed to be.

### 4. Three of four refusals collapsed into `readProblem` — the ticket did not see this coming

`errors.ts` was built on a three-part contract: name what went wrong, say what would have
been legal, **name the tool that gets there**. Two branches ended at `bcc_list_canvases`.
The server cannot replace that with `bcc ls`, having no way to know whether `bcc` is
installed beside it, and a refusal naming a command that may not exist is worse than a
shorter one — so **the contract genuinely narrowed**, and recovery moved to the plugin,
which does know what is on the machine.

What fell out was not in the plan: with the third sentence gone, `outside-root`,
`unreadable` and `newer-version` became **byte-identical to `readProblem`**, the function
[fs-seam](wayfinder/tickets/061-fs-seam.md) moved across the seam one ticket earlier for
exactly this. `readRefusal` is now `readProblem` plus one addition on `not-canvas`, the only
branch with somewhere left to send the model. `newer-version` also loses *"nothing was
changed"* — which fs-seam kept here on the grounds that **only a write surface can promise
it**. This is no longer a write surface, so it can't, and doesn't need to.

### 5. The read-only consequence is stated, not discovered

A bare MCP host with no plugin and no `bcc` can now find canvases, read them and learn the
method, and **cannot create or change one**. Desktop is the concrete case: no shell, so no
`bcc`, so the workshop and drafting skills cannot write there. That is in `mcp/README.md`'s
Desktop section in those words. The map's *"not Desktop is dead"* holds — this ticket's
answer is what gets revisited if it returns, exactly as the map says.

### 6. The plugin

Both skills move listing to `bcc ls` and writing to file-tools-then-`bcc fmt`, and both gain
the not-found hedge `canvas-workshop` already had for an absent server. The vocabularies
survive the loss of decision 13's unskippability argument by moving into procedure —
justified by [workshop-drive](wayfinder/tickets/034-workshop-drive.md) observation 5, which
measured **6 writes against 7 reads, perfectly alternating**, a discipline written in a
*skill* and honoured without a schema enforcing it.

`canvas-workshop`'s Close **keeps its own review** rather than dispatching the reviewer, and
the two now name each other's job instead of quietly overlapping. The argument is
provenance: the facilitator was in the room and knows which rows the human said and which it
drafted — which is exactly how observation 2 came out green — and **a Canvas file does not
record that**, so a fresh reviewer is *weaker* after a workshop, the opposite of the
intuition. `canvas-reviewer` says so about itself: it is the reviewer for a canvas nobody is
currently facilitating.

### 7. Calls this ticket did not make, and I did

Recorded because they were mine, not asked for:

1. **`readRefusal` collapsing into `readProblem`** (§4). The decision taken was "drop the
   third sentence"; the collapse was found while building it.
2. **Dropping *"nothing was changed"*** from `newer-version`, reversing a call
   [fs-seam](wayfinder/tickets/061-fs-seam.md) made explicitly.
3. **`catalog()` losing `problems`, `unreadable` and `sections`**, and with them a decision
   nobody put to anyone: an unreadable file is now **left out of the resource listing**
   rather than reported in it, because that listing feeds a picker and an entry that fails
   on attach is worse than an absence. `bcc ls` is where unreadable files are named. This
   also **corrects my own answer** to the ticket's Q8 — I said `catalog.ts` mostly dies; it
   does not, it is the load-bearing piece of the surviving server.
4. **`bcc fmt` rather than `bcc check`** as the skills' post-write gate — `fmt` refuses a
   non-canvas *and* canonicalises, so it is one command doing what the write tool's parser
   gate did. `check` is the whole-root pass.
5. **Two invented tests**: a `readOnlyHint` assertion over every tool so a write tool
   reappearing has to argue for itself, and a loose `tools/list` size floor against
   re-accretion. Neither was asked for.
6. **Keeping `mcp/README.md`'s Desktop section** rather than deleting it under "cut as if
   Desktop is gone", reframed around what Desktop still gets.
7. **Doc comments in `src/lib/model/sections.ts` and `src/lib/fs/read.ts`** rewritten — app
   -side files naming departed tools, beyond the named scope.
8. `bcc_read_canvas`'s new description advertising **v1 migration and artifact reading**,
   which the old one did not.

`docs/research/mcp-server.md` is left untouched: it is a dated research artifact recording
what was surveyed before the server was built, not a description of what exists.

### 8. Measured along the way

- **`npx --yes github:` caches**: 9.6s first call, **1.8s** second. So the ticket's option
  (b) — naming the full `npx` spec in every skill step — was mechanically viable after all.
  Plain `bcc` still wins, but on readability alone, and the cost argument that would have
  forced it does not exist. Recorded so the reason is not remembered stronger than it is.
- **Byte-identity did not move out of the suite, only out of this package.** The read-then
  -write round trip over every example went with the write tool; `bcc fmt --check` over
  `examples/` (`cli/src/bcc.test.ts`) and export → import → export (`parse.test.ts`) hold
  the same property where the writing now happens. `mcp/README.md` says where.

### 9. Green

Root suite **506 passed**, MCP suite **36 passed**, `svelte-check` **425 files, 0 errors**,
and `tsc --noEmit` clean on cli, remark, vscode and mcp. All five committed bundles rebuilt
in order — `src/lib/fs/read.ts` and `src/lib/model/sections.ts` are inlined into four of
them — with the staleness byte-diffs green. `remark/dist` and `vscode/dist` came back
unchanged, which is the correct answer for a doc-comment-only edit.

SPEC needed **nothing**: its three server mentions are `bcc_explain`, the digest renderer
and the *"Digest is MCP jargon"* rule, all of which survive. `CONTEXT.md` rewrote **Canvas
root** (surface-neutral, and carrying [fs-seam](wayfinder/tickets/061-fs-seam.md)'s
bound-on-the-walk justification) and **Plugin** (procedure is now its whole cargo), and
added no new term — which is what a simplification should look like in a glossary.

### What this hands forward

[render-checkpoint](wayfinder/tickets/060-render-checkpoint.md) leg 8 is the only thing that
can close the loop: `tools/list` re-measured against the rebuilt bundle (433, above), the
resource still reachable, and **the skills driven once in Claude Code**. That last one is
the leg that matters most now, because the write path is new and has never been run by a
model — the workshop's `bcc fmt` step and the loss of the write tool's *"nothing came out
under…"* nudge are both unobserved, and the checkpoint is where they get observed rather
than assumed.

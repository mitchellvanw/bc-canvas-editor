---
name: committed-images
title: "Grilling: the committed .bcc.svg, and what keeps it current"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: [github-svg-probe, renderer-shape]
---

## Question

GitHub has no fence route for anyone, so a committed image file is the whole surface. [github-svg-probe](wayfinder/tickets/049-github-svg-probe.md) says whether that file can be an SVG carrying the real sheet or has to be a screenshot; this decides its form and, harder, what keeps it from going stale.

### Inputs from [github-svg-probe](wayfinder/tickets/049-github-svg-probe.md), settled before this ticket opens

**The font question is green** — measured against three in-the-wild specimens carrying `foreignObject` plus a base64 `@font-face` on github.com today, at 300+ KB, plus our own 204,714-byte artifact under GitHub's live CSP in three engines. GitHub does not sanitize committed SVG files: `<script>` payloads come back byte-identical. So SVG is the form, PNG does not have to be, and Playwright stays out of the chain. Three constraints ride along:

1. **A nested `<svg>` inside `<foreignObject>` does not render through `<img>`** — in any engine. The bytes survive; nothing is drawn. That costs the four collaborator-kind glyphs and the footer legend's key icons, and because `CanvasSheet.svelte:166-168` marks the icon `aria-hidden` with the label in an `sr-only` span, **the glyph is the only visual carrier of collaborator kind** (SPEC §4.2's closed set). A sighted reader of the committed SVG loses that axis entirely. This is the first real decision of this ticket, not an implementation detail: convert the icons to something that survives (a `data:` background-image, a `mask-image`, an inline glyph font), promote the `sr-only` label to visible text in this rendering only, or accept the loss and say so. Note that anything which makes the SVG's sheet differ from the editor's sheet has to answer to the map's identity gate.
2. **Keep `xmlns="http://www.w3.org/2000/svg"`** — the `https://` spelling drops the file into the blob view's re-serialization path.
3. **The raw URL is a different surface** — opened directly the SVG is a top-level document, `default-src 'none'` is enforced, and the embedded fonts *are* blocked. README and blob view use `<img>` and are fine. Document it, or a future reader will file a bug against the fonts.

And one input about scale rather than size: an `<img>`-loaded SVG scales geometrically instead of re-laying out, so at 1440px it renders in GitHub's ~896px README column at 0.622 — body text at 10.0 CSS px, the classification sub-labels at 5.7. Authoring nearer 1100px lifts the smallest label back over 7px. Decide the width deliberately rather than inheriting SPEC §9.2's 1440, which was chosen for a full-window document.

### The form

- **SVG or PNG**, on 049's evidence. SVG wraps the same HTML the renderer already emits, so it needs no browser; PNG needs real layout and therefore Playwright, putting a browser back into a chain built to avoid one. Measured during charting: ~200 KB per sheet as SVG against 377–891 KB as 2× PNG, and in git the SVG's font payload is byte-identical across canvases so delta compression collapses it — 152 KB for four sheets against 1,472 KB. If 049 came back with fonts stripped, this reverses and the ticket is about PNG instead.
- **Fonts inlined per file, or not at all?** External font loads do not survive an `<img>`-loaded SVG sandbox, so the choice is embedded or system-stack. Embedded is ~170 KB of every file; the delta-compression argument above says the repo barely notices, but a diff viewer does.
- **Where does it sit** relative to the canvas — beside it as `<name>.bcc.svg`, or in a generated directory? And is it committed at all, or generated in CI and never tracked? Committing it is what makes it render on github.com; not committing it means the README is broken for anyone browsing the repo.
- **The `.bcc.` family.** SPEC §3.4 fixes `<slug>.bcc.{json,html,png,md}` and `ExportKind` is a union the compiler walks. Does `svg` join that family, and does the *editor* gain an SVG export alongside it, or is this a CLI-only artifact? A file family that means one thing in the app and another in the CLI is the kind of drift this project spends real effort avoiding.

### The staleness problem, which is the actually hard part

A generated file committed beside its source goes stale silently — the canvas changes, the image does not, and the README shows last month's canvas with no indication it is lying. Options, none free:

- **Pre-commit hook** — catches it at the moment of change, but only for people who installed the hook, and it puts a render in everyone's commit path.
- **CI check** (`bcc render --check`, the `fmt --check` shape) — cannot be skipped, and fails *after* the commit, which is the right time for a check and the wrong time for a fix.
- **CI regeneration** — commits on the author's behalf, which this repo has no precedent for.
- **Nothing; regenerate by hand.** Honest, and wrong within a month.

There is a precedent worth reading before deciding: `mcp/dist/server.js` is a committed generated artifact and `server.test.ts` byte-diffs it against a fresh build, so a stale bundle fails the suite rather than shipping. That is the CI-check shape, already load-bearing here, and it argues for consistency.

Also decide what a **stale image looks like to a reader** if it happens anyway — this is the failure mode with the highest cost, because it is the only one nobody notices.

Done when the file's form, location, family membership and freshness mechanism are settled, and [render-checkpoint](wayfinder/tickets/060-render-checkpoint.md) has a staleness condition it can actually test.

## Resolution

**A `<name>.bcc.svg` sits beside its canvas, carries the same sheet every other surface draws, and is kept current by re-rendering it and diffing the bytes — a check that needs no browser and no measurement.** The ticket's hardest question turned out to be a question it did not ask: `sheetSvg` takes its height from the caller and nothing headless can supply it, which the 049 probe solved by launching Chromium (`build-svg.mjs:39-47`). The answer is to split the two jobs — **a browser measures, Node reproduces** — after which the staleness guard, the part that has to run anywhere, needs neither.

### The contract, in one place

```
form         <name>.bcc.svg beside <name>.bcc.json. Committed. Path-general.
width        SHEET_WIDTH (1440) *including* the 40px frame — a 1360px content
             box, the same box sheetDocument and the PNG mount lay out in.
height       from the caller. A browser measures it; Node only reproduces it.
fonts        the eight WOFF2 faces base64'd in. `*.bcc.svg -diff` in .gitattributes.
glyphs       xmlns on the sheet's one <svg>. Nothing else about the sheet moves.
family       joins ExportKind and SPEC §3.4. One-way — Import… never takes it.
authoring    editor: Export ▸ SVG image. CLI: `bcc render --svg`, driving an
             already-installed Chrome via playwright-core channel:'chrome',
             or `--height` when there is none.
check        `bcc check`: re-render at the file's own declared height, byte-diff.
             Absent is silent. Unparseable is a refusal, not "stale".
reader       nothing in the image says it is stale; the README image links to
             the .bcc.json beside it.
```

### The fourteen decisions

**1. 049's first constraint was misdiagnosed, and it costs one attribute to retire.** The finding on record is that *a nested `<svg>` inside `<foreignObject>` never draws through `<img>`, in any engine*. Probed directly (`.scratch/committed-images/`), that is not the rule. The rule is that an `<svg>` **with no `xmlns`** never draws: `foreignObject` content is XHTML, where an element with no namespace declaration inherits its parent's, so an undeclared `<svg>` is an *XHTML* `svg` element and not a drawing at all. `CanvasSheet.svelte:130` writes it the HTML way, without one. Adding `xmlns="http://www.w3.org/2000/svg"` makes it render in Chromium, Firefox and WebKit (`xmlns-probe-*.png`).

The alternatives were probed in the same pass and all of them are worse or dead: **every `data:` URI route renders nothing** — `background-image`, an HTML `<img>`, `content:` — because an `<img>`-loaded SVG blocks external resource loads, which is the same sandbox rule that forces the fonts to be embedded. `mask-image` works in all three engines and was the recommendation until the attribute explained itself; it is now the expensive way to buy what one attribute gives, and it would have cost `KIND_META` its stroke paths and the icons their `currentColor`.

**2. The fix lands in `CanvasSheet.svelte`, not in `sheetSvg`.** Patching the container would make the committed image a different rendering from the editor's, straight into the map's identity gate; patching the sheet makes every surface move together and leaves nothing for the gate to answer. This is [headless-renderer](wayfinder/tickets/054-headless-renderer.md)'s `sr-only` move again, for the same reason. The sheet has **exactly one `<svg>` and one `@html`**, both in the `kindIcon` snippet, so this covers the four lane glyphs and the footer legend keys in one edit. Nothing is promoted from `sr-only`, nothing is converted, and SPEC §4.2's closed set keeps its only visual carrier.

**3. The width is `SHEET_WIDTH`, and the image carries the page frame — which is a bug fix, not a preference.** `FRAME_CSS` (`module.ts:108-110`) is documented as *"the page frame both file containers draw the sheet in"* and `sheetSvg` does not use it. `sheetDocument` puts the markup in a `<main>` at `max-width: 1440px; padding: 40px`, and with the renderer's scoped `border-box` that is a **1360px content box**; `offscreen.ts:31-32` gives the PNG mount the same pair. A bare `<div>` at 1440 lays the sheet out **80px wider than every other surface** — different wrapping, a genuinely different sheet, and a drift no test we have would catch. `sheetSvg` draws in the same frame; the comment becomes true; the cream margin SPEC §9.2 already promises the PNG comes free, and stops the image reading as clipped against GitHub's white.

1440 over the ~1100 the ticket floated: the responsive tiers are inert here (SPEC §9.2 — only the editor's `<main>` declares the container), so 1100 would not get the designed trim tier, it would get the desktop twelve-column grid squeezed into a width nothing was drawn for — a fifth rendering no other surface has. At GitHub's 0.622 the sheet's body text lands at 10.0 CSS px and reads; the classification sub-labels at 5.7px are the real cost of this decision and are paid knowingly, against a blob view one click away at full size.

**4. Fonts are embedded, and `*.bcc.svg` is marked `-diff`.** External loads do not survive the `<img>` sandbox (decision 1's rule again), so the choice was embedded or the system stack — and the system stack makes the committed image visually a different sheet from every other surface, unfixably, since Archivo and Source Serif cannot be shipped to a reader's machine. The repo cost was measured away during charting: the font payload is byte-identical across canvases so git's delta compression collapses it, 152 KB for four sheets against 1,472 KB of PNG. The only live objection was the diff viewer, and one `.gitattributes` line answers it.

**5. Path-general, beside the source, committed.** `bcc render` emits an image next to any canvas in any checkout, not just this repo's four examples. The alternative — this repo only — would retroactively strand [cli-home](wayfinder/tickets/051-cli-home.md), which took the foreign-`npx` reach *specifically* because "committed-images's staleness guard needs something a hook in another repo can call". Flat beside the source over a generated directory, because the whole point is that a README two lines away references it, and a generated directory is a place people learn to ignore. Committed, because uncommitted is a broken README for everyone browsing the repo.

**6. Staleness is a re-render and a byte-diff, at the height the file itself declares.** Three mechanisms were live: a recorded hash of the source, the canvas JSON embedded the way `.bcc.html` embeds it (`embed.ts`), or a full re-render diff. The first two miss a whole drift class — **when the renderer changes, every committed image is stale and neither notices** — which is not hypothetical, since this very ticket changes the sheet.

The re-render looked blocked on the height, and the objection dissolves: the declared height is only ever used to *reproduce* a render that is then judged by comparison, never trusted. Clipping cannot silently persist, because clipping only arises from content growth and content growth fails the diff first. So the check parses `height="…"` out of the file under test, renders, and compares — **pure Node, no measurement, no browser, no new metadata and no schema change**. It is `server.test.ts:74-82`'s mechanism, already load-bearing on `mcp/dist/server.js`, applied to a second committed artifact.

This is also the asymmetry that keeps SVG ahead of PNG now that decision 9 admits a browser into authoring: **SVG's check runs in plain Node; PNG's never could.** 049's cost argument for SVG has weakened; this one replaces it and is stronger.

**7. The trigger is `bcc check`, and this repo's suite calls it — not a hook we ship.** Two audiences, one implementation. [bcc-cli](wayfinder/tickets/055-bcc-cli.md) already plans a `check` subcommand; it grows an SVG leg. In this repo the precedent is a **vitest byte-diff**, because there is no CI here to put a check in — `.github/workflows` does not exist. A foreign repo can wire a pre-commit hook through the `npx` reach if it wants one, but we do not ship one: it only protects people who installed it, and it puts a render in everyone's commit path. Failing loudly after the fact is the right time for a check when the fix is one command away.

**8. An absent image is silent; an unparseable one is a refusal, not "stale".** `bcc check` will meet canvases with no `.bcc.svg` beside them in every checkout that never asked for one, and a check that fails on those is a check people turn off — the CLI cannot know whether a repo wants images. The malformed case needs its own answer rather than falling into either bucket: if the file is there but its `height="…"` cannot be read, the check cannot reproduce it and says so, in `readProblem`'s path-first shape, rather than guessing at "stale".

**9. A browser measures; Node reproduces.** Only the first render and each refresh need a real measurement. The editor gets it for free — `png.ts:45` already does `getBoundingClientRect` on the offscreen mount — so **the editor gains an SVG export**. For the CLI, `bcc render --svg` drives an **already-installed Chrome** through `playwright-core`'s `channel: 'chrome'`: ~3 MB of dependency and **no browser download**, so `npx --yes github:…` stays viable, with a clear refusal when no Chrome is found and `--height` as the escape hatch.

This does put a browser back into the authoring chain 049 built to avoid one, and that is said out loud rather than buried. What it does not do is put one into the *check*, or into a hook, or into anything that runs more than once per content change. The genuinely browser-free alternative — never measure, use an over-tall height and transparent slack — is rejected: slack is a blank band under the sheet in every README that carries one.

**10. `svg` joins the family and `ExportKind`, one-way, fourth in the Export menu.** The ticket named the failure it was avoiding — "a file family that means one thing in the app and another in the CLI is the kind of drift this project spends real effort avoiding" — and with the editor exporting SVG there is no side door left to justify. It is **one-way like `.bcc.md`**: decision 6 declined to embed the JSON, so there is nothing for an importer to read back, and Import… keeps its two extensions. Menu placement follows SPEC §10's own stated logic — the first two entries are the ones Import… takes back, the last two are the ones it does not, and Markdown is last deliberately — so SVG goes **between PNG and Markdown**, inside the second group, displacing nothing. The label is **"SVG image"**: the format's own name and nothing else, the rule that produced "PNG image (2x)", where `(2x)` earns its place as a real property SVG has no equivalent of.

**11. Nothing in the image says it is stale; the README's image links to the canvas.** This is the ticket's highest-cost failure — the only one nobody notices — and the instinct to render a date or version stamp into the sheet is wrong twice over: it would appear on *every* surface, including the editor's live canvas, where it would be a permanent claim about a file that may not exist; and it is the identity gate cutting the other way. A hash in metadata is invisible to precisely the reader this question is about. What helps costs nothing: the README image is wrapped in a link to the `.bcc.json` beside it, so a reader who suspects the sheet is old is one click from the source of truth. The check is the mechanism; the link is the recourse.

**12. PNG does not ship in the CLI, and its fog entry is rewritten rather than closed.** Decision 9 collapsed PNG's marginal cost — the browser is in the authoring path anyway — but the demand argument never existed. Its stated audience is non-web rasterizers and PDF pipelines, neither of which is a caller today, and the human case is already served by the editor's own PNG export. Shipping it would add a second committed-artifact family whose check cannot run in Node (decision 6), quietly weakening the one property that makes committed images safe. Sharpened trigger for the map: **a caller that consumes canvases and is not a web engine.**

**13. The README shows one image — Order Fulfillment — and the other three keep their links.** Four full 1440px sheets stacked is a wall; the README already calls Order Fulfillment the one with "every section of the canvas filled", so it is the specimen that shows the most canvas per screen. All four still get their `.bcc.svg` committed: the blob view renders them for anyone browsing `examples/`, and the check needs four files to check rather than one. This also makes the README the real test of decision 3 — if 0.622 turns out to be unreadable in practice, the evidence arrives on the front page of the repo rather than in a scratch directory.

**14. SPEC gains §9.3, and the `xmlns` gets a regression assertion.** Several constraints here are invisible until they fail: the `xmlns` (an icon silently vanishes), 049's raw-URL caveat (opened directly the SVG is a top-level document under `default-src 'none'` and the embedded fonts genuinely *are* blocked — someone will file a bug against it), the fixed width, the embedded fonts, and one-way membership. **§9.3 "SVG artifact" is the only place they are stated**, beside §9.1 HTML and §9.2 PNG; §3.4's family line and §10's menu entry gain their strings; `sheetSvg` and `kindIcon` carry one-line pointers rather than restating anything. The `xmlns` additionally gets an assertion in `render.test.ts` next to the XHTML-shape guards already there (`render.test.ts:191-197`) — a prose rule about an attribute whose effect nobody can see is a rule that gets refactored away. And the SVG carries the **CC BY comment** the `.bcc.html` source already carries: the rendered footer alone satisfies the obligation, but this is the family member most likely to travel alone, and a source-level attribution is exactly what that case is for.

### Corrections this resolution owes

- **[github-svg-probe](wayfinder/tickets/049-github-svg-probe.md) constraint 1 is wrong as written** and carries a pointer here. Its other two constraints (`xmlns` must stay `http:`; the raw URL blocks fonts) stand and are unaffected — note the coincidence that both surviving constraints and the retired one are all about namespaces and URLs, which is why the misdiagnosis was so plausible.
- **[headless-renderer](wayfinder/tickets/054-headless-renderer.md)'s closing line** — "the four collaborator-kind glyphs are missing, which is 049's nested-`<svg>` finding reproduced first-hand on our own output" — reproduced the *symptom* correctly and inherited the wrong cause.

### What this hands forward

- **[bcc-cli](wayfinder/tickets/055-bcc-cli.md)** gains three constraints rather than decisions: `render` grows an SVG output, `check` grows the staleness leg from decision 6, and `playwright-core` enters as a lazily-imported dependency the committed bundle must not inline. The flag spelling is 055's to settle.
- **A new task ticket** carries the build, because the work here is not CLI work: the sheet's `xmlns`, `sheetSvg`'s frame, the editor's fifth export, SPEC §9.3, four committed files and the README.

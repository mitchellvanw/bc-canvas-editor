---
name: artifact-views
title: "Task: the artifact carries all three views — and its first script tag"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [shared-digest-seam, view-switcher-prototype]
---

## Question

The HTML artifact grows from one rendering to three, read-only, and takes its first line of behavioural JavaScript in the process. `src/lib/artifact/html.ts` today composes a doctype, the inlined stylesheet, the serialized offscreen mount, base64 fonts and the embedded Canvas file block (`src/lib/model/embed.ts`) — its only `<script>` carries JSON, not code. That changes here, deliberately and minimally.

**All three panels are pre-rendered into the file.** The Sheet as it is serialized today; the JSON as the same bytes the embedded block already carries; the Markdown from `src/lib/model/digest.ts`, rendered at export time. No renderers ship into the artifact — that would put the digest inside every shared document and make a file depend on script execution to show its own content.

**The script is progressive enhancement over markup that already works.** All three panels are in the DOM and visible; the script's job is to turn them into a `role="tablist"` with real semantics, hide the inactive ones, and handle arrow keys and activation. With JavaScript disabled the viewer gets all three, stacked in reading order, with their headings — not a blank page and not a "please enable JavaScript" notice. Write it so the no-JS state is the honest default rather than a fallback that was tested once: the panels start visible and the script hides two of them, never the reverse.

**AA is a written commitment (§8.6)** and the tabs are new interactive elements inside it: focus visible, contrast on the tab strip against cream, the active tab distinguishable by more than colour, and the panels' heading hierarchy still coherent when two of them are hidden. The JSON and Markdown panels are mono text blocks — check their contrast and their behaviour at 200% zoom, where the single-breakpoint stack is what reflows the Sheet and the text panels need to not introduce horizontal scroll of their own.

**The visual idiom is [view-switcher-prototype](wayfinder/tickets/042-view-switcher-prototype.md)'s**, as [editor-views](wayfinder/tickets/045-editor-views.md) built it — closed: a left-aligned segmented pill in the gutter above the sheet, 4px radius, 1px `--color-line` border, 1px dividers, active segment filled ink, focus ring **inset** (`outline-offset: -2px`) and **inverted to sheet on the selected segment**, which 045 found the hard way: roving tabindex means the only tab that can hold focus is the filled one, and an inset ink ring on ink is nothing. The labels are settled — **Sheet · JSON · Markdown** — and the editor's fill softening (unfilled at rest, sheet on hover) is a *chrome-resemblance* answer that the artifact does not need: with no chrome band in the file, take the fill that reads best there and say which was chosen. It was drawn for the artifact as well as the editor, from a real export, and the artifact is where it does *better*: with no chrome band in the file, the control has nothing to be confused with. The prototype's artifact build is on branch `prototype/view-switcher` at `.scratch/view-switcher/artifact.mjs` — a working reference for the graft, not a design to redecide.

**Three things that prototype learned the hard way, so this ticket doesn't:**

- **The strip ships `hidden` and the script unhides it.** The first draft hid only the *panels* by default, which left a script-less viewer looking at three dead buttons. Ship the control hidden; the script removes the attribute as its first act. Then the no-JS state has no live-looking control in it at all.
- **Hide the strip's wrapper too, not just the strip.** C's outer bar kept its `padding-bottom` and survived as a 14px empty band above the sheet once the strip inside it went hidden.
- **A `:global` style leaks across everything that imports it.** Not artifact-specific, but it cost a debugging round in the editor prototype.

**Two edges, both settled and both easy to get backwards:**

- **The print pass prints the Sheet only.** §9.1's minimal `@media print` with clean section breaks stays exactly what it is; the two text panels are `display: none` in print. Printing the artifact is the PDF answer for the canvas.
- **The PNG is untouched.** It captures the offscreen Sheet render from title block through footer (§9.2). No tabs in the capture region, no new export, nothing to change — but the offscreen mount is shared, so confirm by looking at a PNG rather than by reasoning about it.

Size: the two text panels are kilobytes against a font-dominated 300–500KB file. Worth measuring once and stating, so it never surfaces as a surprise.

`SPEC.md` §9.1 gains the panels, the script and the no-JS guarantee; §8.6 gains the tabs. Both suites green, and a real exported artifact opened in a browser with script disabled.

## Resolution

Built. `src/lib/artifact/html.ts` composes the three panels, the strip, the View CSS and one inline script; the file is 435KB, of which the two text panels are 11.6KB. Evidence: `.scratch/artifact-views/` (a real export driven through the shipped Export path in WebKit, then opened from `file://` as a recipient would).

**The fill, which this ticket left open, is the one place the artifact parts company with the editor: it rests filled sheet.** The editor's unfilled rest was bought to soften the §6 chrome resemblance, and the artifact has no chrome band to resemble — so that purchase buys nothing there, while it costs something visible. On bare paper the 32px drafting grid runs straight *through* the control and its lines compete with the strip's own segment dividers, so the three segments read unevenly depending on where a grid line falls (`evidence/crop-fill-a-unfilled.png` against `crop-fill-b-sheet.png`, at 4× — the comparison is not subtle). Filled, the strip is one object, the grid stops at its edge, and the ink segment reads as one of three peers rather than as the only solid thing on the paper. Hover follows: it darkens to **paper**, the chrome button's own direction, which is only available here because there is no chrome. This is also where the prototype already was — `.v-strip--seg` was drawn with `background: var(--color-sheet)`, and the editor diverged later for a reason that stops at the editor's edge.

**The empty band the ticket warned about happened anyway, and the fix was to make it impossible rather than to handle it.** The first build reproduced the prototype's bar exactly — strip hidden, `barHeight: 14` in the script-less probe. Rather than teach the bar to collapse (`:has()`, or a second hidden rule to keep in sync forever), the bar is gone: the strip is `inline-flex` and carries its own `margin-bottom`, so shrink-to-fit — the only thing the wrapper was for — comes from the display mode, and a hidden strip leaves nothing behind. The probe now reports no bar at all.

**The script is subtractive, and that is the whole design.** Panels ship visible and unhidden; the script hides two, hides the labels that named them, and adds tab semantics. Three consequences worth naming:

- **The tab roles are the script's to add, not the markup's.** The panels ship as `<section aria-label="Sheet|JSON|Markdown">` — region landmarks, so the script-less stack is navigable — and the script trades `aria-label` for `aria-labelledby` on the tab and sets `role="tabpanel"`. A `tabpanel` in the markup would be a promise the script-less file cannot keep, since there would be no live tablist above it.
- **The strip is unhidden last, not first.** The ticket said first; the reason it gave was that no script-less viewer should see a live-looking dead control. Revealing it *after* the wiring succeeds honours that reason strictly — if anything above throws, the file is still the honest stack.
- **The labels are paragraphs, not headings.** §8.6 promises canvas name h1 / sections h2 / collaborators h3, and a real heading above the Sheet panel's own h1 would invert exactly that. The region landmarks carry the navigation instead.

**No new user-facing strings.** The tabs and the script-less labels are the same three words [editor-views](wayfinder/tickets/045-editor-views.md) settled — Sheet · JSON · Markdown — so there was nothing for `writing-copy` to decide. The artifact has **no Copy buttons**: the map's copy-to-clipboard is the editor's, a button here would be dead without script, and selection is the browser's own mechanism.

**AA, measured on the shipped tokens rather than reasoned about** — unselected label 7.4:1, selected label 16.5:1, panel mono text 16.5:1, script-less labels 6.1:1. The focus ring needed a pixel scan to settle: WebKit reports `:focus-visible` true after both Tab and an arrow move, and sampling the selected segment shows its first 2px go `253,253,251` on `26,30,32` — the inverted ring painting exactly as §5 specifies, at 16.5:1. (An earlier screenshot showed no ring; that was the harness clicking with the mouse first and setting pointer modality, not a defect.) The strip's outer boundary against paper is 1.20:1, below 1.4.11's 3:1 — it is §5's `--color-line`, the same hairline every panel on the sheet is drawn with, and the state that matters is carried by a 16.5:1 ink fill rather than by that edge. Filling the strip improves this rather than worsening it.

**200% zoom:** at a 700px viewport `scrollWidth === clientWidth` on all three Views. Both text panels wrap (`pre-wrap` + `overflow-wrap: anywhere`) instead of scrolling — including the JSON, where the editor deliberately chose `pre` because that box is a buffer someone hand-fixes. Nothing in an artifact is edited, so a long line is something to read. Neither pane is height-capped either: the editor capped its panes so Copy and Apply stayed reachable, and there are no buttons here to keep in reach.

**Print** hides the strip, the labels and both text panels, and shows `#view-panel-sheet` by id — so it prints the Sheet on whichever tab the viewer happens to be sitting. ~~beating the `hidden` the script may just have written.~~ **That last clause was false, and the gate caught it — see the amendment below.**

**The PNG is untouched, confirmed by looking** (`evidence/artifact.bcc.png`): title block through footer, no tabs, no label. `svelte-check` clean, both suites green (376 app, 85 MCP — MCP imports the digest, never the artifact, so no rebuild).

Two test changes, both of which had started guarding the wrong thing:

- The affordance-leak assertion (`contenteditable|data-placeholder|<button|<input`) now runs against the **Sheet panel's slice** rather than the whole file. The artifact has buttons of its own now, and the sheet is still exactly where they must not appear.
- The beacon test pinned the script list at `['<script type="application/json" data-canvas-file']`. It now pins both scripts and adds `not.toMatch(/<script[^>]*\ssrc=/)` — the real invariant was never "one script", it was "nothing here loads anything".

`SPEC.md` §9.1 gains the panels, the script, the no-JS guarantee, the fill divergence, the print rule and the size; §8.6 gains the tabs with the measured numbers and the paragraph-not-heading reason.

One thing deliberately not shared: the editor's `tablistKeydown`. The artifact imports `VIEWS` from `$lib/editor/views` so the three labels cannot drift, but the behaviour is rewritten as ES5 in a string — it ships as text and must run from a `file://` URL in whatever browser it lands in, forever, with no build step behind it.

## Amendment (reopened and fixed by [views-checkpoint](wayfinder/tickets/048-views-checkpoint.md), 2026-08-12)

**Printing an artifact while a text View was live printed a blank page**, in WebKit and in Chromium alike. Not the JSON, not a mangled sheet — nothing: `bodyHeight: 0`. The Sheet tab printed correctly, and so did a script-less file, which is why the resolution above could be written in good faith and why every test in the suite stayed green.

The claim it rested on — "beating the `hidden` the script may just have written" — is the wrong model of the cascade. The app stylesheet the artifact inlines is Tailwind's, and its preflight lays down `[hidden]:where(:not([hidden="until-found"])) { display: none !important }` inside `@layer base`. An id beats an attribute selector on specificity, but **specificity is never consulted here**: layer precedence is decided first, and it *reverses* for important declarations, so a layered `!important` outranks an unlayered one no matter how specific. The first attempt at a fix was `#view-panel-sheet { display: block !important }` — matching force with force — and it changed nothing, which is the useful part of the story. Measured, not reasoned: `.scratch/views-checkpoint/layer-probe.mjs` puts the two rules side by side in a bare page and both engines agree.

**The fix drops the fight instead of trying to win it.** The script hides inactive panels with `views__panel--off`, a class the artifact owns, and the print pass raises `#view-panel-sheet` back up on specificity alone. Nothing in the file carries `!important` now, and the print rule no longer depends on what a third-party stylesheet does with `[hidden]`. The `hidden` attribute is still exactly right for the **strip**, which nothing ever un-hides.

Nothing else about the design moves. The script stays strictly subtractive, the panels still ship visible and unhidden, and `display: none` removes an inactive panel from the accessibility tree as completely as `hidden` did — exactly one `tabpanel` is exposed at a time in both engines (`evidence/part4-a11y-tree.json`).

The unit test that let this through asserted the CSS *text* and so was true throughout. It now also pins the mechanism the print rule depends on (`.views__panel--off`, `classList.add`, no `panels[i].hidden`, no `!important` anywhere in the print block) with a comment saying plainly that only a browser can check the cascade, and naming the checkpoint that does. SPEC §9.1's print bullet carries the same reason.

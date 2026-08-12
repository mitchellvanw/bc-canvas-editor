---
name: artifact-views
title: "Task: the artifact carries all three views — and its first script tag"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [shared-digest-seam, view-switcher-prototype]
---

## Question

The HTML artifact grows from one rendering to three, read-only, and takes its first line of behavioural JavaScript in the process. `src/lib/artifact/html.ts` today composes a doctype, the inlined stylesheet, the serialized offscreen mount, base64 fonts and the embedded Canvas file block (`src/lib/model/embed.ts`) — its only `<script>` carries JSON, not code. That changes here, deliberately and minimally.

**All three panels are pre-rendered into the file.** The Sheet as it is serialized today; the JSON as the same bytes the embedded block already carries; the Markdown from `src/lib/model/digest.ts`, rendered at export time. No renderers ship into the artifact — that would put the digest inside every shared document and make a file depend on script execution to show its own content.

**The script is progressive enhancement over markup that already works.** All three panels are in the DOM and visible; the script's job is to turn them into a `role="tablist"` with real semantics, hide the inactive ones, and handle arrow keys and activation. With JavaScript disabled the viewer gets all three, stacked in reading order, with their headings — not a blank page and not a "please enable JavaScript" notice. Write it so the no-JS state is the honest default rather than a fallback that was tested once: the panels start visible and the script hides two of them, never the reverse.

**AA is a written commitment (§8.6)** and the tabs are new interactive elements inside it: focus visible, contrast on the tab strip against cream, the active tab distinguishable by more than colour, and the panels' heading hierarchy still coherent when two of them are hidden. The JSON and Markdown panels are mono text blocks — check their contrast and their behaviour at 200% zoom, where the single-breakpoint stack is what reflows the Sheet and the text panels need to not introduce horizontal scroll of their own.

**The visual idiom is [view-switcher-prototype](wayfinder/tickets/042-view-switcher-prototype.md)'s**, drawn for the artifact as well as the editor. One idiom across both surfaces; if it only works with an editor around it, that prototype was wrong and this ticket says so rather than inventing a second one.

**Two edges, both settled and both easy to get backwards:**

- **The print pass prints the Sheet only.** §9.1's minimal `@media print` with clean section breaks stays exactly what it is; the two text panels are `display: none` in print. Printing the artifact is the PDF answer for the canvas.
- **The PNG is untouched.** It captures the offscreen Sheet render from title block through footer (§9.2). No tabs in the capture region, no new export, nothing to change — but the offscreen mount is shared, so confirm by looking at a PNG rather than by reasoning about it.

Size: the two text panels are kilobytes against a font-dominated 300–500KB file. Worth measuring once and stating, so it never surfaces as a surprise.

`SPEC.md` §9.1 gains the panels, the script and the no-JS guarantee; §8.6 gains the tabs. Both suites green, and a real exported artifact opened in a browser with script disabled.

---
name: committed-images
title: "Grilling: the committed .bcc.svg, and what keeps it current"
labels: [wayfinder:grilling]
status: open
assignee:
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

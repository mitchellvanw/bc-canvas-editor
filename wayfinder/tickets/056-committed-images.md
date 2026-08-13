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

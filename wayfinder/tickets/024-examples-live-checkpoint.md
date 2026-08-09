---
name: examples-live-checkpoint
title: "Task: live checkpoint — the examples work on the real origin"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [ship-example-chooser]
---

## Question

The destination gate, run against `bc-canvas.pages.dev` on Playwright WebKit (the established checkpoint habit):

- The chooser opens; every roster canvas loads and renders correctly.
- The unexported-changes gate fires when it should and stays silent when it shouldn't; landing is clean; first edit dirties.
- An opened example exports all three formats, and the artifact-leak guarantee still holds (nothing chooser- or beacon-shaped in the artifact bytes).
- Keyboard path through the chooser works as specced.
- A `main` push still redeploys.

Resolution records the checkpoint transcript; green here closes the map.

## Resolution

**Resolved 2026-08-09. Every line green — the destination gate is closed, and with it the map.** Run on Playwright WebKit against `https://bc-canvas.pages.dev`, driving the shipped UI (no `/src` imports). Script and evidence in `.scratch/examples-live-checkpoint/` (`checkpoint.mjs`, `evidence/` with screenshots and all three exported files).

- **Chooser + roster:** the Examples menu opens with the four two-line entries — names, one-liners, and Royalty Distribution's "Captured mid-workshop." flag all verified. Each of the four canvases opened in sequence: correct `h1`, per-canvas content spot-checks render (a ubiquitous-language term and an inbound collaborator each), full-page screenshots captured. Royalty Distribution shows its mid-workshop state live: domain/evolution axes unset (—), Assumptions and Verification Metrics empty, four open questions filled.
- **Gate semantics:** every clean open was gate-silent (including the very first over the pristine sheet and example-over-example); each landed with no "Unexported changes". A title edit dirtied ("first edit dirties"); choosing another example then raised the gate with the exact ratified copy ("Opening an example replaces the canvas and clears undo history."). **Cancel** kept the edited, dirty canvas untouched; **Replace** proceeded and the next example landed clean.
- **Exports off an opened example** (Royalty Distribution — the leak-sharpest, since its flag is chooser-only copy): **Canvas file** export is the serializer bytes — byte-identical to the committed `examples/royalty-distribution.bcc.json` up to the committed file's trailing newline (`cmp` confirms that newline is the *only* difference; SPEC §3.5 defines the committed file as serializer bytes *plus* trailing newline, so this is definitional, not drift). **HTML artifact** (405 KB): the embedded canvas block equals the committed bytes exactly, and the leak sweep is clean — no "Captured mid-workshop.", no `role="menu"` chooser markup, no `cloudflareinsights`/`data-cf-beacon`, no `bc-canvas.pages.dev` reference; RD's content renders in the artifact. **PNG** valid (magic bytes, 626 KB).
- **Keyboard path** (SPEC §10 menu grammar, WebKit's Option+Tab): focus Examples → Enter opens the menu → Tab lands on a `menuitem` → Enter opens the example, clean. Reopened: Esc closes the menu and returns focus to the Examples control.
- **Main push still redeploys:** pushing this ticket's claim commit (`231bfa6`) auto-triggered production deployment `0a06e951`, green and serving HTTP 200 within ~2 minutes of the push.
- **Ride-along network audit:** the whole session touched only `bc-canvas.pages.dev` and the two `cloudflareinsights.com` beacon hosts (the one empty "host" in the audit is the script's own `blob:` download fetches — blob URLs have no host).


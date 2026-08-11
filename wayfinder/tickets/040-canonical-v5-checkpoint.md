---
name: canonical-v5-checkpoint
title: "Task: the gate — a v1 canvas through both surfaces, and the sheet held beside a printed V5"
labels: [wayfinder:task]
status: open
assignee: mitchell
blocked-by: [examples-v2-content, mcp-canonical-labels]
---

## Question

The [map's](wayfinder/map-canonical-v5.md) Destination names a three-part gate that no single ticket owns end to end. This is that gate, run once everything else has landed, in the checkpoint habit of [examples-live-checkpoint](wayfinder/tickets/024-examples-live-checkpoint.md) and [mcp-hosts-checkpoint](wayfinder/tickets/030-mcp-hosts-checkpoint.md) — evidence on disk in `.scratch/canonical-v5-checkpoint/`, WebKit via Playwright since safaridriver stays blocked.

**One: a real v1 canvas migrates and round-trips through both surfaces.** Not a fixture written for the occasion — a canvas authored before this map existed, carrying a `relationship` string and a bare-name collaborator. It must load in the app, load through the MCP server, and produce byte-identical v2 output from both. The two share `$lib/model/parse` so this should hold by construction; the point of running it is that "should hold by construction" is exactly the claim this map was created to stop making without checking.

**Two: the four examples are byte-exact at v2** through the shipped path, and a v2 HTML artifact's embedded canvas is byte-identical to the same canvas exported as `.bcc.json` (`SPEC.md:278`).

**Three: the rendered sheet, held beside a printed V5, shows the same ten panels.** This is the human half and the one that closes the Destination — the whole map exists because nobody had ever done this comparison. Render a full canvas, put it next to `resources/bounded-context-canvas-5v-blank.jpg`, and walk the ten panels. Then walk the six adopted changes and confirm each is actually there and reads as intended: `Purpose` on the panel and in the file, classification as a tenth panel with its three sub-columns, the centre column's shared box, a kind icon on every collaborator with the footer legend keying all four, both relationship ends with the ink-weight convention keyed in that same legend, and the caution ring on an anti-pattern trait. The PNG and the HTML artifact both, since the sheet is mounted offscreen for each.

**And confirm the tin is now true.** `SPEC.md:3` claims the V5 canonical layout and the title block stamps `Bounded Context Canvas · V5`. If anything found here still contradicts that, it is either fixed or written down — this map does not close with an undocumented departure in it, which is the failure it was chartered to end.

---
name: views-checkpoint
title: "Task: the gate — the byte-identity triangle and the JS-less artifact"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [editor-views, markdown-export, artifact-views]
---

## Question

The map's Destination, run as a check rather than asserted. Evidence in `.scratch/views-checkpoint/`, per the checkpoint habit; run against a production build, not the dev server.

**1. The byte-identity triangle.** For the same canvas file, three Markdown strings must be byte-identical: the app's `.bcc.md` export, the Markdown panel inside the exported HTML artifact, and `bcc_read_canvas`'s return from the MCP server. This is the one assertion that proves "one renderer" actually held rather than being three renderers that happen to agree today. Run it on all four bundled examples, and diff the bytes — do not eyeball the prose.

**2. The JSON round trip.** Document → JSON View → hand-edit a field → Apply → export. The exported `.bcc.json` is byte-identical to what a direct export of the same edit through the Sheet produces. Then the null case: Apply with nothing changed lands no commit and leaves history untouched.

**3. The migration, visible.** Paste a **v1** canvas into the box — the pre-map v1 canvas the canonical-v5 gate used is already on disk and is the right specimen — and Apply. It comes back as migrated v2 bytes **in the box**, the sheet renders the v2 document, and the export matches what importing the same v1 file produces.

**4. The artifact with JavaScript disabled.** Export an artifact, open it in a browser with script switched off. All three panels present, readable, in reading order, with their headings. Then with script on: tabs work, arrow keys move, focus is visible, and the print preview shows the Sheet alone. Do this in WebKit as well as Chromium — the WebKit checkpoint habit exists because this project has been bitten there before, and Playwright WebKit is the route (Safari's own automation is admin-gated on this machine).

**5. The dirty state.** Export Markdown with unexported changes pending; the indicator still reads **Unexported changes**. Copy from both text Views; same. Export the Canvas file; it clears. This is the check that costs a user their work if it is wrong.

**6. Green.** Both suites, `svelte-check`, and the MCP bundle staleness test — the last of which is load-bearing after [shared-digest-seam](wayfinder/tickets/041-shared-digest-seam.md) moved a module out from under it.

Anything that fails here is a defect against a ticket that already closed, so it goes back to that ticket rather than being patched at the gate. When all six are green the map is done, pending sign-off and the push.

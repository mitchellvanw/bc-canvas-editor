---
name: views-checkpoint
title: "Task: the gate — the byte-identity triangle and the JS-less artifact"
labels: [wayfinder:task]
status: closed
assignee: mitchell
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

## Resolution

Run, against `npm run build` + `vite preview` on the shipped bundle, never the dev server. Evidence and every driver script in `.scratch/views-checkpoint/`. **Five of the six were green as they stood; the fourth was not, and it took two attempts to fix — the first one looked right and changed nothing.**

**1. The triangle holds, and holds on bytes.** For each of the four examples the three Markdown strings are one SHA-256: the `.bcc.md` taken off the real Export menu, the `#view-panel-markdown` panel read back out of an exported `.bcc.html` **through a browser's DOM** rather than un-escaped by hand, and `bcc_read_canvas`'s digest from the committed `dist/server.js` over stdio (`evidence/part1-triangle.json`; the three copies of each are on disk under `evidence/triangle/` for anyone who wants to diff them again).

None of the four examples contains a `<`, `>` or `&`, so on its own that run leaves the artifact's escape-and-read-back leg untested — the only leg where the bytes are transformed and restored. A fifth specimen was built to exercise it (`edge-canvas.bcc.json`: all three characters, a literal `</script>` in the purpose, and a literal `&amp;` to catch a double-unescape). The triangle survives it, the embedded Canvas file still round-trips out byte-identically past the literal close tag, no markup leaks out of a panel as elements, and the file still holds exactly two script tags (`evidence/part1b-triangle-edge.json`).

**2. The round trip closes, and the null Apply is silent.** Hand-editing `purpose` in the box and applying produces bytes identical to making the same edit on the Sheet and exporting — same 2009 bytes, same filename. One Apply is one history entry: a single Undo returns the original purpose. Apply with nothing changed commits nothing at all — no dirty flag, no Undo enabled, no refusal, box untouched.

**3. The migration is visible where the ticket said it would be.** The pre-map v1 canvas pasted in and applied comes back in the box as v2 bytes — `version: 2`, `purpose` present, `description` gone — the sheet renders *Canvas Editing*, and the export matches importing that same v1 file through Import… byte for byte. The box's contents after Apply *are* those export bytes.

**4. The artifact with JavaScript off is exactly what was promised; with it on, printing was broken.** Script off, in both engines: three panels in reading order, all visible, each with its heading and its region label, none claiming a `tabpanel` role, no strip and no band where the strip would be (`stripBox: 0`). Script on: tabs switch, arrows move selection and focus, Home/End reach the ends, one Tab from the top of the document lands on the selected tab and the next Tab leaves the strip, and the inverted focus ring paints — 2px solid `rgb(253,253,251)` at `-2px` offset, confirmed by comparing strip pixels focused against unfocused.

Print was not. **On any tab but the Sheet, the artifact printed a blank page** — `bodyHeight: 0`, in WebKit and Chromium alike. That is a defect against [artifact-views](wayfinder/tickets/047-artifact-views.md), so it went back there: reopened, fixed, amended, closed. The short version is that Tailwind's preflight hides `[hidden]` with an `!important` inside `@layer base`, cascade layers reverse for important declarations, and so no unlayered rule — not even `#view-panel-sheet { display: block !important }`, which was the first fix and did nothing — can raise a panel the script has hidden. The script now hides with a class the artifact owns and the print rule wins on plain specificity. Re-run after the fix: print shows the Sheet alone from every tab and with script off, in both engines, and exactly one `tabpanel` stays exposed at a time.

Two of the three defects the first run printed were the harness's own, and worth writing down because they will recur: blurring mid-page and pressing Tab does **not** restart the focus walk at the top (the sequential-focus starting point stays put, so Tab steps past the strip into the panel), and headless WebKit refuses `navigator.clipboard.writeText` outright.

**5. The dirty state holds on the side that costs a user their work.** With Unexported changes standing: the Markdown export leaves it standing, the PNG export leaves it standing, and both Copies leave it standing. Because of the WebKit clipboard refusal the copies were re-run in Chromium with permission granted (`evidence/part5-copy-chromium.json`) — there the writes land, the clipboard holds the panel's own bytes, the app announces *JSON copied* and *Markdown copied*, and the indicator still does not move. The HTML artifact and Canvas file exports clear it, which is the other half of the rule.

**6. Green.** 376 app tests, 85 MCP tests, `svelte-check` 407 files / 0 errors, and the bundle staleness test passing on its own — no rebuild was needed, since the seam inversion moved the digest into `src/lib/model/` where MCP already imports it and this ticket changed only `src/lib/artifact/html.ts`.

**What the gate cost, and what that says about it.** One real defect, in the one behaviour of the six that no test could reach: a unit test can read the print CSS's bytes, and that test was green and truthful the whole time. The cascade only exists in a browser. That is now written into the test as the reason it cannot be trusted alone, with a pointer here.

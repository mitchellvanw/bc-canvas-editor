# 09 — HTML artifact: export & re-import

**What to build:** **Export → HTML artifact (.bcc.html)** downloads a single self-contained file that opens anywhere as the pixel-identical quiet sheet — fonts, styles, footer attribution and all — reflows to one column on small screens, and prints cleanly. The Canvas file JSON rides inside it, so **Import…** accepts the `.bcc.html` right back through the same path as `.bcc.json`. Exporting or importing an HTML artifact clears unexported changes.

**Blocked by:** 02 — Canvas file round trip; 03 — The quiet sheet.

**Status:** ready-for-agent

Scope notes:

- Serialize the hidden offscreen mount of the read-only `CanvasSheet` — never the live editor DOM; no affordances, contenteditable spans or placeholders may leak in (SPEC §9). Reuse ticket 04's offscreen-mount mechanism if it landed first; otherwise establish it here.
- Embedded Canvas JSON in a script block, **byte-identical** to the `.bcc.json` export (SPEC §9.1). Importer accepts both extensions through one path: same version check, migrations, refusals, confirmation gate, history clearing; missing/corrupt embedded block refused like any invalid Canvas file.
- CSS: the app's entire compiled stylesheet fetched same-origin at export time, inlined in one style tag — runtime fetch is the default; Vite inline import is unverified (build risk #3, SPEC §13).
- Fonts: only used weights, latin subset, base64 WOFF2 data URIs; ~300–500 KB total is acceptable (SPEC §9.1).
- HTML comment near the top crediting ddd-crew with the CC BY 4.0 license URL (SPEC §11).
- Responsive pass: below a single breakpoint the grid stacks to one column in the reading order of SPEC §9.1; no miniature, no horizontal scroll. Print pass: minimal print stylesheet with clean section breaks — printing is the PDF answer.
- Artifact commits to WCAG AA (SPEC §8.6): real text, h1/h2/h3 hierarchy, language tag, glyph+text alongside every color meaning, 200% zoom reflow.

Acceptance criteria:

- [ ] Exported artifact opens standalone (offline) rendering pixel-identical to the sheet, footer attribution inside.
- [ ] Embedded JSON is byte-identical to the Canvas-file export; re-importing the artifact restores the identical canvas and clears unexported changes.
- [ ] Corrupt/missing embedded block refused with the not-a-Canvas-file notice; newer version refused with the version notice.
- [ ] Artifact stacks to one column below the breakpoint and prints with clean section breaks.
- [ ] AA checks pass on the artifact: heading hierarchy, contrast, non-color-only meaning, 200% zoom.

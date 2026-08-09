# 05 — Inline text editing across the sheet

**What to build:** Every free-text value on the rendered sheet — description, collaborator names, message names and descriptions, terms and definitions, decisions, assumptions, metrics, open questions — is editable in place, always, with no edit mode. Hovering editable text shows a faint halo; focus shows a hairline outline. Blur commits, Enter commits single-line fields, Esc reverts. Each blur is one commit feeding autosave.

**Blocked by:** 03 — The quiet sheet.

**Status:** ready-for-agent

Scope notes:

- Modeless per SPEC §6, primary source the live-sheet prototype (winner `1-live-sheet/` on branch `prototype/inline-editing`): contenteditable plaintext in place; the presentation view carries zero editing chrome.
- Extends the Commit/revert grammar ticket 01 built for the name field to every free-text value; one field blur = one commit = one autosave write (SPEC §6.1).
- Multi-line prose fields (description, item descriptions/definitions) commit on blur only; single-line fields also on Enter.
- Known accepted risks to soften, not redesign: stray-click carets in prose (SPEC §6, §13).
- Structural actions (add/remove/reorder) are ticket 06; pickers are ticket 07; placeholder teaching copy is ticket 10.

Acceptance criteria:

- [ ] Every free-text value in the SPEC §3.1 reference example can be edited in place and the change survives reload via autosave.
- [ ] Blur/Enter/Esc behave per the grammar on single-line and prose fields respectively.
- [ ] Hover halo and focus hairline appear per SPEC §6; no editing chrome is visible at rest.
- [ ] Serialized output after edits still follows the shape rules (optional fields omitted when emptied, never null or empty-string noise where omission is specified).

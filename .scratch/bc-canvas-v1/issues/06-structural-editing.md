# 06 — Structural editing: lanes, messages, rows

**What to build:** The user grows and reshapes the canvas by pointer: hovering a panel fades in its ghost adds; clicking a ghost add creates the row/lane/sticky and focuses its first field; a message ghost first offers the mini type popover (▶ command / ? query / ◆ event) then focuses the new chip's name. Hovering an item reveals its ×; hovering a lane reveals its ⠿ grip. Chips drag-reorder within their lane; lanes drag-reorder by grip. Every action is one commit.

**Blocked by:** 05 — Inline text editing.

**Status:** ready-for-agent

Scope notes:

- Affordances materialize on approach per SPEC §6 — zero chrome at rest. (Always-visible ghosts on *empty* sections are ticket 10's amendment; focus-reveal parity is ticket 12.)
- Covers all repeating structures: lanes (collaborator + messages) in both communication sections, message chips, trait chips removal (adding traits is ticket 07's picker), ubiquitous-language rows, business-decision rows, and the one-liner stickies (assumptions, metrics, open questions).
- Lane × removes the collaborator with its messages; ephemeral ids from ticket 01 key the drag-reorder.
- One structural action (add / remove / reorder) = one commit = one autosave write (SPEC §6.1).
- New-message flow per SPEC §6: type popover, then name field focused for immediate typing.

Acceptance criteria:

- [ ] Every section can go from empty to populated and back by pointer alone.
- [ ] Message creation runs ghost → type popover → focused name field in one flow.
- [ ] Chips reorder within a lane and lanes reorder within their section by drag; order survives export/reload.
- [ ] × removal works for chips, rows, stickies, and whole lanes.
- [ ] Each add/remove/reorder is exactly one commit (visible as one autosave write and, once ticket 08 lands, one undo step).

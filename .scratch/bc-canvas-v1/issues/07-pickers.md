# 07 — Pickers: classification, relationship, domain-role traits

**What to build:** Curated vocabularies open as popovers on the value itself. Clicking a classification value in the title block opens its axis picker (curated values, ✓ on current, **— none —**, **custom…**); clicking a lane's relationship value opens the relationship picker with the nine patterns and their teaching one-liners (**— no relationship —**, **custom…**). The ghost "+ trait" chip opens the 15-trait multi-select checklist with inline one-line descriptions plus a custom-trait input. Custom values render identically to curated ones and round-trip.

**Blocked by:** 03 — The quiet sheet.

**Status:** ready-for-agent

Scope notes:

- Vocabularies, casing, and descriptions verbatim from SPEC §4: kebab-case classification axis values and relationship patterns; trait file values as natural lowercase prose displayed sentence-case.
- Escape hatch = single string field (SPEC §3.2): custom values are just strings, rendered as-is.
- Popover microcopy per SPEC §10: **custom…** lowercase with ellipsis; **— none —** / **— no relationship —**; no hint lines — the descriptions are the teaching.
- One pick / toggle / clear = one commit (SPEC §6.1).
- Build the keyboard grammar in from the start rather than retrofitting (SPEC §8.3): the rendered value is a button (Enter/Space opens); pick-one pickers are listboxes (arrows, type-ahead, Enter picks-and-closes, Esc closes unchanged); the trait checklist is a checkbox group (Space toggles, one commit per toggle, open until Esc/blur); **custom…** is the last option, Enter moves into its input, Enter commits, Esc backs out.
- Domain roles are chips only — the prototype's "Why these roles?" note is dropped; do not rebuild it (SPEC §6). No per-role description in the file (SPEC §3.2).

Acceptance criteria:

- [ ] All three classification axes pick, clear to "—", and accept custom values.
- [ ] Relationship picker teaches via the nine one-liners; clears via — no relationship —; accepts custom.
- [ ] Trait checklist multi-selects with descriptions; each toggle is one commit; custom trait input works; chips removable via ×.
- [ ] Custom values render identically to curated ones and survive export → import.
- [ ] Full keyboard grammar of SPEC §8.3 works inside every picker.

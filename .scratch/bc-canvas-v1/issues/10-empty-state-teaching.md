# 10 — Empty state & teaching placeholders

**What to build:** A brand-new canvas is the ordinary quiet sheet where the form itself teaches: every empty free-text field carries its ddd-crew helper question as an italic placeholder, and every empty section shows its ghost add with the question always visible — no hint layer, no seeding, no tour. Typing replaces a placeholder instantly; the first item shortens the ghost to its terse label; emptying a field or section brings the teaching back automatically.

**Blocked by:** 06 — Structural editing; 07 — Pickers.

**Status:** ready-for-agent

Scope notes:

- Winner of the empty-state prototype (`1-placeholder-questions/` on branch `prototype/empty-state`); SPEC §7.
- Final placeholder copy verbatim from the SPEC §10 table (ghost questions per section; terse row-field placeholders `Collaborator`, `Message name`, `Term`, `Rule`, `detail`, `…` once a section has content).
- Always-visible ghosts on empty sections are the amendment to the live-sheet hover rule; hover/focus-materialized once the section has content (SPEC §7).
- State-driven, no first-run flag: disappearance and return are instant and granular.
- Title block: name placeholder "Name this context" (from ticket 01); classification values render "—" until picked; classification teaching stays in the pickers.
- No teaching on a filled canvas; empty sections in artifacts render with no hints or placeholders (guard the `CanvasSheet` boundary).

Acceptance criteria:

- [ ] New canvas shows every section's ghost question and every empty field's placeholder per the SPEC §10 copy table.
- [ ] First item in a section collapses its ghost to the terse label; deleting the last item restores the question — with no stored flag.
- [ ] Placeholders never appear in exported artifacts or serialized files.
- [ ] Placeholders are italic and visually quiet per the empty-state prototype.

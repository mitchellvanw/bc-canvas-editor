# 12 — Full keyboard operability & assistive-tech semantics

**What to build:** Every pointer action has a keyboard path. Tabbing walks one linear reading-order sequence through every field, chip, and pickable value; focusing anything reveals what hover reveals (ghost adds, ×) as real tab-order buttons; Delete removes the focused chip or lane; Alt+arrows reorder chips and lanes as stateless one-commit moves. A screen reader hears sensible roles, identity-led names, and terse polite announcements for structural changes.

**Blocked by:** 06 — Structural editing; 07 — Pickers; 08 — Undo/redo.

**Status:** ready-for-agent

Scope notes:

- Ambition per SPEC §8: full keyboard operability with sound semantics, no formal WCAG claim for the editor (the HTML artifact's AA bar lives in ticket 09).
- Tab order: one linear sequence, no grid-navigation ceremony; section-skip accelerator is a nice-to-have, not a commitment (SPEC §8.1).
- Focus-reveal parity and placement per SPEC §8.2: revealed controls right after the thing they act on. Delete acts on the focused item container, never inside text editing. Alt+←/→ chip within lane, Alt+↑/↓ lane; each press one commit; no grab mode.
- Focus visibility per SPEC §8.4: 2px ink ring on `:focus-visible` for non-text targets; same ring for keyboard-focused contenteditable, hairline+caret for pointer-initiated editing. All animation honors `prefers-reduced-motion`.
- Semantics per SPEC §8.5: textbox roles with identity names (never content), `aria-placeholder` for the questions, native list structures for lanes/messages/chips, type-led accessible names ("Command, Place Order").
- One polite live region announcing only structural commits and non-local effects, strings verbatim from SPEC §10 (`Collaborator removed`, `Trait added`, `Moved up`/`Moved down`, `Undone:`/`Redone: <section name>`, `Canvas imported`, `New canvas`) plus the multi-tab notice. Field-blur commits announce nothing; nothing assertive.
- Picker-internal keyboard grammar already landed in ticket 07 — verify it composes with the sheet-wide order here.

Acceptance criteria:

- [ ] A full canvas can be built, reordered, and emptied keyboard-only (no pointer).
- [ ] Focus reveals panel ghosts and item ×; revealed buttons sit immediately after their targets in tab order.
- [ ] Delete, Alt+←/→, Alt+↑/↓ behave per the grammar; each reorder press is one undo step.
- [ ] Focus rings and reduced-motion behavior match SPEC §8.4.
- [ ] VoiceOver walk-through: roles, names, and list structures read per SPEC §8.5; live region announces exactly the SPEC §10 strings and nothing on field blur.

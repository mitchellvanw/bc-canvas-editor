# Variant 3 — Marked-up sheet

**Bet:** viewing and editing are different activities, so split them cleanly — a single Edit/Done pill (top right). View mode is the untouched artifact: zero chrome, nothing clickable, exactly what exports. Edit mode marks the whole sheet up at once, like switching a drafting sheet from "framed on the wall" to "on the table with a pencil".

- **Free text:** contenteditable, but every value sits in a visible dashed slot in edit mode — no guessing what's editable, empty fields show their placeholder.
- **Classification / relationship:** values render as small dashed dropdown-alikes (with ▾) → same popover-with-custom pattern as variant 1.
- **Roles:** "+ trait" is always visible in edit mode → popover checklist with descriptions + custom.
- **Structure:** every chip, lane, term and list row carries an always-visible × and a ⠿ drag handle; everything reorders by drag (messages, lanes, terms, decisions, assumptions, metrics, questions).
- **Commit model:** individual edits commit per field, but the mode switch bounds an editing *session* — a candidate autosave/history boundary.
- **Risk to react to:** the mode tax (every tweak costs an Edit + Done round-trip) and whether the fully marked-up sheet feels energizing or noisy.

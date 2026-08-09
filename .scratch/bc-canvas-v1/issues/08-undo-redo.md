# 08 — Undo/redo

**What to build:** ⌘Z undoes the last commit and ⇧⌘Z redoes it, across field edits and structural actions alike; the affected region scrolls into view with a brief highlight, focus never moves. If the focused field has uncommitted edits, ⌘Z reverts the field instead (synonym of Esc). Undo/Redo chrome buttons appear with `Undo (⌘Z)` / `Redo (⇧⌘Z)` tooltips.

**Blocked by:** 05 — Inline text editing.

**Status:** implemented

Scope notes:

- Single linear history of full-document snapshots, one per commit; undo/redo swaps the document (SPEC §6.1). Uncapped within the session; session-scoped — cleared on import/new, never persisted across reloads.
- ⌘Z intercepted globally; native contenteditable undo is never in play.
- Highlight-flash and scroll-to-target must honor `prefers-reduced-motion` (SPEC §8.4).
- History covers whatever commits exist when this lands (at minimum ticket 05's field edits); structural commits from tickets 06/07 join automatically since history wraps the commit pipeline.
- Import/new clearing history is ticket 02's session boundary — verify the integration here.

Acceptance criteria:

- [x] Every commit is one undo step; undo/redo round-trips the document exactly (byte-identical serialization).
- [x] ⌘Z with uncommitted field edits reverts the field; otherwise pops history; ⇧⌘Z redoes.
- [x] Undo/redo scrolls the affected region into view with a brief highlight and never moves focus; instant under reduced motion.
- [x] History clears on import and new canvas; undo cannot cross that boundary.
- [x] Chrome buttons with the exact tooltips work and disable appropriately at history ends.

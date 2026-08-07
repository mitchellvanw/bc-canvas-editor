# Inline editing interactions — prototype round

**Question** (ticket [inline-editing-prototype](../../wayfinder/tickets/005-inline-editing-prototype.md)): how does editing feel, in place, on the rendered quiet-sheet canvas? Sub-questions: contenteditable vs swap-in inputs; the classification enum UI with escape hatch; the 15-trait role picker with descriptions; adding/removing/reordering messages and lanes; how a section signals "click to edit" without cluttering the presentation view.

**Plan:** three variants of the same filled-in "Order Fulfillment" canvas (quiet-sheet visual language, unchanged), each a self-contained HTML file with working in-memory editing, cycled via the floating bar or ←/→. The variants disagree about *when the canvas admits it is editable* — that one choice drives every sub-answer:

| | 1 Live sheet | 2 Focus panel | 3 Marked-up sheet |
|---|---|---|---|
| Mode | none — always editable | per-section | global Edit/Done toggle |
| Free text | contenteditable in place | swap-in textarea/inputs | contenteditable in dashed slots |
| Affordance signal | hover halos + ghost controls on panel hover | "✎ edit" chip on panel hover | none in view mode; everything visible in edit mode |
| Classification | click value → popover + custom | radio groups in title-block form + "other" | click value → popover + custom |
| Role picker | popover checklist w/ descriptions | in-panel checklist w/ descriptions | popover checklist w/ descriptions |
| Add / remove | ghost chips + hover × | explicit +/× buttons in form | always-visible ghosts and × |
| Reorder | drag chips/lanes | ↑ ↓ buttons | drag everything (handles) |
| Commit granularity | per field blur / per structural action | per panel (Done/Cancel, Esc/⌘⏎) | per field, inside one mode session |

Every variant has a `{}` drawer (bottom right) showing the live serialized Canvas JSON — check that escape-hatch values round-trip, and note how differently the three models chunk changes (relevant to undo granularity, ticket 006).

All content values (example canvas, trait descriptions) are illustrative prototype data, not settled copy.

Per-variant detail in each folder's `REASONING.md`.

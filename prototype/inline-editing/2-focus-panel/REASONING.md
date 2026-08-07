# Variant 2 — Focus panel

**Bet:** a canvas section is a *record*, so edit it like one — click a panel and that panel alone becomes a real form while the rest of the sheet dims. The presentation view stays 100% inert (and pixel-identical to the static prototype); the only signal is an "✎ edit" chip on panel hover.

- **Free text:** swap-in inputs — textarea for prose, paired inputs for term/definition and rule/detail rows.
- **Structure:** everything explicit — ↑ ↓ × buttons on every row, dashed "+ message / + collaborator / + term" buttons. No hover-hunting, no drag.
- **Classification:** the title block is itself a section — click it and it expands into name input + three radio groups, each with an "other…" escape-hatch radio.
- **Roles:** the panel's edit state shows the full 15-trait checklist with descriptions inline (no popover), custom traits as extra rows.
- **Commit model:** Done commits the whole panel, Cancel/Esc reverts it, ⌘/Ctrl+Enter commits from the keyboard; clicking a different panel commits the open one and moves the focus there. This gives a natural undo chunk: one panel-edit = one history entry.
- **Risk to react to:** heavier ceremony for one-word tweaks (two clicks + Done to fix a typo), and the form state looks less like the artifact than the other two variants.

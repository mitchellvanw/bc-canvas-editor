# Variant 1 — Live sheet

**Bet:** the canvas is a document, so edit it like a document — no modes at all. Every text value is contenteditable all the time; click and type. The presentation stays clean because affordances only *materialize* on approach: hovering a panel fades in its ghost adds ("+ trait", "+ collaborator", "+ term", chip "+"), hovering an item reveals its ×, hovering a lane reveals its drag grip.

- **Free text:** contenteditable in place (plaintext). Blur commits, Enter commits single-line fields, Esc reverts the field.
- **Classification / relationship:** the value itself is clickable (subtle underline on hover) → popover with the curated list, a ✓ on the current value, and a "custom…" input as escape hatch. Relationship also offers "— none —".
- **Roles:** ghost "+ trait" chip → popover checklist of all 15 traits with one-line descriptions, multi-select (stays open), plus custom input.
- **Messages:** ghost "+" chip per lane → tiny type popover (▶ command / ? query / ◆ event), then the new chip's name is focused for typing. Chips drag to reorder within their lane.
- **Lanes:** grip on hover, drag to reorder; × in the lane head removes it.
- **Risk to react to:** discoverability (nothing says "editable" until you hover) and accidental edits (a stray click puts a caret in prose).

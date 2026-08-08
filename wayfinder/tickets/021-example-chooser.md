---
name: example-chooser
title: "Prototype: how does \"open an example\" present in the chrome?"
labels: [wayfinder:prototype]
status: open
assignee: mitchell
blocked-by: []
---

## Question

Charting placed the chooser in the chrome, beside Import/New — the empty sheet stays quiet per SPEC §7. Prototype the control itself, in quiet-sheet character:

- **Grammar.** A menu that drops from an "Examples" control? A small dialog like Reference (⌘/)? A picker in the file-verb row? How do 3–5 entries present — name alone, or name plus the one-line description from the roster?
- **Flow.** Choosing an example runs the import path: the unexported-changes confirmation gate, history cleared, clean landing. Where does the gate's dialog sit in the flow, and what does the live region announce (`Canvas imported`? something example-specific)?
- **Keyboard & a11y.** The control joins the linear tab order and the chrome's grammar (SPEC §8): roles, focus rings, Esc behavior.
- **Copy.** Control label, entry lines, any dialog strings — `writing-copy` register, Import/Export verb family.

Prototype on a `prototype/example-chooser` branch, variants to react to, winner recorded here. Placeholder roster entries are fine — the real roster lands via [example-roster](wayfinder/tickets/020-example-roster.md) and doesn't block this.

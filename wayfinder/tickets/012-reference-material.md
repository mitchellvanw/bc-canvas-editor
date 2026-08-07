---
name: reference-material
title: "Decision: in-app reference material"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: []
---

## Question

The live-sheet pickers already surface one-line descriptions for the 15 domain-role traits, and relationship types render as bare mono badges ([inline-editing-prototype](wayfinder/tickets/005-inline-editing-prototype.md)). Is that enough teaching, or do traits and context-mapping relationship types deserve an explanatory reference panel (or link-out to ddd-crew material) beyond the picker? To settle: whether a reference surface exists at all, what it covers (traits, relationships, message types, the method itself), where it lives (side panel, dialog, footer link), and whether the exported HTML artifact carries any of it.

Use `/grilling` + `/domain-modeling`.

Input from [keyboard-a11y](wayfinder/tickets/010-keyboard-a11y.md): the keyboard grammar (Tab order, Alt+arrow reorder, Delete, Esc, popover keys) is invisible until known — whatever reference surface this ticket designs must decide where keyboard shortcuts are taught; a separate mechanism should not be invented elsewhere.

## Resolution

Settled in a grilling session (2026-08-07), two rounds, all recommendations accepted. This ticket is the canonical home of the Reference-dialog strings and the relationship-pattern one-liners; the spec compiles from here.

**A single minimal reference surface exists — the Reference dialog.** The keyboard grammar alone forces it: shortcuts cannot be taught at point of use, and a link-out cannot document this app's keys. The sheet itself keeps its no-hint-layer stance; everything else continues to teach in place (picker descriptions, placeholder questions, footer legend).

**Relationship types are taught in their picker**, parallel to the trait picker: a one-line description on each pattern at the point of choice. The Reference dialog carries **no** patterns section — one copy of the teaching, where the decision happens. The **custom…** and **— no relationship —** entries keep their [ui-copy](wayfinder/tickets/011-ui-copy.md) strings and carry no descriptions.

**Coverage: keyboard shortcuts + one method link-out.** No in-app method primer, no trait/message-type glossary — restating what pickers and the legend already teach builds a maintenance liability. The method belongs to ddd-crew's own material.

**The HTML artifact carries nothing extra.** Legend + linked attribution line remain its whole teaching layer. No `title` tooltips or footnotes on relationship badges — pointer-only and print-invisible, failing the artifact's own AA bar.

**Entry point:** a text control **Reference** at the far end of the chrome (the sheet footer is inside the PNG capture region, so the entry point cannot live there). Tooltip: `Reference (⌘/)` — mirroring how Undo/Redo teach their shortcuts.

**Form:** a modal dialog. Esc closes; focus returns to the invoking control, per the established popover grammar. Not a side panel — the content is glance-sized, and a persistent panel would cost a second layout state for twice-visited material.

**Shortcut:** **⌘/** (Ctrl+/ on Windows/Linux) opens the dialog — safe in a contenteditable-everywhere app where a bare `?` is not. Modifier renders per platform (⌘ on macOS, Ctrl elsewhere).

**Dialog contents (final strings)** — title **Reference**, four shortcut clusters, then the link line:

**Editing**
| Keys | Action |
|---|---|
| Enter | Commit a single-line field |
| Esc | Revert the field being edited |
| Tab / click away | Commit and move on |

**Structure**
| Keys | Action |
|---|---|
| Delete | Remove the focused chip or lane |
| Alt+← / Alt+→ | Move a chip within its lane |
| Alt+↑ / Alt+↓ | Move a lane up or down |

**Pickers**
| Keys | Action |
|---|---|
| Enter / Space | Open the picker on a value |
| ↑ ↓ | Move through options — or type to jump |
| Space | Toggle a trait |
| Enter | Pick and close |
| Esc | Close without changing |

**App**
| Keys | Action |
|---|---|
| ⌘Z / ⇧⌘Z | Undo / Redo |
| ⌘/ | Open this reference |

Link line: **Learn the method: the ddd-crew's Bounded Context Canvas** — linked to `github.com/ddd-crew/bounded-context-canvas`.

**Relationship-pattern one-liners (final)** — shown in the relationship picker, styled like the trait descriptions:

| Pattern | One-liner |
|---|---|
| partnership | The two contexts succeed or fail together; teams coordinate as equals. |
| shared-kernel | Both contexts share a piece of the model, changed only by mutual agreement. |
| customer-supplier | Upstream plans around this context's needs, like a supplier serving a customer. |
| conformist | This context adopts the upstream model wholesale rather than translating it. |
| anticorruption-layer | A translation layer at the boundary keeps the upstream model from leaking in. |
| open-host-service | Upstream exposes one published protocol that all consumers use. |
| published-language | The exchange uses a shared, well-documented format — often an industry standard. |
| separate-ways | No integration — duplication costs less than coupling here. |
| big-ball-of-mud | The other side is entangled legacy; defend this context's boundary. |

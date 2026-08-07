---
name: keyboard-a11y
title: "Decision: keyboard model & accessibility"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: []
---

## Question

What does keyboard-only editing mean in a modeless, contenteditable canvas (the live-sheet model from [inline-editing-prototype](wayfinder/tickets/005-inline-editing-prototype.md))? To settle: tab order across editable fields, chips and lanes on the 2D grid; how hover-only affordances (ghost adds, ×, drag grips) are reached without a pointer — and what the keyboard equivalent of drag-reorder is; popover picker keyboard operation (open, navigate, escape hatch); focus visibility on the quiet sheet; semantics for assistive tech (roles/labels for contenteditable spans, chips, popovers, live announcements on structural changes); and how far WCAG conformance is a goal for the editor vs the exported HTML artifact.

Use `/grilling` + `/domain-modeling`. May spin off a `research` ticket on contenteditable/ARIA patterns if the discussion hits an evidence gap.

## Resolution

Settled in two rounds (2026-08-07); no research spin-off needed.

**Ambition (frames everything):** the editor commits to full keyboard operability — every pointer action has a keyboard path — with sound roles/labels/announcements, but makes **no formal WCAG claim** for v1. The **HTML artifact commits to WCAG AA**: it is the public-facing half and a static document, so conformance is achievable and worth stating in the spec. PNG is exempt (declared presentation-only).

**Keyboard model:**

- **Tab order** is one linear sequence in reading order — every editable field, chip, and pickable value is a tab stop. No grid-navigation ceremony. A section-skip accelerator (e.g. Ctrl+↓) is a build-time nice-to-have, not a spec commitment.
- **Affordances: focus reveals what hover reveals.** Focusing anything in a panel fades in that panel's ghost adds; focusing an item reveals its × — and revealed controls are real buttons in the tab order, placed right after the thing they act on. Shortcuts ride on top as accelerators (Delete removes the focused chip/lane — acting on the focused *item container*, never inside text editing).
- **Reorder** (drag-grip equivalent) is stateless modifier+arrows: Alt+←/→ moves a focused chip within its lane, Alt+↑/↓ moves a focused lane. Each press is one commit (matches "one structural action = one commit"); undo covers regret. No grab mode.
- **Popovers**: the rendered value is a button (Enter/Space opens). Pick-one pickers are listboxes — arrows move, type-ahead jumps, Enter picks-and-closes, Esc closes unchanged. The 15-trait checklist is a checkbox group — Space toggles (each toggle one commit), stays open until Esc/blur. "Custom…" is the last option; Enter moves focus into its text input, Enter commits, Esc backs out to the list.
- **Focus visibility**: non-text targets get a 2px ink-colored ring with small offset on `:focus-visible` only (pointer users never see rings); contenteditable fields get the same ring when focused via keyboard. The hairline outline + caret remains for pointer-initiated editing.

**Assistive-tech semantics:**

- Every free-text field is `role="textbox"` (`aria-multiline` for prose); its accessible name is the field's *identity* ("Name", "Purpose", "Term"), never its content. Empty-state placeholder questions ride along as `aria-placeholder`/description, so the teaching layer reaches screen-reader users.
- Repeating structures are native lists (lanes are lists of messages; sections are lists of lanes; traits a list of chips) for free counts/orientation. Accessible names lead with the type where color/glyph carries meaning: "Command, Place Order" — the non-visual twin of the glyph rule.
- **One polite live region**; announces only structural commits and non-local effects ("Trait added", "Lane moved up", undo/redo — essential since undo scrolls-and-highlights without moving focus — plus import and multi-tab notices). Field-blur commits announce nothing. No assertive interruptions anywhere.

**Artifact AA, concretely:** real text throughout; heading hierarchy (canvas name h1, sections h2, collaborators h3); document language tag; AA contrast verified against the actual quiet-sheet tokens at build time — cream paper, ink-on-pastel EventStorming fills, and the pink collaborator underline are the at-risk pairs, and **tokens shift if a pair fails** (editor and artifact together — the shared renderer means they cannot diverge; AA contrast outranks palette attachment); glyphs + text carry every color-coded meaning; 200% zoom reflows via the single-breakpoint stack.

**Strays:** keyboard-grammar discoverability is delegated to [reference-material](wayfinder/tickets/012-reference-material.md) as an explicit input (line added to that ticket). All animation (fades, undo highlight-flash, scroll-to-target) honors `prefers-reduced-motion` by swapping animation for instant state change.

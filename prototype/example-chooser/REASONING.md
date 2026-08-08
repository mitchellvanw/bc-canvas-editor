# Example chooser — variant reasoning

Ticket: `wayfinder/tickets/021-example-chooser.md`. Three in-app variants on
this branch, mounted in the real chrome (`src/lib/chrome/prototype-examples/`,
wired into `Chrome.svelte`), switchable with the floating bar / `?variant=` /
arrow keys. Run `npm run dev` on this branch; screenshots in `shots/`.

ASCII exploration (including the rejected persistent-strip direction) in
[ASCII-SKETCHES.md](ASCII-SKETCHES.md).

## Shared decisions — the same in every variant

These answer the ticket's **Flow**, **Keyboard & a11y**, and part of **Copy**;
only the *grammar* differs per variant.

- **Opening an example runs the import path.** With unexported changes, the
  existing confirmation-dialog family gates it; on proceed the document is
  replaced and history cleared, exactly like Import. Clean sheet → no ceremony.
- **Gate copy** stays in the Replace family, with the verb swapped:

  > **Replace "Order Fulfillment"?**
  > Its latest changes haven't been exported. Opening an example replaces the
  > canvas and clears undo history.
  > [ Cancel ] [ **Replace** ]

- **Live region announces `Example opened`** — parallel to `Canvas imported` /
  `New canvas`. Alternative, if the distinction isn't worth a string: reuse
  `Canvas imported` (an example *is* an import). Reaction wanted.
- **Entry line = name + roster one-liner.** Name alone was tried in sketches
  and reads as a bare list of nouns — the one-liner is what makes four unknown
  domains choosable. Royalty Distribution's line carries the quiet
  unfinishedness flag as a trailing sentence: *"Captured mid-workshop."*
  (draft; `writing-copy` polish lands with the real roster at ship time).
- **Keyboard:** menus mirror the Export menu exactly (button `aria-haspopup`,
  `role="menu"`/`menuitem`, Esc closes and refocuses the button, focus-out and
  click-outside close); the dialog mirrors Reference (`showModal`, native Esc,
  focus returns to the invoker). Every control joins the linear tab order in
  reading position.

## Variant 1 — Examples menu (`?variant=1`)

**Style.** One more quiet chrome button, `Examples`, on the input side right
after Import… — an example is an import sourced from the app. Its dropdown
borrows the Export menu's frame; each entry is two lines (name, muted
one-liner).

**Gains.** Smallest possible grammar: no new interaction pattern, one click to
the roster, two to a loaded canvas. The chrome stays a single row of verbs.

**Sacrifices.** Two-line items make this the tallest, heaviest menu in the app
(Export's are one-line); four descriptions hang off a quiet chrome in a way no
other control does. If the roster ever grew, this menu wouldn't.

## Variant 2 — Examples dialog (`?variant=2`)

**Style.** Same `Examples` button, but it opens a small modal in the Reference
dialog's family: the four canvases as full-width bordered entries, Close at
the foot. The set presents as a curated shelf rather than menu rows.

**Gains.** Room — descriptions breathe at full text size, and the dialog frame
says "this is a considered set, look before you pick." Grammar already exists
in the app (Reference), so nothing new to learn. Scales if the roster grows.

**Sacrifices.** Ceremony: a modal (plus its backdrop dimming the sheet) for a
four-item pick, and the gate dialog can follow it — two modals in sequence on
a dirty sheet. Slowest path to a canvas.

## Variant 3 — inside New canvas (`?variant=3`)

**Style.** The chrome doesn't change at all until you press `New canvas`,
which is now a menu: `Blank canvas` first, then an EXAMPLES group with the
four entries.

**Gains.** Zero new chrome; the grammar argues that an example is a *starting
point* — the same verb family as starting fresh. Discovery rides a control
every user eventually presses.

**Sacrifices.** Blank canvas — the common case — costs an extra click forever.
Examples hide behind a verb nobody presses idly, so first-visit discovery is
worst here. And SPEC §10's one-click `New canvas` contract changes.

## What reaction settles

1. **The grammar** — menu (1), dialog (2), or inside New canvas (3); or a
   graft (e.g. variant 1's placement with variant 2's entry weight).
2. **The announcement** — `Example opened` vs reusing `Canvas imported`.
3. **Entry copy shape** — name + one-liner confirmed? Royalty Distribution's
   trailing flag sentence tolerable in a menu row?
4. **Gate copy** — "Opening an example replaces the canvas and clears undo
   history." as the third member of the Replace family.

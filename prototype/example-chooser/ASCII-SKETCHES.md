# Example chooser — ASCII exploration

Ticket: `wayfinder/tickets/021-example-chooser.md`. Question: how does "open an
example" present in the chrome, in quiet-sheet character, beside Import/New?

The chrome today (reading order, right-aligned after the undo pair):

```
Undo  Redo ································ Import…  [Unexported changes]  Export  New canvas  Reference
```

Four directions, structurally distinct in **where the roster lives and what
grammar the control borrows**. Three promoted to in-app variants; one rejected
here.

---

## A — Examples menu (promoted → variant 1)

Borrows the Export menu's grammar exactly: one more chrome button, one more
dropdown. The roster is a menu; each entry is name + one-liner.

```
 Import…  Examples  [Unexported changes]  Export  New canvas  Reference
          ┌─────────────────────────────────────────────┐
          │ Order Fulfillment                           │
          │   Coordinates picking, packing and shipping │
          │   once an order is paid.                    │
          ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
          │ Notifications                               │
          │   Delivers order updates to customers on    │
          │   their preferred channel.                  │
          ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
          │ Appointment Scheduling                      │
          │   …                                         │
          └─────────────────────────────────────────────┘
```

- Placement: input side of the chrome, right after Import… — an example *is*
  an import, sourced from the app instead of a file.
- Gains: smallest possible addition; zero new grammar to learn.
- Risks: two-line menu items are heavier than any existing menu (Export's are
  single-line); four of them make a tall dropdown hanging off a quiet chrome.

## B — Examples dialog (promoted → variant 2)

Borrows the Reference dialog's grammar: the chrome button opens a small modal
where the set reads as a set. Entries are full-width buttons.

```
 Import…  Examples  [Unexported changes]  Export  New canvas  Reference

        ┌──────────────────────────────────────────────┐
        │ Examples                                     │
        │                                              │
        │ ┌──────────────────────────────────────────┐ │
        │ │ Order Fulfillment                        │ │
        │ │ Coordinates picking, packing and         │ │
        │ │ shipping once an order is paid.          │ │
        │ └──────────────────────────────────────────┘ │
        │ ┌──────────────────────────────────────────┐ │
        │ │ Notifications                            │ │
        │ │ Delivers order updates to customers on   │ │
        │ │ their preferred channel.                 │ │
        │ └──────────────────────────────────────────┘ │
        │ ┌──────────────────────────────────────────┐ │
        │ │ …                                        │ │
        │ └──────────────────────────────────────────┘ │
        │                                              │
        │                                    [ Close ] │
        └──────────────────────────────────────────────┘
```

- Gains: room — descriptions breathe, the four canvases present as a curated
  set rather than menu rows; the app already has this dialog family (Reference).
- Risks: a modal for a four-item pick is ceremony; two clicks + a dismissal to
  get to a canvas.

## C — Examples inside the New-canvas menu (promoted → variant 3)

No new control. "New canvas" becomes a menu: a blank sheet is one starting
point, the examples are four more.

```
 Import…  [Unexported changes]  Export  New canvas  Reference
                                        ┌────────────────────────────────────┐
                                        │ Blank canvas                       │
                                        │ ──────────────────────────────────  │
                                        │ EXAMPLES                           │
                                        │ Order Fulfillment                  │
                                        │   Coordinates picking, packing …   │
                                        │ Notifications                      │
                                        │   Delivers order updates …         │
                                        │ …                                  │
                                        └────────────────────────────────────┘
```

- Gains: the chrome doesn't grow; grammar teaches that an example is a
  *starting point*, same verb family as starting fresh.
- Risks: blank canvas costs an extra click forever (the common case pays for
  the rare one); examples hide behind a verb nobody presses idly; SPEC §10's
  "New canvas" one-click contract changes.

## D — Persistent examples strip (rejected here)

A quiet always-visible row of text links under the chrome:

```
 Import…  [Unexported changes]  Export  New canvas  Reference
 examples · Order Fulfillment · Notifications · Appointment Scheduling · Royalty Distribution
```

Zero click depth, maximum discoverability — and wrong register. It adds a
permanent teaching strip to a chrome whose whole character is that it recedes;
SPEC §7 keeps even the empty sheet free of hints, so the chrome hosting a
standing invitation reads as a contradiction. Discoverability of examples does
not outrank the quiet. Rejected at ASCII stage.

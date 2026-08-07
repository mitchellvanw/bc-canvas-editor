# Variant 2 — Print document

## Style description

The canvas as a formal one-page architecture document — the register closest to
the original ddd-crew template. One continuous ruled grid with ink-dark borders
and no gaps between sections; serif canvas name and row titles (Iowan/Palatino);
uppercase letter-spaced section labels; message lanes rendered as ledgers with
dotted row rules. Color is demoted to typed annotation: bordered CMD/QRY/EVT
chips in tinted blue/green/orange, lilac and red as thin left rules on decisions
and open questions, pink as a square marker plus small-caps relationship label on
collaborator headings. A footer rule carries the CC BY 4.0 attribution like a
document colophon.

## Design decisions

- **One grid, not eleven widgets.** Shared 1.5–2px rules make the eleven sections
  cells of a single document, exactly like the printed template — the canvas *is*
  the page.
- **Color as annotation, not surface.** The Event Storming palette survives as
  typed chips and edge rules, so the page stays ink-first, prints on a mono
  laser, and never competes with the user's content.
- **Serif/sans pairing** separates the user's words (serif, document voice) from
  the app's labels (small uppercase sans, form voice).

## Requirements mapping

- V5 canonical layout: identical band structure to the other variants; center
  column stacks ubiquitous language over business decisions with a shared rule.
- Event Storming palette: chips (CMD blue / QRY green / EVT orange), policy lilac
  and hotspot red left-rules, collaborator pink markers; neutral ink elsewhere.
- ddd-crew CC BY 4.0 attribution in the document footer.
- Desktop-first: fixed ruled grid, max-width 1240.

## Trade-offs

- **Gains:** highest density and scanability of the three; the HTML/PNG artifact
  is essentially free (it already looks like the deliverable); most faithful to
  the template users recognize; timeless rather than trendy.
- **Sacrifices:** austere — the workshop energy is gone; the palette carries less
  meaning at a glance (you read "EVT" more than you see orange); heavy rules
  leave less obvious room for hover/edit affordances, so inline editing must be
  designed carefully against the ledger rows.

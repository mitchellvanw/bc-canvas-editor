# Variant 3 — Product panels

## Style description

The canvas as a modern product document (Linear/Notion register): soft gray page,
each section a white rounded-corner panel with a hairline border and a whisper of
shadow, gap-spaced grid. Small-caps panel titles with row-count badges; message
lanes as bordered sub-cards with a pink-tinted collaborator header and a
relationship pill; messages as list rows with soft-filled CMD/QRY/EVT tags;
strategic classification as dark filled chips under labeled groups; business
decisions and open questions as tinted lilac/red rows.

## Design decisions

- **Panels because this is an app.** Rounded cards with breathing room are the
  native habitat of hover states, focus rings, add-row buttons, and drag handles —
  the inline-editing affordances the next prototype must add. This variant is
  designed forward into that ticket.
- **Lanes as sub-cards** give the collaborator + messages unit (the Lane from
  CONTEXT.md) an explicit visual container, with the relationship pattern as a
  pill — closest visual match to the schema's `{ collaborator, relationship?,
  messages }` shape.
- **Soft color fills** (10%-tint backgrounds with saturated text) keep the Event
  Storming palette present on every row without the poster-loudness of full
  sticky fills.
- **Count badges** on panel titles hint at the editor-to-come (they read as UI,
  not print).

## Requirements mapping

- V5 canonical layout: same three bands; header panel merges name + description +
  classification, roles panel sits beside it; center column stacks ubiquitous
  language over business decisions.
- Event Storming palette: CMD blue / QRY green / EVT orange tags, policy lilac
  and hotspot red tinted rows, collaborator pink lane headers; neutral elsewhere.
- ddd-crew CC BY 4.0 attribution centered under the grid.
- Desktop-first: fixed three-column grid, max-width 1280.

## Trade-offs

- **Gains:** the most natural host for editing interactions; calmest at high
  density; familiar to anyone who lives in modern SaaS tools; trivially themeable.
- **Sacrifices:** the most generic of the three — little of the workshop heritage
  or the printed template survives; rounded-card chrome spends vertical space;
  risks reading as "another dashboard" rather than a canvas with a method behind
  it.

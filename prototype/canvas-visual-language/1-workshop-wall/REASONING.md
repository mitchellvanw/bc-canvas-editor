# Variant 1 — Workshop wall

## Style description

The canvas as the physical artifact it descends from: a board hung on a warm paper
wall, sections as dashed taped-off zones, marker-style headings (Marker Felt /
Chalkboard, system fonts only), and every content row a sticky note — full color
fill, drop shadow, ±2° rotation. Collaborators are wide pink stickies with a small
tape label for the relationship pattern; free-text rows (roles, ubiquitous
language) are white index cards; assumptions/metrics are neutral yellow stickies.

## Design decisions

- **The palette is the surface, not an annotation.** Command/query/event stickies
  are filled edge to edge in Event Storming blue/green/orange — the strongest
  possible claim on the settled palette. Lilac policies, pink collaborators, red
  hotspots all read exactly as they would on a workshop wall.
- **Rotation and shadow signal "movable, informal, workshop-born"** — the visual
  promise that this document came out of (and can go back into) a collaborative
  session.
- **Dashed zone borders instead of card chrome** keep the eleven sections one
  continuous board rather than eleven widgets.

## Requirements mapping

- V5 canonical layout: header band (name/description, classification, roles),
  middle band (inbound | UL + business decisions | outbound), bottom band
  (assumptions | metrics | open questions).
- Event Storming palette: cmd #7CA7D8, qry #9CC97F, evt #FFB74D, policy lilac,
  collaborator pink, hotspot red; neutral yellow/white elsewhere.
- ddd-crew CC BY 4.0 attribution bottom-right of the board.
- Desktop-first: fixed three-column grid, max-width 1280.

## Trade-offs

- **Gains:** the palette carries maximum meaning; instantly communicates the
  method's workshop heritage; sections feel approachable, low-ceremony.
- **Sacrifices:** density — stickies are space-hungry; marker fonts risk reading
  toy-like in a professional artifact; rotation complicates pixel-clean PNG
  export and inline-editing affordances (what does a caret look like on a rotated
  sticky?); hardest of the three to keep calm as content grows.

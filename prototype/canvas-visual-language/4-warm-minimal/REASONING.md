# Variant 4 — Warm minimal craft (round 2)

## Style description

Quiet, paper-warm, typography-first: warm off-white ground (#FAF7F1), no boxes or
card chrome at all — sections are separated by whitespace, hairline warm-gray
rules, and letter-spaced small-caps labels. Humanist display type (Avenir Next)
for the app's voice, a warm serif (Charter) for the user's words, all system
fonts. Color is used with precision rather than volume: each message carries a
small colored glyph in an inky, desaturated take on its Event Storming hue
(▶ command blue, ? query green, ◆ event orange), collaborator names are set in
muted pink, policies and hotspots get small colored ticks. A one-line legend
rides with the attribution.

## Design decisions

- **Rules instead of boxes.** Round 1 failed partly on register; this drops all
  container chrome (stickies, ruled cells, cards) and lets the typographic grid
  carry the structure — the iA/Stripe-docs calm the user pointed at.
- **Color as marks, not surfaces.** The round-1 complaint "color handling wrong"
  cut both ways (full fills too loud, tints too candy). Here each hue appears
  only as a small dense mark in a desaturated, ink-adjacent tone — recognizably
  the Event Storming palette, never a surface.
- **Two voices in type.** Serif for content, spaced small-caps sans for
  structure, so the user's canvas reads as writing, not form-filling.

## Requirements mapping

- V5 canonical layout: header band (name/description | classification | roles),
  middle (inbound | language + decisions | outbound), bottom (assumptions |
  metrics | open questions), separated by column rules.
- Event Storming palette: present on every message/policy/hotspot/collaborator,
  in inky desaturated form; legend in the footer.
- ddd-crew CC BY 4.0 attribution in the footer.
- Desktop-first, max-width 1220, system fonts only (no network dependency).

## Trade-offs

- **Gains:** calmest possible surface; the user's words dominate; prints and
  exports beautifully; nothing to fight when inline editing arrives (focus rings
  and carets read clearly against the quiet ground).
- **Sacrifices:** the palette is at its least assertive — type glyphs must carry
  the command/query/event distinction; sparse chrome gives fewer natural hooks
  for "click to add" affordances; risks feeling like a document viewer rather
  than an editor.

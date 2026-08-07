# Variant 5 — Drafting sheet (round 2)

## Style description

Adapted from the user's reference design (`~/Downloads/bounded-context-canvas-
example.html` / `-template.html`, identical CSS): a warm green-gray paper ground
with a faint 28px drafting grid, panels as near-white sheets with fine rules, and
a solid-ink title block with the context name in uppercase Archivo. Type trio:
Archivo for structure, Source Serif 4 for prose, IBM Plex Mono for identifiers
(terms, messages, relationship badges). The Event Storming palette appears as
true sticky fills but anchored by a darker same-hue border, and each message type
has its own *shape*: command = block with a thick left edge, query = pill,
event = right-pointing arrow (clip-path). Inbound/outbound panels carry chevrons
pointing into and out of the canvas core. A footer legend explains types and
colors; hints in each panel teach the method.

## Design decisions

- **Kept from the reference** (what makes it work): paper + grid ground; ink
  title block; the fill-plus-ink-border answer to "color handling wrong" (hue
  reads as a sticky but stays crisp and printable); message shapes carrying the
  type distinction on top of color; per-panel hint lines; the legend footer.
- **Adapted to our decisions:** strategic classification moves into the title
  block as mono values (the reference's tap-to-select buttons belong to the
  editing prototype); relationship badges spell the full escape-hatched string
  (`customer–supplier`) instead of acronyms, since our schema stores one plain
  string; metrics are plain rows (our schema has no target/now structure); the
  reference's Team/Facilitated/Revision metadata is dropped (schema has no
  metadata envelope); message `description` rides as a title tooltip for now —
  its display treatment belongs to the editing prototype.
- **Static render:** the reference's contenteditable/print affordances removed;
  this variant answers only "how should it look".

## Requirements mapping

- V5 canonical layout via named grid areas: description + roles top (classification
  in the title block), inbound | language + decisions | outbound middle,
  assumptions | metrics | open questions bottom.
- Event Storming palette: full sticky fills with ink borders for messages,
  collaborators, terms, policies, hotspots; legend in the footer.
- ddd-crew CC BY 4.0 attribution (canvas + EventStorming cheat sheet) in footer.
- Desktop-first with the reference's responsive stacking retained.

## Trade-offs

- **Gains:** distinctive identity (paper, ink block, shaped messages) — neither
  template-clone nor generic SaaS; palette at full meaning yet print-safe;
  already close to what the exported HTML artifact should be.
- **Sacrifices:** depends on three webfonts (fine in-app via self-hosting, but
  the artifact must inline them — the export research already plans for this);
  the busiest of the two round-2 variants; shaped messages constrain how long a
  message name can run before wrapping awkwardly.

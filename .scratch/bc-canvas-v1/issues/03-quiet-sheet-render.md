# 03 — The quiet sheet: full read-only render

**What to build:** A filled canvas renders as the complete quiet sheet: all eleven V5 sections in the canonical 12-column layout, EventStorming-colored message chips with glyphs, collaborator names with pink underlines, highlighter-stroked terms, decision/hotspot markers, and the footer legend + attribution. Demoable by loading a reference document (via ticket 02's import once available, or a fixture until then).

**Blocked by:** 01 — Walking skeleton.

**Status:** implemented

Scope notes:

- Build this as the shared read-only `CanvasSheet` component — the canonical visual truth that the editor wraps and both artifacts (tickets 04, 09) will mount offscreen (SPEC §9). No editing affordances in this ticket.
- Visual language per SPEC §5, primary source the quiet-sheet prototype (winner `6-quiet-sheet/` on branch `prototype/canvas-visual-language`): near-white section sheets on cream, title block with classification label/mono-value pairs, small-caps section labels with hue underlines, uniform chip shape distinguished by color + glyph (▶ command, ? query, ◆ event), relationship as quiet right-aligned mono text.
- Type trio per SPEC §5; palette tokens per the SPEC §5 table.
- Footer per SPEC §10: one-line swatch legend (`command · query · event · decision · collaborator · open question`) plus "Based on the Bounded Context Canvas by the ddd-crew · CC BY 4.0" linked to repo and license — positioned on the sheet so it falls inside the future PNG capture region. Same attribution in the app footer (SPEC §11).
- **Build risk #2 lands here:** verify AA contrast of the at-risk pairs (cream paper, ink-on-pastel fills, pink collaborator underline) at build time; if a pair fails, shift the token everywhere — AA outranks palette attachment (SPEC §8.4, §13).
- Empty sections render as their sheet with label and empty body (no hints yet — teaching arrives in ticket 10).

Acceptance criteria:

- [x] The SPEC §3.1 reference example renders with every section populated correctly in the V5 layout.
- [x] All seven palette meanings render with fill + same-hue ink border; chips carry their glyphs.
- [x] Footer legend + attribution render on the sheet with working links.
- [x] AA contrast of the at-risk pairs is verified (documented check: `src/lib/sheet/contrast.test.ts`); the prototype's faint gray was shifted out of all text roles (it fails AA), replaced by `--color-ink-soft`.
- [x] The component is read-only and reusable outside the editor page.

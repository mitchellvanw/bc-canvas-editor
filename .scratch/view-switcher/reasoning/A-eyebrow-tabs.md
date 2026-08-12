# A — Eyebrow tabs (tabs as ink)

`src/lib/proto/ViewsA.svelte` · `?switcher=A` · `evidence/band-A-*.png`, `A-*.png`, `artifact-A*.png`

## Style

The tabs ride the title block's own eyebrow line, in the idiom already printed
there: Archivo 600 at 0.62rem, 0.24em letter-spacing, uppercase. The eyebrow
moves out of the sheet and into a **lip** — an ink bar that is the sheet's top
edge — with `BOUNDED CONTEXT CANVAS · V5` at one end and the three Views at the
other. In Sheet view the lip and the title block are one ink object; in JSON and
Markdown the lip stays and the panel below swaps.

## Design decisions

- **The ink block is already the loudest thing on the page**, so a switcher
  placed inside it adds no new voice. Every other direction adds a fifth object
  to a page that has four (chrome, title block, panels, footer).
- **The lip persists across all three Views.** That is the variant's real claim:
  the sheet's top edge is a constant, and the Views are what hangs below it.
- **Dimming is by colour, not opacity** (`rgb(253 253 251 / .5)`) — an opacity
  on the tab would drag the unapplied marker down with it, and that marker is
  at its most useful on the tab you are *not* looking at. First draft got this
  wrong and the marker was the faintest thing on the strip.
- **Focus ring inverts to sheet-white** (§8.4's 2px ring, ink→sheet on ink
  ground) with a 3px offset so it clears the selected tab's underline.

## Requirements mapping

| Ticket requirement | How it lands |
|---|---|
| Permanent, not hover-revealed | Always on the lip; never fades |
| Not chrome | Physically on the sheet, in the sheet's typeface, 60px below the chrome band |
| Responsive tiers | Eyebrow and tabs share one line down to the stack tier (`A-4-stack-sheet.png`); wraps gracefully via `flex-wrap` |
| Unapplied marker | Hotspot-pink `•` after `JSON`, full-strength on a dimmed tab |
| Artifact | Works with no editor around it (`artifact-A-sheet.png`) — arguably better there, since the lip is the only chrome the file has |
| Tablist semantics | `role="tablist"`, one tab stop, arrows select, panels wired both ways — asserted in `shoot.mjs` |

## Trade-offs

- **Gains:** quietest of the four in situ; no new object on the page; the
  persistent lip gives the JSON and Markdown Views an identity instead of
  leaving them as bare boxes on cream.
- **Costs:**
  - It **reaches into `CanvasSheet`** — the sheet's own eyebrow is suppressed
    and the title block's top corners square off. Real build moves the tabs
    into `CanvasSheet`'s `<header>` rather than overlaying, which means the
    shared sheet component grows a switcher seam it does not have today.
  - **The canvas name is absent from the JSON and Markdown Views** — the name
    lives in the title block, which belongs to the Sheet. Visible in
    `band-A-json.png`. Open interpolation: let the lip carry the name too.
  - **Script-less artifact degrades worst of the four.** The strip ships
    `hidden`, so the lip becomes an empty ink bar carrying only an eyebrow,
    orphaned above the title block that has its own (`artifact-noscript.png`).
    Either the whole lip ships hidden — losing the eyebrow — or the artifact
    uses a different strip from the editor, which breaks the "one idiom"
    premise of requirement 3.

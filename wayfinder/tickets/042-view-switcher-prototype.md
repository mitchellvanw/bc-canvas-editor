---
name: view-switcher-prototype
title: "Prototype: the view switcher on the sheet's top edge"
labels: [wayfinder:prototype]
status: closed
assignee: mitchell
blocked-by: []
---

## Question

What do three tabs look like on a sheet whose entire visual argument is that it is a quiet piece of paper? Make it, react to it — this is a look-at-it question, not a describe-it question.

**The constraint that makes it hard.** `SPEC.md` §5 is a warm cream ground with near-white sheets and a whisper of shadow; §6 says the presentation view carries *zero* editing chrome and affordances materialize on approach. A tab bar is permanent chrome by definition — it cannot fade in on hover, because you need it to discover the other Views exist. So the question is how a permanently visible switcher sits on that paper without becoming the loudest thing on it. Candidate directions worth drawing rather than arguing: tabs as part of the paper (a folder edge, the sheet's top margin), tabs as ink (the title block's spaced-caps eyebrow idiom, which already exists and is already quiet), and tabs as a segmented control set into the gutter above the sheet.

**It is not in the chrome, and that is settled** — the chrome is file verbs and "Markdown" beside "Export" would read as a fourth export. But the switcher and the chrome share a horizontal band of screen, so draw them together; a control that looks right in isolation and reads as chrome in situ has failed.

**Four things the drawing has to survive:**

1. **The responsive tiers.** The editor floors at 1080px and reflows by the sheet container's width through trim / two-column / one-column tiers (§5). Show the switcher at the floor and in each tier.
2. **The unapplied-buffer marker.** [json-buffer-prototype](wayfinder/tickets/043-json-buffer-prototype.md) needs somewhere to say the JSON tab holds text that is not the canvas yet. That marker most likely lives on the tab, so leave a considered place for it rather than discovering later that there is none. The two prototypes are deliberately ordered so this one hands that answer over.
3. **The artifact.** [artifact-views](wayfinder/tickets/047-artifact-views.md) reuses this idiom in a read-only file with three tabs and no editing anywhere. Draw the artifact's version too — if the control only makes sense with an editor around it, it is the wrong control.
4. **Tablist semantics.** §8 commits to full keyboard operability, and the artifact commits to AA. Real `role="tablist"` with arrow-key selection, one tab stop for the set, panels associated. The drawing should make the focus ring (§8.4, 2px ink ring on `:focus-visible`) look deliberate rather than bolted on.

Also decide, with the drawing in hand, what the three tabs are **called**. "Sheet · JSON · Markdown" is the working set and probably right — "Canvas" for the first would collide with the document itself, and "Digest" is MCP jargon that never surfaces to a user. `writing-copy` on the final strings.

Prototype under `.scratch/`, per the repo's habit; link it from the resolution.

## Resolution

**The switcher is a segmented control in the gutter above the sheet** — variant
C. Four directions were drawn in situ on the real route with real chrome, real
example data and real serializer/digest bytes; the primary source is branch
`prototype/view-switcher` (`src/lib/proto/`, `?switcher=A|B|C|D`), with evidence
and a REASONING doc per variant in `.scratch/view-switcher/`.

### The answer

- **Placement:** left-aligned in the gutter band above the sheet, at the sheet's
  own left edge. Not on the sheet, not in the chrome.
- **Form:** one segmented pill in the chrome's button idiom — 4px radius, 1px
  `--color-line` border, sheet fill, 1px dividers, Archivo 500 at 0.8rem — with
  the active segment filled ink at weight 600.
- **The title block does not persist.** It belongs to the Sheet View; the JSON
  and Markdown Views replace it along with everything else below the pill. This
  was the fork the drawing exposed and it falls out of the placement: a switcher
  that sits *above* the sheet switches the whole sheet, title block included.
- **`CanvasSheet` is untouched.** The decisive practical property: the strip is
  a sibling of the sheet, so the component shared with the offscreen artifact
  mount and the PNG capture region grows no switcher seam. A and B both had to
  square the title block's corners; A also had to suppress its eyebrow.
- **Focus ring is inset** (`outline-offset: -2px`) — an outset §8.4 ring breaks
  the pill's edge.
- **The unapplied marker** (handed to [json-buffer-prototype](wayfinder/tickets/043-json-buffer-prototype.md)):
  a trailing hotspot-pink `•` inside the JSON segment, with a visually-hidden
  ", unapplied changes" after the label. There is room for it and it does not
  reflow the pill.

### The chrome-resemblance risk is accepted, not solved

Held beside Import…/Examples/Export the pill is plainly the same family — same
border, radius, fill and face. The charting session ruled the switcher out of
the chrome for exactly this reason, and this variant does not escape the
resemblance; it is accepted in §6's "known accepted risks — soften in build,
don't change the model" tradition, and **§6 gains a fourth entry saying so**.

Two things bound it, both from the drawing:

- **It bites hardest at the stack tier** (`evidence/C-4-stack-sheet.png`), where
  the chrome wraps and the pill lands directly under `Import…`. That is the shot
  to soften against.
- **It does not exist in the artifact at all.** An exported file has no chrome
  band, so there is nothing for the control to be confused with
  (`evidence/artifact-C-sheet.png`). The risk is editor-only. This only came out
  because requirement 3 forced the artifact version to be built — it had been
  skipped on the first pass as pre-judged, and building it changed the shape of
  the risk.

Softening levers for [editor-views](wayfinder/tickets/045-editor-views.md), none
of which change the model: transparent fill, dividers without the outer border,
smaller type, or a wider gap between the chrome band and the pill.

### The labels are deferred, deliberately

The ticket asked for the three names with the drawing in hand. **"Sheet · JSON ·
Markdown" carries as provisional** — it is what every variant was drawn with —
but the decision moves to [editor-views](wayfinder/tickets/045-editor-views.md),
where `writing-copy` runs over every new string and §10's table is amended in
one pass. `Canvas` stays ruled out (it is the document), `Digest` stays ruled out
(MCP jargon, per `CONTEXT.md`). 043 and 047 carry the provisional labels.

### What the drawing settled that nobody asked

- **All four variants passed tablist semantics identically** — `role="tablist"`,
  one tab stop, arrows select and move focus, panels wired both ways, asserted
  in `shoot.mjs` rather than eyeballed. Semantics did not discriminate; only
  looks did. The APG detail worth carrying: the keydown handler rides each tab,
  not the tablist, or the container wants a `tabindex` of its own.
- **The ticket's "the editor floors at 1080px" is stale.** Commit `f633bc4`
  replaced the floor with the trim tier; there is no floor and the page no
  longer scrolls horizontally. `SPEC.md` §5 is already correct. The strip was
  drawn at 1440 / 1080 / 900 / 660 and survives all four unchanged.
- **A script-less artifact must ship the strip `hidden`** and let the script
  unhide it — otherwise a JS-off viewer gets three dead buttons. Verified with
  `javaScriptEnabled: false`: all three panels visible, no live control. One
  loose end for [artifact-views](wayfinder/tickets/047-artifact-views.md): C's
  `.v-bar` wrapper survives as a 14px empty band once its strip is hidden, so
  the wrapper needs hiding too, not just the strip.
- **Two marker defects, found only by drawing them.** A's dot inherited the
  dimmed tab's opacity, making it faintest exactly when it had something to say
  (dim by colour, never opacity, on any tab that carries a marker); D's dot fell
  to a second line when placed outside an underlined `display:block` span.

### Evidence

`.scratch/view-switcher/` on `prototype/view-switcher`:

- `shoot.mjs` — 4 variants × 4 tiers × 3 Views, plus marker, focus-ring and
  semantics assertions (WebKit via Playwright; safaridriver stays admin-gated).
- `band.mjs` — the chrome-and-switcher band, cropped, which is the ticket's real
  test: a control that looks right in isolation and reads as chrome in situ has
  failed.
- `artifact.mjs` — a **real** artifact exported from the running app, with the
  strip and both text panels grafted on, in scripted and script-less pairs.
- `reasoning/{A,B,C,D}-*.md` — one per variant, including the losers' cases.

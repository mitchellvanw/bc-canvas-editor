---
name: view-switcher-prototype
title: "Prototype: the view switcher on the sheet's top edge"
labels: [wayfinder:prototype]
status: open
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

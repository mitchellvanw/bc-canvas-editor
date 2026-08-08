---
name: public-url-polish
title: "Grilling: what does a shared bc-canvas.pages.dev link deserve?"
labels: [wayfinder:grilling]
status: open
assignee:
blocked-by: []
---

## Question

Graduated from the map's fog by [live-verification](wayfinder/tickets/017-live-verification.md): the site is live and the checkpoint showed exactly how a shared link presents today. Decide what public-URL polish the app deserves:

- **Favicon:** the live `<head>` ships SvelteKit's default template favicon — the orange Svelte logo as an inline data URI (worse than the "no favicon" the fog assumed: it's someone else's brand). `src/lib/assets/favicon.svg` exists in the repo; decide what BC Canvas's own mark is and wire it.
- **Description/social metadata:** the page has a `<title>` (`Untitled — BC Canvas`, live-derived from the canvas name) but no `meta description`, no Open Graph/Twitter card. Decide what a pasted link should unfurl as — if anything; a tool this quiet may want equally quiet metadata.
- Anything else the shared-link experience needs, judged against the app's quiet-sheet character.

Note the title itself leads with "Untitled" for a fresh visit — decide whether that's charming or sloppy for a first impression.

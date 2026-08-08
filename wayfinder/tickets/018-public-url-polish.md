---
name: public-url-polish
title: "Grilling: what does a shared bc-canvas.pages.dev link deserve?"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: []
---

## Question

Graduated from the map's fog by [live-verification](wayfinder/tickets/017-live-verification.md): the site is live and the checkpoint showed exactly how a shared link presents today. Decide what public-URL polish the app deserves:

- **Favicon:** the live `<head>` ships SvelteKit's default template favicon — the orange Svelte logo as an inline data URI (worse than the "no favicon" the fog assumed: it's someone else's brand). `src/lib/assets/favicon.svg` exists in the repo; decide what BC Canvas's own mark is and wire it.
- **Description/social metadata:** the page has a `<title>` (`Untitled — BC Canvas`, live-derived from the canvas name) but no `meta description`, no Open Graph/Twitter card. Decide what a pasted link should unfurl as — if anything; a tool this quiet may want equally quiet metadata.
- Anything else the shared-link experience needs, judged against the app's quiet-sheet character.

Note the title itself leads with "Untitled" for a fresh visit — decide whether that's charming or sloppy for a first impression.

## Resolution

**Resolved 2026-08-08.** The shared link now presents as BC Canvas's own, in the app's register — nothing louder than a mark, a name, and one sentence. All of it pinned by `src/head.test.ts` (contrast.test.ts idiom: reads the shipped `src/app.html` and `static/` icons, the exact bytes the prerendered head is built from).

- **Favicon — the miniature quiet sheet.** BC Canvas's mark is the app itself at 64px: sheet-white tile (ink-faint border), the ink title block, the three message chips in command/query/event, a faint text rule. Hand-authored `static/favicon.svg` drawn *only* in quiet-sheet tokens — the test whitelists the palette and bans Svelte orange by name. WebKit renders no SVG favicons, so raster fallbacks ship beside it: `favicon.png` 48×48 (transparent corners) and `apple-touch-icon.png` 180×180 (full-bleed on paper cream; iOS masks its own corners), both rasterized from the SVG on Playwright WebKit (`.scratch/public-url-polish/rasterize-icons.mjs`). The template Svelte logo is deleted from `src/lib/assets/` and the test asserts it stays gone.
- **Metadata — a name and one sentence.** `meta description` + `og:description`, one documentary sentence: *"An editor for the ddd-crew Bounded Context Canvas. Runs in the browser; the canvas stays on your machine until you export it."* — what it is, plus the one fact a link-clicker actually wants (no account, nothing uploaded). `og:title` is **BC Canvas**. Deliberately absent: social-card image, `twitter:` tags, `og:url` — the unfurl is a title and a sentence, and the app shell stays origin-agnostic (nothing hardcodes `pages.dev`; the artifact-leak guarantee from ticket 017 is untouched). One addition beyond the ticket's list: `theme-color` set to the paper cream, lockstep-tested against the `--color-paper` token in `app.css`.
- **"Untitled — BC Canvas": charming, kept.** It's a document editor; an unnamed document is honestly Untitled, exactly like the file it will export. The sloppiness lived only in the unfurl layer — a pasted link leading with "Untitled" — and `og:title` fixes precisely that layer, so SPEC §10 stands unchanged and the tab title stays live-derived.
- All head tags live in `src/app.html` (static truths belong in the static shell); `+layout.svelte` lost its template-favicon `svelte:head`. Verified: svelte-check clean, full suite 291 green including the 8 new head assertions, and the built `build/index.html` head inspected — description, OG pair, theme-color, three icon links, then the prerendered live title.

Ships live on this push (main auto-redeploys per ticket 015); the favicon and an unfurl check (e.g. Slack paste) are an eyeball away after deploy.

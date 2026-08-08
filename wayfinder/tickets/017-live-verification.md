---
name: live-verification
title: "Task: live verification checkpoint"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [create-pages-project, deploy-repo-config, web-analytics]
---

## Question

The destination gate, run against the live `pages.dev` origin (not localhost) in the WebKit-checkpoint style the build tickets established:

- App loads and renders the quiet sheet; fonts self-hosted (no third-party requests beyond the analytics beacon).
- Core flows on the live origin: edit + autosave, Canvas-file export/import, HTML-artifact export → opens offline → re-imports, PNG export.
- Exported artifact carries no analytics beacon and no absolute references back to the live origin — it stays self-contained.
- `curl -sI` proofs: `/_app/immutable/*` returns the immutable cache-control header; the app shell does not.
- Preview policy holds: a push to a `prototype/*` or `research/*` branch produces no preview deployment; production redeploys on a push to `main`.
- Analytics dashboard shows the verification visits.

Resolved when every line passes; the answer records the checked list and any deviations. Passing this closes the map's destination.

## Resolution

**Resolved 2026-08-08. Every line passes — the destination gate is closed.** Run on Playwright WebKit against the production origin, driving the shipped UI (no `/src` imports — the localhost checkpoint's module-import trick doesn't exist on a bundled build). Scripts and evidence in `.scratch/live-verification/` (`live-checkpoint.mjs`, `import-json.mjs`, `evidence/` with screenshots and the exported artifacts).

- **Load + quiet sheet:** renders correctly (screenshot `live-quiet-sheet.png`); request audit saw exactly three hosts — `bc-canvas.pages.dev`, `static.cloudflareinsights.com`, `cloudflareinsights.com` — so nothing third-party beyond the beacon; all seven fonts served self-hosted from `/_app/immutable/assets/*.woff2`.
- **Core flows on the live origin:** rename → Enter committed and `bcc.autosave` carried the edit; Canvas-file export parsed back with the edited name (`version: 1`) and re-imported on a fresh live visit (no dialog, name and autosave restored); HTML-artifact export cleared Unexported changes, opened from `file://` in a fresh context with **every network route blocked — zero requests attempted**, fonts and layout intact (`artifact-offline.png`), and re-imported on the live origin; PNG export valid (magic bytes, 250 KB).
- **Artifact self-containment:** one `<script>` tag (the embedded Canvas file), no `cloudflareinsights`/`data-cf-beacon`, no `bc-canvas.pages.dev` reference. The only external URLs are content hyperlinks (ddd-crew attribution, CC BY 4.0, a tailwind comment) — links, not resources, as the zero-network offline open proves.
- **Header proofs (`curl -sI`):** `/_app/immutable/entry/start.DY1eItpc.js` and a font both return `cache-control: public, max-age=31536000, immutable`; `/` returns `public, max-age=0, must-revalidate`.
- **Preview policy + redeploy:** pushing this ticket's claim commit to `main` auto-triggered production deployment `3418e171` (green in ~1 min) — pushes to `main` repeatably redeploy. Probe pushes to `research/live-verify-probe` **and** `prototype/live-verify-probe` each produced a deployment *record* with `is_skipped: true`, all five stages `idle`, no aliases, and a 404 at the would-be preview URL — nothing built, nothing served. *Deviation of wording only:* Cloudflare does log a "Skipped" row in the deployments list rather than staying silent; the checklist's intent (no preview exists) holds. Probe branches deleted after.
- **Analytics:** this checkpoint's own visit fired the beacon — `beacon.min.js` 200, RUM POST **204** — so the verification visits are ingested. *Standing deviation from ticket 016:* the analytics API stays closed to the wrangler token, so the dashboard count itself remains Mitchell's eyeball on the Metrics tab.

**Surfaced for the map:** the live `<head>` ships SvelteKit's default template favicon (the orange Svelte logo, inline data URI) and no description/social metadata — sharper than the fog note assumed ("no favicon"); graduated into [public-url-polish](wayfinder/tickets/018-public-url-polish.md).

---
name: pages-deploy-mechanics
title: "Research: Cloudflare Pages deployment mechanics for this repo"
labels: [wayfinder:research]
status: closed
assignee: research-subagent
blocked-by: []
---

## Question

Pin down, from Cloudflare's primary docs, every fact the execution tickets need to run without guesswork:

- **Build config for SvelteKit `adapter-static`:** the framework preset to pick (or manual `npm run build` + output dir `build`), and the current Pages build image's default Node — this repo runs Vite 8 (needs Node ≥ 20.19), so confirm whether a `NODE_VERSION` pin is required and how to set it.
- **Preview controls:** the charting decision is *PR-previews only*, but Pages thinks in branches, not PRs — find the preview-branch include/exclude configuration that best approximates it (this repo accumulates `prototype/*` and `research/*` branches that must stay URL-less), and what a preview URL looks like.
- **`_headers`:** exact syntax and limits; the rule to give `/_app/immutable/*` a `cache-control: public, max-age=31536000, immutable`; what caching Pages already applies by default so we don't restate it.
- **Web Analytics on Pages:** the dashboard auto-injection toggle vs. a manual beacon snippet — which exists today, and whether injection happens at serve time (it must: the app exports self-contained offline HTML artifacts built client-side from an offscreen mount, and the beacon must never end up inside them).
- **Project naming:** any reserved-name or validation rules that could reject `bc-canvas` (DNS probe says unclaimed; fallbacks `bccanvas`, `bc-canvas-editor`).
- **Git integration:** GitHub App authorization scope (single-repo select is preferred), production-branch setting, free-tier build limits (builds/month, concurrent builds).
- **Exit ramp validation:** confirm `_redirects` supports absolute external targets with `301` and `:splat` (the future Workers-migration tombstone depends on it).

Findings land on branch `research/pages-deploy-mechanics` as `docs/research/pages-deploy-mechanics.md`. Feeds [create-pages-project](wayfinder/tickets/014-create-pages-project.md), [deploy-repo-config](wayfinder/tickets/015-deploy-repo-config.md), and [web-analytics](wayfinder/tickets/016-web-analytics.md).

## Resolution

Full findings: `docs/research/pages-deploy-mechanics.md` on branch `research/pages-deploy-mechanics` (commit `9cd964a`, 193 lines, source-cited, with a decisions-at-a-glance table and six logged doc ambiguities).

**Build config:** Pages v3 build image defaults to Node 22.16.0 — Vite 8 (`^20.19.0 || >=22.12.0`) needs **no pin**; a `.nvmrc` with `22` is recommended as drift insurance (`NODE_VERSION`-vs-file precedence is undocumented). **Preset trap:** the SvelteKit framework preset assumes adapter-cloudflare and sets output dir `.svelte-kit/cloudflare` — override output to `build`; `npm run build` is correct either way.

**Previews:** no "PRs only" option exists. Nearest: Custom branches with Include `*`, Exclude `prototype/*`, `research/*` (wildcards documented, excludes evaluated first); excluded pushes also produce no GitHub check runs.

**`_headers`:** verified by local build that `static/_headers` passes byte-for-byte into `build/_headers` under adapter-static 3.0.10. Pages' default is `max-age=0, must-revalidate` + ETag/304, so the only rule to write is `/_app/immutable/*` → `cache-control: public, max-age=31536000, immutable`.

**Web Analytics:** the one-click dashboard toggle is still documented; injection is a serve-time edge rewrite (strongly supported inference, flagged as such — community reports of dashboard drift logged). Independently verified in `src/lib/artifact/html.ts` that the export builder template-builds its own head and harvests only CSS text — **the beacon cannot leak into exported artifacts regardless of mechanism**, so [web-analytics](wayfinder/tickets/016-web-analytics.md) needs no new leak test if the toggle route works.

**Naming & integration:** no documented validation rules threaten `bc-canvas`, but collisions get a **silent random suffix** — check the URL at creation. GitHub App supports single-repo grant. Free tier: 500 builds/month, 1 concurrent build.

**Exit ramp:** `_redirects` supports `/* https://<host>/:splat 301`, but a `/*` rule shadows all static assets (documented, all-or-nothing) — exactly right for a tombstone, unusable for anything partial.

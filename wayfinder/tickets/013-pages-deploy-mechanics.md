---
name: pages-deploy-mechanics
title: "Research: Cloudflare Pages deployment mechanics for this repo"
labels: [wayfinder:research]
status: open
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

---
name: web-analytics
title: "Task: enable Cloudflare Web Analytics"
labels: [wayfinder:task]
status: open
assignee: mitchell
blocked-by: [pages-deploy-mechanics, create-pages-project]
---

## Question

Enable Cloudflare Web Analytics for the live site, by whichever mechanism [pages-deploy-mechanics](wayfinder/tickets/013-pages-deploy-mechanics.md) found current: the Pages dashboard toggle (HITL, Mitchell flips it) or a manual beacon snippet in `src/app.html` (AFK, committed to `main`).

**Hard rider:** the beacon must never appear inside exported self-contained HTML artifacts. Serve-time injection is clean by construction; if the snippet route is taken, prove the artifact builder (offscreen `CanvasSheet` mount) doesn't carry it — add the leak check to the artifact tests alongside the existing `?`-placeholder guard.

Resolved when a real visit shows up in the Web Analytics dashboard and the artifact leak check stands. Records the mechanism chosen and the beacon token's location.

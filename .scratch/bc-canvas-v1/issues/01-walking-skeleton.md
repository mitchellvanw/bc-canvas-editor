# 01 — Walking skeleton: scaffold, document model, editable title block

**What to build:** Opening the deployed app shows the quiet-sheet ground (cream paper, drafting grid) with the ink title block. The user clicks the context name, types, and blurs — the name commits, the title bar updates to `<name> — BC Canvas` (`Untitled — BC Canvas` when empty), and reloading the page restores what they typed. The narrowest complete path: render → inline edit → commit → autosave → restore.

**Blocked by:** None — can start immediately.

**Status:** implemented

Scope notes:

- SvelteKit (TypeScript) + Tailwind CSS v4, `adapter-static`, strictly client-side; deployable to Cloudflare Pages (SPEC §2).
- Self-host the three font families same-origin (Archivo, Source Serif 4, IBM Plex Mono — latin subsets, WOFF2).
- Establish the runtime document: exactly the Canvas file shape (all eleven section keys always present), with ephemeral `id` stamped on rows/lanes at load/creation (SPEC §6.1). This is the one model every later ticket edits.
- Establish the Commit pipeline: blur commits, Enter commits single-line fields, Esc reverts (SPEC §6) — wired here for the name field only, but built as the mechanism all fields will use.
- Autosave: serialize (ids stripped) to localStorage key `bcc.autosave` on every commit; on load restore the slot if present, else a blank canvas.
- Only the title block needs real visual treatment yet; the rest of the sheet may be absent.

Acceptance criteria:

- [x] Deployed static build renders the cream ground and title block with eyebrow "Bounded Context Canvas · V5".
- [x] Context name is editable in place; blur/Enter commit, Esc reverts; placeholder reads "Name this context".
- [x] Title bar tracks the name per SPEC §10.
- [x] Reload restores the last committed name from `bcc.autosave`.
- [x] Runtime document holds the full eleven-section Canvas shape with ephemeral ids.

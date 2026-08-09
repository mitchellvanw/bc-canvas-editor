# 11 — Multi-tab notice & unload flush

**What to build:** Closing or backgrounding the tab mid-edit never loses the field being typed — the app flushes a commit first, so reopening restores it. Opening the canvas in a second tab surfaces the persistent notice in both tabs: "This canvas is open in another tab. Whichever tab edits last overwrites the other — close one of them."

**Blocked by:** 05 — Inline text editing.

**Status:** ready-for-agent

Scope notes:

- `beforeunload`/`visibilitychange` flush commits any mid-edit field, then writes autosave (SPEC §6.1).
- Multi-tab is last-write-wins softened by the notice — no locking. Detection via the `storage` event on the shared `bcc.autosave` key; notice wording verbatim from SPEC §10.
- The notice is persistent (not a toast) and appears in both tabs; it is also announced once via the polite live region when it appears (SPEC §8.5 — coordinate with ticket 12 if the live region doesn't exist yet: the announcement hook can land here and wire up there).

Acceptance criteria:

- [ ] Type into a field, close the tab without blurring, reopen: the typed text is restored.
- [ ] Same for switching away (visibilitychange) on a backgrounded tab.
- [ ] Opening the app in a second tab shows the persistent notice in both tabs with the exact SPEC wording.
- [ ] No locking: both tabs remain editable; last write wins.

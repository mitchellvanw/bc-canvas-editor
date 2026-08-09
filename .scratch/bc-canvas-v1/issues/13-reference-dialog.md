# 13 — Reference dialog

**What to build:** Pressing ⌘/ (Ctrl+/ on Windows/Linux) or clicking the **Reference** control at the far end of the chrome opens a modal dialog titled **Reference**: the keyboard grammar in four clusters (Editing, Structure, Pickers, App) and the link line "Learn the method: the ddd-crew's Bounded Context Canvas". Esc closes; focus returns to the invoking control.

**Blocked by:** 01 — Walking skeleton.

**Status:** ready-for-agent

Scope notes:

- The app's single consult-and-dismiss teaching surface (SPEC §12); everything else teaches at point of use.
- Contents verbatim from the SPEC §12 tables — four clusters, then the link line to the ddd-crew repo. No method primer, no trait/relationship glossary, no additions.
- Chrome control tooltip `Reference (⌘/)`; modifier renders per platform (SPEC §10, §12).
- Proper modal dialog semantics: focus trapped while open, Esc closes, focus restored to the invoker.
- Content is static, so this only needs the chrome shell from ticket 01 — the shortcuts it documents land in other tickets; shipping the dialog before every shortcut exists is acceptable on the frontier, but final verification should confirm each documented key against the built behavior.

Acceptance criteria:

- [ ] ⌘/ and the chrome control both open the dialog; Esc closes; focus returns to the invoker.
- [ ] All four clusters and the link line match SPEC §12 exactly; the link opens the ddd-crew repo.
- [ ] Modifier keys render per platform.
- [ ] Dialog is keyboard-operable and announced as a modal dialog.

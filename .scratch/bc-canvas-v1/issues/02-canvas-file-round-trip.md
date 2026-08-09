# 02 — Canvas file round trip: import, export, unexported changes

**What to build:** The user exports their canvas as `<slug>.bcc.json`, opens a fresh browser, imports it, and continues where they left off. Editing shows the quiet **Unexported changes** indicator; exporting clears it. Importing or starting a new canvas over unexported changes asks first with the exact confirmation dialogs; files from a newer format version or unreadable files are refused with the exact notices and never touched.

**Blocked by:** 01 — Walking skeleton.

**Status:** implemented

Scope notes:

- Deterministic serializer per SPEC §3.2: 2-space indent, fixed key order, ids stripped, optional fields omitted (never null), all eleven section keys present — an unchanged canvas serializes byte-identically.
- Parser/validator + integer-version check + ordered raw-JSON migration pipeline (currently a no-op at version 1) per SPEC §3.3. Newer-version files refused; unparsable structures refused as "not a Canvas file" — exact strings in SPEC §10.
- Chrome controls per SPEC §10: **Import…**, **Export** menu (Canvas file entry live; HTML/PNG entries may be stubbed or absent until tickets 04/09), **New canvas**. File verbs are Import/Export, never Open/Save.
- File naming per SPEC §3.4: slugified name stem, `bounded-context-canvas` fallback, no date stamps.
- Unexported-changes state per SPEC §6.1: set on commit, cleared by Canvas-file export/import (later tickets extend clearing to HTML artifact, never PNG). Indicator: the two words "Unexported changes" near Export; nothing when clean.
- Both confirmation dialogs (Replace / Start new) verbatim from SPEC §10; on proceed, document replaced and undo history cleared — a session boundary. Without unexported changes, no ceremony.

Acceptance criteria:

- [x] Export → edit nothing → export again produces byte-identical files.
- [x] Export → import in a fresh profile restores the identical canvas; unexported changes cleared on both export and import.
- [x] A file with root version 3 is refused with the newer-version notice; the file and current canvas are untouched.
- [x] Garbage JSON / non-Canvas structure is refused with the not-a-Canvas-file notice.
- [x] Import and New over unexported changes show their confirmation dialogs; Cancel is a no-op; proceed replaces the document.
- [x] Downloaded filenames follow the slug rules.

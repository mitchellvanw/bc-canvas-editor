---
name: json-buffer-prototype
title: "Prototype: the JSON buffer — Apply, divergence, and the document moving underneath"
labels: [wayfinder:prototype]
status: closed
assignee: mitchell
blocked-by: [view-switcher-prototype]
---

## Question

Explicit Apply creates something this app has never had: a second piece of mutable state that can disagree with the document. Everything else in the editor commits on blur into one model (§6.1). The JSON View holds text that is *not yet* the canvas, for as long as the user likes. Build the state model as a throwaway and drive it until it stops surprising, because a spec paragraph will not catch what this gets wrong.

**Settled, and the prototype's job is to make it work rather than reopen it:** the box shows the exact export bytes and re-renders from the document; **Apply** parses and replaces the document as one commit, one undo step; the buffer is preserved for the session with a visible marker; a document change underneath **never overwrites** the buffer; there is no confirmation dialog when leaving with unapplied text.

**The transitions to drive, each one a case where "obvious" and "correct" may part:**

1. **Type, switch to Sheet, come back.** Buffer intact, marker still on the tab.
2. **Type, switch to Sheet, edit the sheet, come back.** The document has moved; the buffer has not. Both facts are true at once and the UI has to hold them without lying — the box is showing bytes that are neither the canvas nor a proposal against the current canvas.
3. **Apply, then ⌘Z.** One commit means one undo pops the whole replacement. What does the box show afterwards — the pre-Apply document's bytes, or the text the user typed? (The former follows from "the box re-renders from the document"; check that it doesn't feel like the app ate their edit.)
4. **Type, don't apply, then undo/redo from the Sheet.** §6.1 says ⌘Z is intercepted globally and reverts the *focused field* if it has uncommitted edits. A textarea with unapplied text is exactly that shape and exactly not that thing — decide whether ⌘Z inside the JSON box is native textarea undo, a buffer revert, or app history, and make the answer defensible rather than incidental.
5. **Another tab writes.** Last-write-wins plus the persistent notice (§6.1) — the document swaps under a live buffer. Nothing is lost, but confirm the marker and the box do not start lying about which is which.
6. **Apply with the buffer identical to the document.** A no-op should not land a commit — the pickers already learned this rule during the build (a pick that changes nothing does not enter history). Byte-compare before committing.
7. **Apply text that migrates.** A v1 document comes back as v2 bytes in the box. Confirm the re-render happens and reads as feedback rather than as the app rewriting what you typed.
8. **Flush interaction.** `flush.ts` commits mid-edit fields on `beforeunload`/`visibilitychange`. An unapplied buffer is explicitly *not* a mid-edit field and must not be flushed into the document — check that it isn't, by construction and not by luck.

**The marker the switcher handed over** ([view-switcher-prototype](wayfinder/tickets/042-view-switcher-prototype.md), closed): a trailing hotspot-pink `•` inside the JSON segment of the gutter pill, with a visually-hidden ", unapplied changes" after the label. It fits without reflowing the pill. What that ticket settled is *where the marker lives and what it looks like*; this one owns **when it is on** — which is the interesting half, since transitions 2 and 5 below are cases where the buffer diverges without the user having touched it. One rule carries over as a general finding: never dim a tab with `opacity`, because the marker goes down with it — dim by colour.

**What the prototype returns:** the state model in words (what states exist, what each transition does), the marker's on/off rule, and the ⌘Z answer from (4), which is the one that touches a signed-off rule. Autosave is worth an explicit sentence too: the buffer is never persisted, so a reload discards it — confirm that is what happens and that it is the right thing.

Prototype under `.scratch/`; link it from the resolution.

## Resolution

**The box is either following the canvas or disagreeing with it. There is no
third state.** The buffer is `text: string | null`; `null` means the box shows
the document's export bytes, non-null means it shows the user's text — and, by
invariant, text that is *not* those bytes. Typing the box back to exactly the
canvas drops the buffer rather than holding one that agrees with the document.

The prototype is branch `prototype/json-buffer`, `.scratch/json-buffer/` —
`json-buffer.js` (the liftable module), `world.js` (a stand-in editor with the
same commit pipeline as `document.svelte.ts`), and one double-clickable
`json-buffer.html` built by `build.mjs`, which esbuilds the page against the
app's own `$lib` so the parser, serializer and Markdown renderer in it are the
real ones. Eleven walkthroughs plus a native-undo probe, driven end to end in
WebKit by `drive.mjs`; every claim below is a row in
`evidence/transcript.md`.

### The state model

| | Following | Proposing |
| --- | --- | --- |
| `text` | `null` | the user's text, never equal to the document's bytes |
| the box shows | `serializeCanvas(doc)`, live | `text` |
| the marker | off | **on** |
| Apply | settles, no commit | parses; replaces, settles, or refuses |

Transitions, in full:

- **Any keystroke** → Proposing, unless the text now equals the document's
  bytes, in which case → Following. This is the marker's whole rule.
- **Apply, parsed and different** → commit the replacement, → Following.
- **Apply, parsed and identical** → → Following, **no commit**.
- **Apply, refused** → stay Proposing, hold the refusal.
- **The document moves** (sheet edit, undo, redo) → the state does not change.
  Following re-renders; Proposing is left alone.
- **The session boundary** (import, new, load example) → Following. The one
  thing that discards a proposal.
- **Reload** → Following. The buffer is never persisted.

### The marker's on/off rule

`text !== null`. It is not a flag anyone maintains — it *is* the buffer's
existence, because the buffer only exists while it disagrees. Consequences
worth having in writing: it goes on the instant you type and off the instant
you type it back (`Type it, then type it back`); it survives view switches, app
undo, another tab's write and a failed Apply; it goes off on every successful
Apply including the one that committed nothing. And per 042's finding, the
segment carrying it is dimmed by colour and never by `opacity`.

### ⌘Z, which is the one that touched a signed-off rule

**Inside the box it is the browser's own text undo, and this needs no code.**
`handleUndoShortcut` (`src/lib/editor/undo.ts:58`) already returns early for
`dialog, input, textarea`, so a real `<textarea>` keeps its native stack by
construction. That is also the right answer on the merits: §6.1's field-level
⌘Z is a synonym of Esc because a contenteditable's native undo would corrupt
the DOM around it — a plaintext textarea has no such problem, and its undo is
better at undoing typing than anything the app would write. Native undo fires
`input`, so the dot follows it out of its own accord (probed in WebKit: three
spaces typed, dot ON at 1982 bytes; ⌘Z, dot off at 1979).

**Outside the box, ⌘Z is app undo and the buffer is untouched.** Undo history
and the buffer are not the same stack; the buffer is not on a stack at all.

**Esc does nothing in the box** (Mitchell, this session). Its sheet meaning is
"revert this field to its last committed value" and the buffer has no committed
value; a single keystroke silently discarding a pasted document is exactly what
the no-confirmation-dialog decision was affordable *because* nothing else
discards the buffer.

### Apply, then ⌘Z, does not eat anyone's edit

Transition (3) resolves itself: a successful Apply returns to Following, so the
box shows the canvas re-serialized *before* the undo — your keystrokes were
already normalized away at the moment Apply succeeded. Undo therefore takes
nothing that Apply had not already taken, and Redo puts the applied canvas
back. The box following the document is also what makes a migration legible:
version 1 text in, version 2 bytes back, with `description` → `purpose` and the
collaborator now an object (`Apply a version 1 canvas`).

### The no-op test compares the *parse result*, not the raw text

The ticket said byte-compare before committing. Raw bytes are the easy half and
would miss the interesting one: reformatting the JSON, or reordering keys,
produces text that differs from the document while parsing to the document we
already have. `serialize(parse(text)) === serialize(doc)` is the test, and it
lands nothing in history — the pickers' rule applied to a whole document
(`Apply that changes nothing`: undo depth unchanged at 0, box snapped back to
the canvas's own formatting).

### Two corrections to the ticket's premises

- **Transition (5)'s premise is wrong: another tab writing does not move this
  tab's document.** `multi-tab.svelte.ts` answers a `storage` event with the
  notice and nothing else; `restore()` runs once, on mount. Last-write-wins is
  settled in the `bcc.autosave` slot, not on screen. So the buffer cannot be
  lied about here — nothing under it moves — and Apply simply writes this tab's
  canvas back over the slot, exactly as any commit did before the JSON View
  existed.
- **The transition list is missing the session boundary**, which is the only
  place a proposal is discarded. Import, New and Load example clear the buffer,
  with no dialog (Mitchell, this session): the boundary already discards the
  whole undo history, and a proposal against a canvas that is no longer open
  goes with it. The app keeps spending its one confirmation on unexported
  *canvas* changes.

### Applying over a canvas that moved says so

The sharpest thing the drive exposed: leave text in the box, edit the sheet,
come back and press Apply, and the sheet edit is replaced — because Apply is a
whole-document replacement, which it always was. One undo restores it and the
marker was on throughout, but nothing said what was about to happen.
**Mitchell's call: warn.** The buffer therefore carries a `basis` — the
document's bytes at the moment the proposal was born, fixed once and never
refreshed, so "the canvas changed since you started typing this" stays
literally true while you keep typing. `moved` is `basis !== docBytes`, and the
View says it in a line above Apply that blocks nothing
(`evidence/moved-notice.png`).

The basis is **not** a rebase point and does not make a proposal stale: there is
no merging here, and the text is always exactly "what the canvas becomes if you
press Apply", whatever the canvas is now. It answers one question. Because it
is a byte comparison it retracts and returns on its own — undo the sheet edit
and the line goes away, redo it and the line comes back (`The canvas moves
under the box`).

Provisional wording, `The canvas has changed since you started typing this.
Applying replaces it.` — the string belongs to
[editor-views](wayfinder/tickets/045-editor-views.md)'s `writing-copy` pass with
the rest of the View's §10 strings, not to
[json-refusal-copy](wayfinder/tickets/044-json-refusal-copy.md), which is scoped
to what a *failed* Apply says.

### The refusal's lifetime (its words are 044's)

A refusal is held on the buffer, survives the document moving underneath — it
is about the text, and the text did not move — and is cleared by the next
keystroke, because the text it names has stopped existing. Cleared by the next
Apply's outcome otherwise.

### Autosave and the flush

The buffer is never persisted: the `bcc.autosave` slot is the Canvas file
byte-for-byte and does not grow app-UI state. A reload therefore discards it,
which is right — the slot holds the canvas, never a proposal about it, and a
restored proposal would be text you did not type against a canvas you did not
leave. The unload flush cannot reach it **by construction**: `registerFlushable`
is opt-in per field and the JSON box is a plain `<textarea>` that uses no
`editableText` action, so there is nothing registered to flush.

### For the build (045)

- The buffer module lifts nearly as written; give it a `$state` home beside
  `document.svelte.ts` rather than inside a component, since the View unmounts
  on every switch and the buffer must not.
- Apply stays enabled while Following — pressing it settles and does nothing.
  Disabling it is available but was not needed to make the model behave.
- While Following, the box re-renders from the document live; caret and scroll
  position in that state are unexamined here.

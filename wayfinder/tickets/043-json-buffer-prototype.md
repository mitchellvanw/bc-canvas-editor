---
name: json-buffer-prototype
title: "Prototype: the JSON buffer — Apply, divergence, and the document moving underneath"
labels: [wayfinder:prototype]
status: open
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

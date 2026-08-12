---
name: json-refusal-copy
title: "Grilling: what the JSON view says when Apply fails"
labels: [wayfinder:grilling]
status: open
assignee:
blocked-by: [json-buffer-prototype]
---

## Question

Settle the exact words, and the exact scope of the amendment they make.

**The amendment, first.** [parse-refusal-detail](wayfinder/tickets/026-parse-refusal-detail.md) built one validator with two levels of disclosure: `reason` for the app, `detail` for a non-human caller. Its item 8 pins that decision with a test that mounts the real chrome, feeds it the most detailed refusal the parser can produce, and asserts the dialog contains **neither the detail nor any fragment of it**. The JSON View overturns nothing about that — the import dialog's two §10 sentences stay, and `import-refusal.test.ts` stays asserting exactly what it asserts — but it does become the one human-facing surface where `detail` is the right thing to show, because the user is looking at the very text the parser is complaining about. Write the amendment in the idiom `map.md` already uses for amended tickets, and make the boundary a sentence someone can apply without re-deriving it: *the detail goes where the offending bytes are on screen.*

**Three failure classes, three shapes:**

1. **Not JSON.** `parse.ts` already produces `the file is not valid JSON (<engine message>)`, and 026 kept the engine's position info deliberately because it is the most actionable thing there is. In a textarea it is more actionable still — decide whether the position becomes a line/column the user can act on, and whether the app points at it or merely says it.
2. **Valid JSON, wrong shape.** `inboundCommunication[1].messages[0].type: expected one of "command", "query", "event", got "notification"`. The path convention is "what a developer would type" (026 item 2) and it is already exactly right for this surface. Decide how it is framed — a bare monospace line, or a sentence wrapping it — and remember these strings were written as *clauses* that readers put into sentences of their own.
3. **Newer version.** Nothing to hand-fix; the existing §10 sentence ("It was exported with format version 3; this app reads up to version 2…") is the whole answer, minus the "The file hasn't been touched" clause, which is about a file. Decide its wording here.

**Then the placement and the manners:**

- **Inline, non-modal, beside or beneath the textarea** — settled in charting. Where exactly, how it appears and disappears, and whether it survives the user switching tabs and coming back to the same unapplied buffer.
- **Does a failure announce?** §8.5 runs one polite live region and announces structural commits and non-local effects only. A failed Apply is neither, but it is also the case that a keyboard user pressing Apply gets no feedback at all if nothing announces. Decide, and write the string if there is one.
- **Does a successful Apply announce, and what does it say** — including the migration case, where the bytes in the box change under the user and something should probably say why.
- **What the Apply control is called and when it is disabled.** "Apply" is the working word. Disabled when the buffer matches the document, or always enabled with a no-op? (The prototype's case 6 has an answer; this ticket fixes the copy and the affordance.)

**What [json-buffer-prototype](wayfinder/tickets/043-json-buffer-prototype.md) settled, so it is not re-decided here:** the refusal's *lifetime* — held on the buffer, surviving the document moving underneath (it is about the text, and the text did not move), cleared by the next keystroke or by the next Apply's outcome. Item 4's affordance also has its answer: Apply stays enabled while the box follows the canvas and settles to nothing when pressed, so this ticket fixes only the word. And one string arrived that this ticket does *not* own — the line shown when the canvas has moved out from under an unapplied proposal ("The canvas has changed since you started typing this. Applying replaces it.", provisional) — because it is not a failure; it goes to [editor-views](wayfinder/tickets/045-editor-views.md) with the rest of the View's §10 strings.

`writing-copy` on every string; the result lands in `SPEC.md` §10 beside the other final strings, with the §3.3 disclosure bullet gaining the scope sentence.

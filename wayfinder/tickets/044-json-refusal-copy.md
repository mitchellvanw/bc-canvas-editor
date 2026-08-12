---
name: json-refusal-copy
title: "Grilling: what the JSON view says when Apply fails"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
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

## Resolution

**Two of the three failure classes are one string, and the third class's copy
turned out to depend on which door Apply knocks on.** Both findings came out of
the environment rather than the argument, and each one removed a decision the
ticket expected to make.

### The fact that broke a premise: WebKit's `JSON.parse` has no position

026 kept the engine message because "the engine's position info is the most
actionable thing there is." Probed in the repo's own WebKit build
(`playwright-core`, four malformed samples):

| engine | trailing comma on line 3 |
| --- | --- |
| V8 (Chrome/Node) | `Expected double-quoted property name in JSON at position 12 (line 3 column 1)` |
| WebKit (Safari) | `JSON Parse error: Property name must be a string literal` |

There is no position in Safari, which is where this app is developed and a
large share of where it runs. So the ticket's first question — "does the
position become a line/column the user can act on" — has no free answer.

**Decided: pass the engine message through, compute nothing, point at
nothing.** Printing V8's position when present would make a §10 final string
browser-dependent, which no other string in this app is. Computing a line
ourselves means a hand-written JSON scanner whose only output is a number —
a second parser in a codebase whose whole argument is that there is one, and
the same slope the map already walked away from when it refused CodeMirror.
And the app never *points*: selecting a range or scrolling the box means
moving the caret in text the user is mid-edit in.

### One lead for both `not-canvas` classes

Malformed JSON and wrong shape are one `reason` off one walk, differing only in
which `detail` comes back. They get one lead; the mono line is what
distinguishes them, and two leads would assert a difference the parser does not
make.

> **This text couldn't be read as a Canvas file.**
> `inboundCommunication[1].messages[0].type: expected one of "command", "query", "event", got "notification".`

Deliberately the import dialog's own sentence with "text" for "file", so the
amendment is legible in the copy itself: the same refusal, one line further.
The shape is **bold lead (the app's) + mono detail (the parser's, verbatim)**,
in the multi-tab notice's box — the app's one existing "standing statement, not
a toast" object — `role="note"`, beneath the textarea and above Apply. It
survives a view switch, because the text it names is still on screen unchanged
and hiding it would mean the box silently forgets it was refused.

No "nothing was applied" line. The dialog's "Nothing was imported" earns its
place because a file import is destructive; here the notice only exists on
failure, the marker is still on, and the box still holds the text.

### The door: `parseCanvasFile`, not `parseCanvasImport` — a narrowing of the map

`parseCanvasImport` (`parse.ts:367`) **throws the engine message away**: any
text failing the JSON door is re-reported as `expected a Canvas file (JSON) or
an HTML artifact carrying an embedded Canvas file; this text is neither`. 026
item 6 wrote that for a file picker, where the usual mistake is picking an HTML
file. In a JSON box the usual mistake is a dropped brace, and this would
replace the one actionable line with a sentence about file formats.

The map's Notes said Apply runs the full `parseCanvasImport` path, guarding
against "a second, stricter door." **`parseCanvasFile` is not a second door** —
it is the same validator with the same version check and the same ordered
migrations; `parseCanvasImport` (`parse.ts:360`) merely wraps it with HTML-embed
extraction. Strictness is byte-identical, so the map's concern is untouched.
The one thing given up is pasting a whole `.bcc.html` into the JSON box, which
is a file picker's affordance rather than a JSON box's. The map's Notes are
amended to say so rather than leaving the narrowing implied.

### Newer version, with the remedy that does not destroy the buffer

> **This text is from a newer version of BC Canvas.**
> It was exported with format version 3; this app reads up to version 2. Copy this text, reload the page to pick up the latest app, then paste it back.

"The file hasn't been touched" goes, per the ticket — there is no file. The
sharper edit is the remedy: reload discards the buffer (043), so the dialog's
"reload, then import again" would silently cost the user the text it is talking
about. Three steps in order, copy first.

### `parse.ts:49` reworded, and landed here

`the file is not valid JSON` → **`expected valid JSON`**. With Apply on the JSON
door the box shows this clause, and "file" is wrong in front of a textarea; for
an MCP caller "file" is right. The `expected …` idiom every other clause in the
file is written in is the one wording true for both, naming neither reader.
`parseCanvasImport`'s `startsWith(NOT_JSON)` guard is unaffected.

Landed in this ticket rather than deferred to
[editor-views](wayfinder/tickets/045-editor-views.md): it is a model-layer
constant with `parse.test.ts` already pinning its prefix in three places, it
ships on its own exactly as 026 did, and a decided string left uncommitted for
four tickets is how a decision quietly drifts. `mcp/dist/server.js` rebuilt, per
the committed-bundle staleness rule.

### The announcements

- **Failed Apply announces its lead sentence in full.** §8.5's letter covers
  structural commits and non-local effects, and a refusal is neither — but a
  keyboard user pressing Apply otherwise gets nothing at all. The path is never
  read aloud (a path spoken character by character is noise); the note sits in
  reading order right after the button for anyone who wants it. This is the one
  full sentence in a terse, type-led list, and §8.5 carries the reason so a
  future reader does not tidy it into `Apply refused`: every other announcement
  confirms something that just visibly happened, and this one is the only
  information its listener gets.
- **`Canvas replaced`**, beside `Canvas imported`.
- **`Canvas replaced, migrated from format version 1`** when the paste migrated,
  because the bytes in the box change under the user.
- **Nothing visible for the migration.** `version` is the first key
  `serialize.ts` writes (`serialize.ts:81`), so a v1 paste comes back showing
  `"version": 2` on line 2 of the box. A success notice would be a new object in
  the View, retracting on the next keystroke, for something the box already
  shows.
- **A no-op Apply announces nothing.** It commits nothing (043), so silence is
  honest.

### The control is still called Apply

Bare verb, matching the chrome's Import/Export register. It undersells a
whole-document replacement, and the weight is carried where it is needed — the
moved-canvas line above it (045's string), which only parses if the button says
Apply.

### The amendment, and where it landed

**§3.3**'s disclosure bullet gains the boundary in one sentence — *the detail is
shown where the offending bytes are on screen* — with both halves of the reason:
the import dialog withholds it because someone who picked the wrong file has no
text in front of them, the JSON View shows it because the path names a location
in the buffer they are looking at. It also records that the clause is worded for
both readers at once.

**§8.5** gains the refused-explicit-commit clause with its reason. **§10** gains
a **JSON View notices** block directly after *File-refusal notices* — the
adjacency is the argument, they are the same object one surface further in — and
the two Apply announcements join the live-region list. 045 will add the
moved-canvas line and the three tab labels to that block.

`import-refusal.test.ts` is untouched, asserting exactly what it asserted: the
import dialog shows the two §10 sentences and no fragment of the detail. Suites
green — 345 app tests, 85 MCP tests, `svelte-check` 0 errors.

---
name: cli-refusal-register
title: "Task: OutsideRoot from --out crashes raw instead of refusing in the CLI's voice"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: []
---

## Question

Found incidentally by [render-checkpoint](wayfinder/tickets/060-render-checkpoint.md) leg 5: `bcc render --out /tmp/x.svg <canvas>` with the out-path outside the root dies as an **uncaught `OutsideRoot`** — full Node stack trace, `Node.js v26` footer — on both the npx build and the current local bundle. The refusal sentence is right there in the error object ("outside the canvas root. Paths are relative to …, and a path out of it is not followed.") and never reaches the CLI's register, where every other refusal is a sentence and an exit code ([055](wayfinder/tickets/055-bcc-cli.md)'s three-code contract: this should be a 1, or arguably a 2 as a caller mistake — decide which while fixing).

Sweep `cli/src` for other paths where a thrown refusal escapes `run()` uncaught rather than being caught and printed — `--out` resolution is the one observed; the fix should cover the class, not the instance.

## Resolution

**Fixed, and the sweep found the class has three faces, of which the observed one was the flag.**

- **The decided code is 2.** The CLI already sorts refusals by where the path came from: a canvas *operand* outside the root comes back as a `readProblem` sentence and exit 1 while the run continues over the rest (pinned by an existing test), and every bad *option value* — `--height x`, `--out` with several canvases in reach, a `--root` that is not a directory — exits 2 with the command usage. `--out` outside the root is the second kind: the command as typed cannot partially succeed, it takes different words. The check sits in `main.ts` beside the flag's other refusals, and the sentence is `--out ` prefixed onto `OutsideRoot`'s own — the `--root ${requested}: ${why}` pattern one function up.
- **The second face is render's derived sibling target.** With no `--out`, the target is `outputPath(result.path)` — and a sibling `.bcc.html`/`.bcc.svg` that is a symlink pointing out of the root died with the same raw stack, unfixable at any flag because no flag was involved. Caught per canvas in `render.ts`: the problem line is `OutsideRoot`'s path-first sentence, the walk renders the remaining canvases, exit 1 — a derived path is a finding about one canvas, not a reason to drop the rest.
- **The third face never escapes — it is swallowed.** `check.ts` resolves the image path *inside* the `try` whose `catch` means "no image beside this canvas", so a committed image swapped for an out-pointing symlink silently reads as absent, exit 0. Left as it is and recorded instead: check only reads, and the state takes a symlink committed where an image was — but it is a quiet spot in the staleness guard, and loudening it into a refusal in its own right (the no-height case's register) is a one-line change if wanted.
- **The class guard is `main.ts`'s catch**: `OutsideRoot` now prints its sentence and exits 1 the way `NoBrowser` does, so a derived-path escape in some future command is a refusal rather than a `Node.js v26` footer. It has no known trigger today, deliberately — both known faces are caught closer to home.
- Two tests through the committed bundle: the `--out` instance at 2 with no stack frame on stderr, and the symlinked sibling at 1 with the other canvas still rendered and the file outside the root untouched. Bundle rebuilt and committed; no SPEC change, since three exits were already the contract and this makes two more paths honour it.
- **One rider beyond the ticket:** `bcc check`'s singular success line read *"1 canvas check out."* — fixed with the idiom the image line beside it already uses (the verb inflected inside `plural()`'s noun slot), pinned by the no-image test.

---
name: draft-canvas-from-docs
description: Draft a Bounded Context Canvas from what a project's documents say. Use when the user asks for a canvas of a service, module, or bounded context drawn from its specs, ADRs, README, tickets or wiki, or wants a documented boundary drafted for correction.
---

# Draft a canvas from docs

A drafted canvas is a starting point the human corrects, not an output. Its worth is that every row can be defended by pointing at a passage — and a passage, unlike code, was written by somebody on a day, so what it defends is that this was decided, not that it is still so.

`bcc_explain` holds the method and the vocabularies; the `bcc` command holds the files. If `bcc_explain` is missing the server is not connected; if `bcc` is not found it is not installed. This plugin's README covers both.

## Ground rules

- **Every row quotes a document.** Keep the file and the heading beside each row as you draft: a Canvas file has nowhere to record where a row came from, so the sourcing survives only in what you hand over. A row you cannot quote is a question, not a row.
- **Judgment is written down or it is open.** `bcc_explain('canvas')` names five sections a codebase cannot answer and says to leave them empty — that instruction is scoped to drafting from code alone, and this is the pass that can fill them. A document that *decides* fills the row and is quoted for it: an ADR decides, a charter classifies, a service-level target measures. A document that gestures at the same thing leaves the question open, because a filled row reads as a decision someone made.
- **Disagreement is an open question with both sides named.** Two documents that contradict each other do not resolve by the newer one winning, and a claim the code does not keep does not resolve by a silent correction. Where the documents say something the code can settle — a handler a spec promises, an event a README says goes out — check it, because a promise the code does not keep is the most useful thing this pass finds.
- **The documents' vocabulary names the context.** A glossary is the ubiquitous language section's first draft, and a term the whole system shares usually means something narrower inside this boundary. That narrowing is a question for the human, not an edit you make.

## Steps

1. Gather before you draft: the README, the spec, the ADRs, whatever glossary the repo keeps, the tickets or RFCs that argued the design, API references, runbooks. Read until the boundary's traffic is accounted for and you can say where the documents stop — the draft is only as good as this pass. Where the sources sit outside the repo, in a wiki or a vendor's API reference, the `research` skill puts a background agent on the reading and gets back cited findings; that is this step delegated, not a different one.
2. Call `bcc_explain('canvas')`, then `bcc_explain` per section as you fill it, for what each row carries.
3. Read the neighbouring canvases as context: `bcc ls` lists them with what each context is for, and `bcc_read_canvas` gives you one as prose. A collaborator that already has a canvas is named the way its own canvas names it.
4. Cross-check before you write, in the two places documents go wrong. Against the code, for the claims about traffic it can settle — `draft-canvas-from-code` is this same draft run from the other evidence, and worth running instead when the documents turn out to be thinner than the code. Against the repo's own glossary, for the terms it already defines — where the canvas and the glossary disagree, this draft records the disagreement and asks; `domain-modeling` is how a glossary changes.
5. Write the file, then run `bcc fmt <path>` — it rewrites the canonical bytes and refuses anything that is not a Canvas file. Read it back, and hand the draft over with its Open questions on top — asked, not answered — every filled row named with the document behind it, so the human corrects a sourced draft rather than an assertion. The human's corrections are the second half of the draft. A boundary its documents barely cover is a workshop rather than a draft: say so, and `canvas-workshop` is the session to run.

Done when every filled row traces to a passage you can quote, every disagreement between two documents or between a document and the code is an open question naming both sides, the sections no document decides sit under Open questions, and the human has the draft with its questions put to them.

---
name: canvas-workshop
description: Facilitate a Bounded Context Canvas session with a human, one section at a time. Use when the user wants to run a canvas workshop, fill in a canvas together, or work through an existing canvas section by section.
---

# Canvas workshop

You facilitate; the human decides. Every sentence that lands on the sheet is theirs.

Two surfaces carry the method, so you carry only the conversation. `bcc_explain` holds the section questions and the vocabularies; the `bcc` command holds the files — `bcc ls` for what is here, `bcc fmt` for putting one back in the form the editor reads. If `bcc_explain` is missing the server is not connected; if `bcc` is not found it is not installed. This plugin's README covers both.

## Setup

1. Pick the canvas with the human: `bcc ls` shows what is here, what each context is for, and how far along it is. An existing canvas continues from its current state; a new one starts empty. Agree the file path before anything is written.
2. Call `bcc_explain('canvas')`. The sheet's order it describes is the session's agenda.

## Each section, in the sheet's order

1. Call `bcc_explain` for the section and put its question to the human in your own words — one question at a time, as a facilitator speaks, not as a form reads.
2. Transcribe the answer in the human's vocabulary. Their terms are the point of the exercise; tighten wording only when they ask.
3. When the human defers or cannot answer yet, record that under Open questions. A deferred answer is content; a silently blank row loses it.
4. Write the whole file back, then run `bcc fmt <path>`. It rewrites the canonical bytes and refuses anything that is not a Canvas file, so a section you have malformed is caught here rather than when the human next opens the editor.
5. Read the file back from disk before opening the next section. Every rewrite starts from disk truth, never from your memory of the last write.

## Close

Read the finished sheet back the way a reviewer would: what is filled, what sits under Open questions — and put those open questions to the human once more. Apply their corrections, write, and read back one last time. `bcc ls` names any section still empty.

Review it yourself rather than handing it off, because you were in the room: you know which rows the human said and which you drafted, and a Canvas file does not record that. `canvas-reviewer` reads the file with no such memory, which is what makes it the right reviewer for a canvas you did not facilitate and the wrong one for this.

Done when every section has been visited and each is either filled in the human's words or accounted for under Open questions, and the final write has been read back from disk.

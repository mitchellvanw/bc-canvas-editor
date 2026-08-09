---
name: canvas-workshop
description: Facilitate a Bounded Context Canvas session with a human, one section at a time over the bc-canvas MCP tools. Use when the user wants to run a canvas workshop, fill in a canvas together, or work through an existing canvas section by section.
---

# Canvas workshop

You facilitate; the human decides. Every sentence that lands on the sheet is theirs. The `bcc_*` tools carry the method — the section questions, the vocabularies, the file's shape — so take content from the server and add only the conversation. If the tools are absent, the server is not connected; this plugin's README covers each host's entry.

## Setup

1. Pick the canvas with the human: `bcc_list_canvases` shows what exists. An existing canvas continues from its current state; a new one starts empty. Agree the file path before anything is written.
2. Call `bcc_explain('canvas')`. The sheet's order it describes is the session's agenda.

## Each section, in the sheet's order

1. Call `bcc_explain` for the section and put its question to the human in your own words — one question at a time, as a facilitator speaks, not as a form reads.
2. Transcribe the answer in the human's vocabulary. Their terms are the point of the exercise; tighten wording only when they ask.
3. When the human defers or cannot answer yet, record that under Open questions. A deferred answer is content; a silently blank row loses it.
4. Write the whole document back with `bcc_write_canvas` before moving on, then read the file back with `bcc_read_canvas` (`view: 'json'`) before opening the next section — every rewrite starts from disk truth, never from your memory of the last write.

## Close

Read the finished sheet back the way a reviewer would: what is filled, what sits under Open questions — and put those open questions to the human once more. Apply their corrections, write, and read back one last time.

Done when every section has been visited and each is either filled in the human's words or accounted for under Open questions, and the final write has been read back from disk.

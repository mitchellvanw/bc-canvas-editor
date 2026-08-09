---
name: draft-canvas-from-code
description: Draft a Bounded Context Canvas from what a codebase shows, over the bc-canvas MCP tools. Use when the user asks for a canvas of a service, module, or bounded context drawn from its code, or wants a starting-point canvas to correct.
---

# Draft a canvas from code

A drafted canvas is a starting point the human corrects, not an output. Its worth is that every row can be defended by pointing at code.

## Ground rules

- **Every row is evidence.** An inbound message is a handler that exists; an outbound message is an emit you can point to; a collaborator is a caller or callee you can name. A row you cannot back with a file is a question, not a row.
- **Judgment stays open.** `bcc_explain('canvas')` names the sections a codebase cannot answer — put those under Open questions rather than filling them, exactly as it says.
- **The code's vocabulary names the context.** Use the names the code uses — module names, event names, handler names — not improvements on them.

## Steps

1. Read the code first: entry points, handlers, emitted events, the callers and callees at the boundary. The draft is only as good as this pass; keep digging until the boundary's traffic is accounted for.
2. Call `bcc_explain('canvas')`, then `bcc_explain` per section as you fill it, for what each row carries.
3. Read the neighbouring canvases as context (`bcc_list_canvases`, then `bcc_read_canvas`): a collaborator that already has a canvas is named the way its own canvas names it.
4. Write with `bcc_write_canvas`, read the result back, and hand the draft over with its Open questions on top — asked, not answered. The human's corrections are the second half of the draft.

Done when every filled row traces to code you read, the judgment sections sit under Open questions, and the human has the draft with its questions put to them.

Everything on this page reads or writes one format:
`<name>.bcc.json`, a small, flat JSON file meant to be committed
beside the code it describes. It is deliberately boring — one key order, one indent,
one trailing newline — because boring is what diffs well.

- **The schema is this project's own, and versioned.** The root
  `version` is currently `2`; an older file is migrated up on
  read, in the editor and everywhere else, because everything reads through the one
  parser.
- **Eleven sections in a canonical order** — name, purpose, strategic
  classification, domain roles, inbound communication, ubiquitous language,
  business decisions, outbound communication, assumptions, verification metrics,
  open questions. The ddd-crew canvas, as data.
- **A canvas survives the round trip byte-identical.** Export → import
  → export writes the same bytes, and `bcc fmt` restores them for a file
  edited by hand. Honest diffs are the point: a canvas that churns bytes it does
  not mean cannot live next to code.
- **The name has to end `.bcc.json`.** That is what
  `bcc ls` globs on and what the editor's Import… accepts; a canvas
  saved as `shipping.json` is invisible to both. The directory and the
  rest of the name are yours.

The full schema, shape rules and migration story are in
[SPEC.md §3](https://github.com/mitchellvanw/bc-canvas-editor/blob/main/SPEC.md), with a complete reference
example.

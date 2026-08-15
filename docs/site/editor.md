One canvas, edited in place. There is no form beside a preview and no Save ahead of
an export: the sheet on the projector during the workshop is the file in the repo
after it. Blur commits a field, Esc reverts it, and everything else materializes on
approach.

### Three views of one canvas

**Sheet · JSON · Markdown** are tabs over the same document, not three
documents. The Sheet is where editing happens. The JSON view shows the exact bytes an
export would write, and is editable with an explicit **Apply** — one
commit, one undo step, validated by the same parser as import, so a pasted canvas
never replaces a good one halfway. The Markdown view is read-only, and only ever an
export.

### Nothing leaves the browser

:::note
Two tabs of the same browser share one autosave slot. The last tab to write wins, and both say so the moment there are two.
:::

No account, no server. The canvas autosaves to localStorage on every commit, but that
slot is a safety net, not storage — the durable form is the Canvas file you export.
The chrome keeps one score, **unexported changes**: has this canvas left
the browser in a form that can come back? Exporting or importing a Canvas file or
HTML artifact clears it; PNG, SVG and Markdown never do, because none of them could
bring the canvas back. Anything that would replace a canvas still carrying
unexported changes — an import, an example, a blank sheet — asks first. That is the
app's only dialog.

### Undo, by commit

Every accepted change — a field committed on blur, one add, one removal, one
reorder — is one undo step. :kbd[⌘Z] undoes, :kbd[⇧⌘Z] redoes; mid-edit,
:kbd[⌘Z] reverts the field first. Importing or replacing the canvas is a
session boundary, not an edit: it clears history.

### Keyboard & the Reference

The whole sheet is operable from the keyboard — every add, removal, pick and
reorder. :kbd[⌘/] (Ctrl+/ on Windows and Linux) opens the
**Reference**: the shortcut list, and the ddd-crew's own material on
the method. Everything else the editor teaches in place — picker descriptions, the
placeholder questions in an empty section, the footer legend.

### Examples

Four invented domains ship in the **Examples** menu, from every section
filled to mid-workshop with the open questions still winning. The same files are
committed under [examples/](https://github.com/mitchellvanw/bc-canvas-editor/tree/main/examples) and re-import
as-is.

/**
 * The Excalidraw-style embedded Canvas file block (SPEC §9.1): the HTML
 * artifact carries the `.bcc.json` export byte-identically inside one script
 * tag, and the importer reads it back out. Byte-identity is safe because the
 * serializer unicode-escapes every `<` out of the JSON — so the block's own
 * close tag is always the first `</script>` in the document after the marker.
 */

const OPEN = '<script type="application/json" data-canvas-file>';
const CLOSE = '</script>';

/** Wrap a serialized Canvas file for embedding in the HTML artifact. */
export function embeddedCanvasBlock(json: string): string {
	return `${OPEN}\n${json}\n${CLOSE}`;
}

/**
 * Pull the embedded Canvas file back out of an artifact's text, exactly as
 * exported. Null when the document carries no block — the importer refuses
 * that like any other non-Canvas file.
 */
export function extractEmbeddedCanvas(text: string): string | null {
	const open = text.indexOf(OPEN);
	if (open < 0) return null;
	const start = open + OPEN.length;
	const close = text.indexOf(CLOSE, start);
	if (close < 0) return null;
	// The wrapper adds exactly one newline each side; the JSON itself never
	// starts or ends with whitespace, so trimming restores the exact bytes.
	return text.slice(start, close).trim();
}

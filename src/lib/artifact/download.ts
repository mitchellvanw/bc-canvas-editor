/** Deliver a Blob as a browser download — every export leaves through here. */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	// Safari has historically started downloads async; revoking immediately
	// after click() can hand it a dead URL. Give it a beat.
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

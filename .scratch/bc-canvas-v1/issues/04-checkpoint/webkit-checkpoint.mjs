// Ticket 04 checkpoint on Playwright WebKit 26.5: run the shipped PNG export
// path against the reference canvas in a deliberately narrow window, and
// bring the pixels home for inspection.
import { writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const APP = 'http://localhost:5173';
const OUT = new URL('./webkit-capture.png', import.meta.url).pathname;

const browser = await webkit.launch();
try {
	const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
	page.on('console', (m) => console.log('[page]', m.text()));
	await page.goto(APP, { waitUntil: 'networkidle' });

	// Seed the reference canvas into the autosave slot, reload to restore it.
	await page.evaluate(async () => {
		const { REFERENCE_FILE } = await import('/src/lib/model/reference.fixture.ts');
		localStorage.setItem('bcc.autosave', REFERENCE_FILE);
	});
	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.waitForSelector('h1');

	const result = await page.evaluate(async () => {
		const clicks = [];
		HTMLAnchorElement.prototype.click = function () {
			clicks.push({ href: this.href, download: this.download });
		};
		URL.revokeObjectURL = () => {};
		const { canvas } = await import('/src/lib/editor/document.svelte.ts');
		const { exportPngArtifact } = await import('/src/lib/artifact/png.ts');
		canvas.commit(() => {}); // dirty the doc: PNG export must leave this set
		const unexportedBefore = canvas.unexported;
		await exportPngArtifact(canvas.doc);
		if (clicks.length !== 1) throw new Error('expected 1 download click, got ' + clicks.length);
		const blob = await fetch(clicks[0].href).then((r) => r.blob());
		const dataUrl = await new Promise((res, rej) => {
			const fr = new FileReader();
			fr.onload = () => res(fr.result);
			fr.onerror = () => rej(fr.error);
			fr.readAsDataURL(blob);
		});
		const img = await new Promise((res, rej) => {
			const i = new Image();
			i.onload = () => res(i);
			i.onerror = rej;
			i.src = dataUrl;
		});
		return {
			download: clicks[0].download,
			width: img.naturalWidth,
			height: img.naturalHeight,
			windowInnerWidth: window.innerWidth,
			unexportedBefore,
			unexportedAfter: canvas.unexported,
			offscreenLeftBehind: document.querySelectorAll('.paper-ground').length,
			bytes: blob.size,
			userAgent: navigator.userAgent,
			dataUrl
		};
	});

	const { dataUrl, ...facts } = result;
	writeFileSync(OUT, Buffer.from(dataUrl.split(',')[1], 'base64'));
	console.log(JSON.stringify(facts, null, 2));
	console.log('PNG written to', OUT);
} finally {
	await browser.close();
}

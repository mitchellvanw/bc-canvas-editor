// Render checkpoint, legs 1 and 6 (wayfinder ticket 060), on Playwright WebKit
// against the shipped production build (vite preview).
//
//   leg 1 — identity: for each of the five specimens, Import… the canvas into
//           the live editor, Export → HTML artifact, and capture the download
//           bytes through the browser. Compared afterwards (in compare.sh)
//           against the .bcc.html the CLI wrote from the same canvas.
//   leg 6 — round trip: Export → Canvas file from the same session; the bytes
//           must equal the file that was imported (the CLI wrote them via fmt).
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { webkit } from 'playwright-core';

const SPECIMENS = new URL('./specimens/', import.meta.url).pathname;
const OUT = new URL('./evidence/exports/', import.meta.url).pathname;
const APP = 'http://localhost:4173/';
mkdirSync(OUT, { recursive: true });

const canvases = readdirSync(SPECIMENS).filter((f) => f.endsWith('.bcc.json'));

const browser = await webkit.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto(APP, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('h1');

// Capture downloads without letting them leave the page: anchor clicks are
// recorded, the blob read back through fetch + FileReader.
await page.evaluate(() => {
	window.__clicks = [];
	HTMLAnchorElement.prototype.click = function () {
		window.__clicks.push({ href: this.href, download: this.download });
	};
	URL.revokeObjectURL = () => {};
});

async function exportVia(item) {
	const before = await page.evaluate(() => window.__clicks.length);
	await page.click('button:has-text("Export")');
	await page.click(`[role="menuitem"]:has-text("${item}")`);
	await page.waitForFunction((n) => window.__clicks.length > n, before);
	const click = await page.evaluate(() => window.__clicks.at(-1));
	const body = await page.evaluate(async (href) => {
		const blob = await fetch(href).then((r) => r.blob());
		const fr = new FileReader();
		return new Promise((res, rej) => {
			fr.onload = () => res(fr.result);
			fr.onerror = () => rej(fr.error);
			fr.readAsDataURL(blob);
		});
	}, click.href);
	return {
		download: click.download,
		bytes: Buffer.from(body.split(',')[1], 'base64')
	};
}

for (const file of canvases) {
	const stem = file.replace(/\.bcc\.json$/, '');
	await page.setInputFiles('input[type="file"]', join(SPECIMENS, file));
	await page.waitForTimeout(300);

	const html = await exportVia('HTML artifact');
	writeFileSync(join(OUT, `${stem}.editor.bcc.html`), html.bytes);

	const json = await exportVia('Canvas file');
	writeFileSync(join(OUT, `${stem}.editor.bcc.json`), json.bytes);

	console.log(`${stem}: html ${html.bytes.length} B (${html.download}), json ${json.bytes.length} B (${json.download})`);
}

await browser.close();

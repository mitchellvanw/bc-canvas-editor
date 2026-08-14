// Identity gate re-run after the 063 sheet change (pattern: render-checkpoint
// identity.mjs): five specimens through the live editor's Export → HTML
// artifact, plus Export → SVG image for order-fulfillment, compared to the
// CLI's bytes / the committed image.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { webkit } from 'playwright-core';

const SPECIMENS = new URL('../render-checkpoint/specimens/', import.meta.url).pathname;
const CLI = new URL('./cli-out/', import.meta.url).pathname;
const OUT = new URL('./editor-out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const canvases = readdirSync(SPECIMENS).filter((f) => f.endsWith('.bcc.json'));

const browser = await webkit.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('h1');
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
	return Buffer.from(body.split(',')[1], 'base64');
}

let allSame = true;
for (const file of canvases) {
	const stem = file.replace(/\.bcc\.json$/, '');
	await page.setInputFiles('input[type="file"]', join(SPECIMENS, file));
	await page.waitForTimeout(300);
	const bytes = await exportVia('HTML artifact');
	writeFileSync(join(OUT, `${stem}.editor.bcc.html`), bytes);
	const cli = readFileSync(join(CLI, `${stem}.bcc.html`));
	const same = Buffer.compare(bytes, cli) === 0;
	allSame &&= same;
	console.log(`${stem}: editor ${bytes.length} B, cli ${cli.length} B — ${same ? 'IDENTICAL' : 'DIFFER'}`);
}

// SVG identity on one example: editor's fifth export vs the committed image.
await page.setInputFiles('input[type="file"]', join(SPECIMENS, 'order-fulfillment.bcc.json'));
await page.waitForTimeout(300);
const svgBytes = await exportVia('SVG image');
writeFileSync(join(OUT, 'order-fulfillment.editor.bcc.svg'), svgBytes);
const committed = readFileSync(new URL('../../examples/order-fulfillment.bcc.svg', import.meta.url).pathname);
const svgSame = Buffer.compare(svgBytes, committed) === 0;
allSame &&= svgSame;
console.log(`order-fulfillment svg: editor ${svgBytes.length} B, committed ${committed.length} B — ${svgSame ? 'IDENTICAL' : 'DIFFER'}`);

await browser.close();
process.exit(allSame ? 0 : 1);

// Editor Export → SVG image in both engines; compare against committed. Also
// read the offscreen-mount measurement rather than inferring it from the file.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { webkit, chromium } from 'playwright-core';

const SPECIMENS = new URL('../render-checkpoint/specimens/', import.meta.url).pathname;
const OUT = new URL('./editor-out/', import.meta.url).pathname;
const committed = readFileSync(new URL('../../examples/order-fulfillment.bcc.svg', import.meta.url).pathname);

for (const [name, engine, opts] of [['webkit', webkit, {}], ['chrome', chromium, { channel: 'chrome' }]]) {
	const browser = await engine.launch(opts);
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
	await page.setInputFiles('input[type="file"]', join(SPECIMENS, 'order-fulfillment.bcc.json'));
	await page.waitForTimeout(400);
	await page.click('button:has-text("Export")');
	await page.click('[role="menuitem"]:has-text("SVG image")');
	await page.waitForFunction(() => window.__clicks.length > 0);
	const click = await page.evaluate(() => window.__clicks.at(-1));
	const body = await page.evaluate(async (href) => {
		const blob = await fetch(href).then((r) => r.blob());
		const fr = new FileReader();
		return new Promise((res) => { fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
	}, click.href);
	const bytes = Buffer.from(body.split(',')[1], 'base64');
	writeFileSync(join(OUT, `order-fulfillment.${name}.bcc.svg`), bytes);
	const height = /height="(\d+)"/.exec(bytes.toString('utf8', 0, 600))?.[1];
	console.log(name, bytes.length, 'B, height', height, Buffer.compare(bytes, committed) === 0 ? 'IDENTICAL to committed' : 'DIFFERS from committed');
	await browser.close();
}

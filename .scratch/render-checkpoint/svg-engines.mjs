// The committed SVG through <img> in two engines, locally — is the empty
// Business Decisions box a WebKit thing or a github.com thing?
import { readFileSync } from 'node:fs';
import { chromium, webkit } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;
const svg = readFileSync(
	new URL('../../examples/order-fulfillment.bcc.svg', import.meta.url).pathname
);
const page64 = `data:text/html;base64,${Buffer.from(
	`<!doctype html><body style="margin:0"><img style="width:758px" src="data:image/svg+xml;base64,${svg.toString('base64')}">`
).toString('base64')}`;

for (const [name, engine, opts] of [
	['webkit', webkit, {}],
	['chrome', chromium, { channel: 'chrome' }]
]) {
	const browser = await engine.launch(opts);
	const page = await browser.newPage({ viewport: { width: 800, height: 760 } });
	await page.goto(page64);
	await page.waitForTimeout(2000);
	await page.locator('img').screenshot({ path: `${OUT}leg2-local-${name}.png` });
	console.log(name, 'done');
	await browser.close();
}

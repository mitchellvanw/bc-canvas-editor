// The ticket's acceptance probe: the re-rendered committed SVG through <img>
// at the README's 758px, WebKit and Chrome, natural size too.
import { readFileSync } from 'node:fs';
import { webkit, chromium } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;
const svg = readFileSync(new URL('../../examples/order-fulfillment.bcc.svg', import.meta.url).pathname, 'utf8');
const b64 = Buffer.from(svg).toString('base64');
const page758 = `<!doctype html><body style="margin:0"><img src="data:image/svg+xml;base64,${b64}" style="display:block;width:758px">`;

for (const [name, engine, opts] of [['webkit', webkit, {}], ['chrome', chromium, { channel: 'chrome' }]]) {
	const browser = await engine.launch(opts);
	const page = await browser.newPage({ viewport: { width: 758, height: 700 } });
	await page.goto(`data:text/html;base64,${Buffer.from(page758).toString('base64')}`);
	await page.waitForTimeout(1000);
	await page.screenshot({ path: `${OUT}verify-758-${name}.png`, fullPage: true });
	await browser.close();
	console.log(name, 'done');
}

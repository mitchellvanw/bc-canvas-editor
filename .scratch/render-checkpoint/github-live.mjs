// Leg 2 — the committed .bcc.svg on the real github.com, read back through a
// real browser: the README's image must have painted (naturalWidth > 0 means
// the SVG decoded and rendered, not merely downloaded), and its served bytes
// must be our committed bytes.
import { readFileSync, writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;
const REPO_PAGE = 'https://github.com/mitchellvanw/bc-canvas-editor';
const COMMITTED = new URL('../../examples/order-fulfillment.bcc.svg', import.meta.url).pathname;

const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 2000 } });
await page.goto(REPO_PAGE, { waitUntil: 'load', timeout: 60000 });

const img = page.locator('article img[alt*="Order Fulfillment"]').first();
await img.waitFor({ state: 'visible', timeout: 30000 });
await img.scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);

const facts = await img.evaluate((el) => ({
	src: el.currentSrc || el.src,
	naturalWidth: el.naturalWidth,
	naturalHeight: el.naturalHeight,
	renderedWidth: el.getBoundingClientRect().width,
	renderedHeight: el.getBoundingClientRect().height,
	complete: el.complete
}));
console.log(JSON.stringify(facts, null, 2));

await img.screenshot({ path: OUT + 'leg2-github-order-fulfillment.png' });

// The bytes github (via camo) actually serves, against the committed file.
const served = await page.evaluate(async (src) => {
	const r = await fetch(src);
	const buf = await r.arrayBuffer();
	return {
		contentType: r.headers.get('content-type'),
		bytes: Array.from(new Uint8Array(buf)).length,
		b64: btoa(Array.from(new Uint8Array(buf), (b) => String.fromCharCode(b)).join(''))
	};
}, facts.src);
const servedBuf = Buffer.from(served.b64, 'base64');
const committed = readFileSync(COMMITTED);
console.log('served content-type:', served.contentType, 'bytes:', servedBuf.length);
console.log('committed bytes:', committed.length);
console.log('byte-identical to committed:', servedBuf.equals(committed));

writeFileSync(
	OUT + 'leg2-github-facts.json',
	JSON.stringify({ facts, servedContentType: served.contentType, servedBytes: servedBuf.length, byteIdentical: servedBuf.equals(committed) }, null, 2)
);

if (!facts.complete || facts.naturalWidth === 0) {
	console.log('RED: the image did not paint on github.com');
	process.exit(1);
}
await browser.close();

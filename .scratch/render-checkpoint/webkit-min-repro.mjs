// Minimal repro: what does WebKit's SVG-as-image mode do with display:list-item
// and with plain sibling order? Same markup rendered via <img> and inline.
import { webkit, chromium } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
<foreignObject width="400" height="260"><div xmlns="http://www.w3.org/1999/xhtml" style="font:14px sans-serif">
<p style="margin:0;font-size:10px">EYEBROW P</p>
<h1 style="margin:0;font-size:20px">NAME H1</h1>
<ul style="margin:0;padding:0 0 0 20px"><li>li one</li><li>li two</li></ul>
<ul style="margin:0;padding:0;list-style:none"><li style="position:relative;padding-left:18px">bare li</li></ul>
<div>plain div after</div>
</div></foreignObject></svg>`;
const b64 = Buffer.from(svg).toString('base64');
const html = `<!doctype html><body style="margin:0">
<img id="i" src="data:image/svg+xml;base64,${b64}" style="display:block">
<hr>${svg}`;
const url = `data:text/html;base64,${Buffer.from(html).toString('base64')}`;

for (const [name, engine, opts] of [['webkit', webkit, {}], ['chrome', chromium, { channel: 'chrome' }]]) {
	const browser = await engine.launch(opts);
	const page = await browser.newPage({ viewport: { width: 420, height: 560 } });
	await page.goto(url);
	await page.waitForTimeout(800);
	await page.screenshot({ path: `${OUT}leg2-minrepro-${name}.png` });
	await browser.close();
	console.log(name, 'done');
}

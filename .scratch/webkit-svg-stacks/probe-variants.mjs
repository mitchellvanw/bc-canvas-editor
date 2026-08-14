// webkit-svg-stacks: verify the diagnosis (any self-painting layer — positioned
// element OR stacking context — paints unscaled in WebKit's SVG-as-image mode
// below natural size) and audition the candidate fixes before touching the sheet.
// Each variant is one small foreignObject SVG shown through <img> at 50% width;
// one screenshot per engine, eyeballed.
import { mkdirSync } from 'node:fs';
import { webkit, chromium } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const variants = [
	['control', `<p style="margin:0">plain text control</p>`],
	['pos-relative', `<p style="margin:0;position:relative">position:relative text</p>`],
	['opacity-06', `<p style="margin:0;opacity:0.6">opacity 0.6 text</p>`],
	[
		'fix-inline-marker',
		`<ul style="margin:0;padding:0;list-style:none"><li style="padding-left:18px"><span style="display:inline-block;width:7px;height:7px;margin-left:-18px;margin-right:11px;border-radius:2px;background:#333"></span>inline-block marker li</li></ul>`
	],
	[
		'fix-inline-marker-rotated',
		`<ul style="margin:0;padding:0;list-style:none"><li style="padding-left:18px"><span style="display:inline-block;width:7px;height:7px;margin-left:-18px;margin-right:11px;border-radius:2px;background:#c66;transform:rotate(14deg)"></span>rotated inline marker li</li></ul>`
	],
	['fix-color-mix', `<p style="margin:0;color:color-mix(in srgb, #000 60%, #f4efe4)">color-mix text</p>`]
];

const rows = variants
	.map(([name, body]) => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40" viewBox="0 0 360 40"><foreignObject width="360" height="40"><div xmlns="http://www.w3.org/1999/xhtml" style="font:16px sans-serif;background:#f4efe4">${body}</div></foreignObject></svg>`;
		const b64 = Buffer.from(svg).toString('base64');
		return `<div style="margin:4px 0"><code style="font:11px monospace">${name}</code><br><img src="data:image/svg+xml;base64,${b64}" style="display:block;width:180px;outline:1px solid #ccc"></div>`;
	})
	.join('');
const url = `data:text/html;base64,${Buffer.from(`<!doctype html><body style="margin:8px">${rows}`).toString('base64')}`;

for (const [name, engine, opts] of [
	['webkit', webkit, {}],
	['chrome', chromium, { channel: 'chrome' }]
]) {
	const browser = await engine.launch(opts);
	const page = await browser.newPage({ viewport: { width: 420, height: 560 } });
	await page.goto(url);
	await page.waitForTimeout(600);
	await page.screenshot({ path: `${OUT}variants-${name}.png` });
	await browser.close();
	console.log(name, 'done');
}
// second round appended below by editing variants — see probe-round2.mjs

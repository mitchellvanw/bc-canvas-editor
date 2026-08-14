// Round 2: mechanisms for the hotspot tilt that avoid a CSS transform layer.
import { mkdirSync } from 'node:fs';
import { webkit, chromium } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const variants = [
	['control', `<p style="margin:0">plain text control</p>`],
	[
		'clip-path-diamond',
		`<ul style="margin:0;padding:0;list-style:none"><li style="padding-left:18px"><span style="display:inline-block;width:9px;height:9px;margin-left:-18px;margin-right:9px;background:#c66;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)"></span>clip-path marker li</li></ul>`
	],
	[
		'inline-svg-rotated-rect',
		`<ul style="margin:0;padding:0;list-style:none"><li style="padding-left:18px"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 11 11" style="margin-left:-18px;margin-right:7px"><rect x="2" y="2" width="7" height="7" rx="2" fill="#F76BA3" stroke="#B92367" stroke-width="1" transform="rotate(14 5.5 5.5)"/></svg>inline svg rotated li</li></ul>`
	]
];

const rows = variants
	.map(([name, body]) => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40" viewBox="0 0 360 40"><foreignObject width="360" height="40"><div xmlns="http://www.w3.org/1999/xhtml" style="font:16px sans-serif;background:#f4efe4">${body}</div></foreignObject></svg>`;
		const b64 = Buffer.from(svg).toString('base64');
		return `<div style="margin:4px 0"><code style="font:11px monospace">${name}</code><br><img src="data:image/svg+xml;base64,${b64}" style="display:block;width:180px;outline:1px solid #ccc"><img src="data:image/svg+xml;base64,${b64}" style="display:block;outline:1px solid #eee"></div>`;
	})
	.join('');
const url = `data:text/html;base64,${Buffer.from(`<!doctype html><body style="margin:8px">${rows}`).toString('base64')}`;

for (const [name, engine, opts] of [
	['webkit', webkit, {}],
	['chrome', chromium, { channel: 'chrome' }]
]) {
	const browser = await engine.launch(opts);
	const page = await browser.newPage({ viewport: { width: 420, height: 700 } });
	await page.goto(url);
	await page.waitForTimeout(600);
	await page.screenshot({ path: `${OUT}round2-${name}.png` });
	await browser.close();
	console.log(name, 'done');
}

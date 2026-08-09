// Rasterize the BC Canvas favicon mark (wayfinder ticket 018) on Playwright
// WebKit — the same engine the checkpoints use. favicon.png keeps transparent
// corners; apple-touch-icon.png is full-bleed on the paper ground (iOS masks
// its own corners) with the drafting-grid-free cream, mark centered.
import { readFileSync, writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const STATIC = '/Users/mitchell/Projects/bc-canvas-editor/static';
const mark = readFileSync(`${STATIC}/favicon.svg`, 'utf8');

// Full-bleed apple-touch variant: paper ground, tile scaled to ~78% centered.
const inner = mark.replace(/<\/?svg[^>]*>|<title>.*?<\/title>/g, '');
const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#eae7de"/><g transform="translate(7.04 7.04) scale(0.78)">${inner}</g></svg>`;

const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });

async function shoot(svg, size, out, omitBackground) {
	const sized = svg.replace('width="64" height="64"', `width="${size}" height="${size}"`);
	await page.setContent(
		`<body style="margin:0;background:${omitBackground ? 'transparent' : '#fff'}">${sized}</body>`
	);
	const buf = await page.locator('svg').screenshot({ omitBackground });
	writeFileSync(out, buf);
	console.log(out, buf.length, 'bytes');
}

await shoot(mark, 48, `${STATIC}/favicon.png`, true);
await shoot(appleSvg, 180, `${STATIC}/apple-touch-icon.png`, false);
await browser.close();

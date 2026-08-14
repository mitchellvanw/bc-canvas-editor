// Bisect: which ingredient of the real SVG kills the .stack lists in WebKit's
// SVG-as-image mode? Each variant is drawn through <img> into a canvas and the
// Business Decisions panel region is read back as pixels.
import { readFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const svg = readFileSync(
	new URL('../../examples/order-fulfillment.bcc.svg', import.meta.url).pathname,
	'utf8'
);

const variants = {
	original: svg,
	'no-comments': svg.replace(/<!--.*?-->/gs, ''),
	'no-container-queries': svg.replace(/@container[^{]*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/gs, ''),
	'no-nbsp-entities': svg // placeholder slot, replaced below if needed
};
delete variants['no-nbsp-entities'];

const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1400 } });
await page.goto('data:text/html,<body></body>');

for (const [name, body] of Object.entries(variants)) {
	const painted = await page.evaluate(async (svgText) => {
		const img = new Image();
		img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)));
		await new Promise((res, rej) => ((img.onload = res), (img.onerror = rej)));
		const c = document.createElement('canvas');
		c.width = img.naturalWidth;
		c.height = img.naturalHeight;
		const ctx = c.getContext('2d');
		ctx.drawImage(img, 0, 0);
		// Business Decisions panel body, roughly: x 560..960, y 780..950 at 1440x1292
		const d = ctx.getImageData(560, 780, 400, 170).data;
		let dark = 0;
		for (let i = 0; i < d.length; i += 4) {
			if (d[i] < 120 && d[i + 1] < 120 && d[i + 2] < 120) dark++;
		}
		return { naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, darkPixels: dark };
	}, body);
	console.log(name.padEnd(22), JSON.stringify(painted));
}
await browser.close();

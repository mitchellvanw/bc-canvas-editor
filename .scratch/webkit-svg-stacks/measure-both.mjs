// sheetDocument height per engine, old sheet (HEAD bundle) vs new (current
// bundle), replicating cli/src/measure.ts's mechanism.
import { readFileSync } from 'node:fs';
import { webkit, chromium } from 'playwright-core';

const doc = JSON.parse(readFileSync(new URL('../../examples/order-fulfillment.bcc.json', import.meta.url).pathname, 'utf8'));
const mods = {
	old: await import(new URL('./render-old.js', import.meta.url).href),
	new: await import(new URL('../../src/lib/render/dist/render.js', import.meta.url).href)
};
// The canvas file's `canvas` shape vs CanvasDoc: use the CLI's parse? The
// render module takes a CanvasDoc; parse via the model in the bundle if
// exported, else pass file.canvas.
for (const [name, engine, opts] of [['webkit', webkit, {}], ['chrome', chromium, { channel: 'chrome' }]]) {
	const browser = await engine.launch(opts);
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	for (const [age, mod] of Object.entries(mods)) {
		const html = mod.sheetDocument(doc.canvas ?? doc);
		await page.setContent(html, { waitUntil: 'load' });
		await page.evaluate('document.fonts.ready');
		const h = await page.evaluate('document.documentElement.scrollHeight');
		console.log(name, age, h);
	}
	await browser.close();
}

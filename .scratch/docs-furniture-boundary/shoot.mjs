// PROTOTYPE driver, ticket 066. Shoot all four seam shapes, with the scoped
// stylesheet and again with it :global()-ised, and dump each shape's rendered
// section HTML so the DOM delta against today can be diffed.
import { webkit } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';

const APP = 'http://localhost:4173/proto-docs-seam';
const OUT = '.scratch/docs-furniture-boundary/shots';
mkdirSync(OUT, { recursive: true });

const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
const violations = [];
await page.addInitScript(() => {
	window.__csp = [];
	document.addEventListener('securitypolicyviolation', (e) =>
		window.__csp.push(`${e.violatedDirective}: ${e.blockedURI}`)
	);
});
await page.goto(APP, { waitUntil: 'networkidle' });

const click = (label) => page.click(`button.pill:text-is("${label}")`);
await click('source'); // hide the source pane for the screenshots

for (const [shape, label] of [
	['today', 'today'],
	['a', 'A · one body'],
	['b', 'B · fragments'],
	['c', 'C · directives']
]) {
	for (const css of ['scoped', 'global']) {
		await click(label);
		if (css === 'global') await click(':global() CSS');
		await page.waitForTimeout(250);
		const el = await page.$('.docs section');
		await el.screenshot({ path: `${OUT}/${shape}-${css}.png` });
		if (css === 'global') await click(':global() CSS');
	}
	// Dump the section's DOM for structural diffing.
	await click(label);
	const html = await page.$eval('.docs section', (n) => n.innerHTML);
	writeFileSync(`${OUT}/${shape}.html`, html);
	// And a per-shape count of what the section is made of.
	const census = await page.$eval('.docs section', (n) => {
		const c = {};
		for (const e of n.querySelectorAll('*')) {
			const k = e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : '');
			c[k] = (c[k] ?? 0) + 1;
		}
		return c;
	});
	console.log(shape, JSON.stringify(census));
}

violations.push(...(await page.evaluate(() => window.__csp.splice(0))));
console.log('CSP violations:', violations.length ? violations : 'none');
await browser.close();

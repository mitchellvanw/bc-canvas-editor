// Drive the built site under the new CSP in both engines, collecting every
// securitypolicyviolation and console error across the three pages and the
// editor's full export surface. Blobs are captured at createObjectURL — a
// fetch of a blob: URL would itself be a connect-src violation.
import { webkit, chromium } from 'playwright-core';

const APP = 'http://localhost:4173';
const EXPORTS = ['Canvas file', 'HTML artifact', 'PNG image', 'SVG image', 'Markdown'];

for (const [name, engine, opts] of [['webkit', webkit, {}], ['chrome', chromium, { channel: 'chrome' }]]) {
	const browser = await engine.launch(opts);
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	const violations = [];
	const errors = [];
	page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
	await page.addInitScript(() => {
		window.__csp = [];
		document.addEventListener('securitypolicyviolation', (e) =>
			window.__csp.push(`${e.violatedDirective}: ${e.blockedURI} @ ${e.sourceFile}:${e.lineNumber}`)
		);
	});
	const harvest = async () => violations.push(...(await page.evaluate(() => window.__csp.splice(0))));

	for (const path of ['/', '/docs']) {
		await page.goto(APP + path, { waitUntil: 'networkidle' });
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await page.waitForTimeout(600);
		await harvest();
	}

	await page.goto(APP + '/edit', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Examples' }).click();
	await page.getByRole('menuitem').nth(0).click();
	await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('Order Fulfillment'));
	await page.evaluate(() => {
		window.__sizes = [];
		const real = URL.createObjectURL.bind(URL);
		let last = null;
		URL.createObjectURL = (b) => { last = b; return real(b); };
		URL.revokeObjectURL = () => {};
		HTMLAnchorElement.prototype.click = function () {
			window.__sizes.push({ name: this.download, size: last?.size ?? 0 });
		};
	});
	const sizes = [];
	for (const item of EXPORTS) {
		const before = await page.evaluate(() => window.__sizes.length);
		await page.click('button:has-text("Export")');
		await page.click(`[role="menuitem"]:has-text("${item}")`);
		await page.waitForFunction((n) => window.__sizes.length > n, before, { timeout: 20000 });
		sizes.push(await page.evaluate(() => window.__sizes.at(-1)));
	}
	await harvest();
	await browser.close();

	console.log(`\n== ${name}`);
	console.log('exports:', sizes.map((s) => `${s.name}=${s.size}B`).join(' '));
	console.log('violations:', violations.length ? violations : 'none');
	console.log('console errors:', errors.length ? errors : 'none');
	if (violations.length || sizes.some((s) => !s.size)) process.exitCode = 1;
}

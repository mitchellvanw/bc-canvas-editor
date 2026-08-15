// The one leg only production can prove: the edge-injected analytics beacon
// loading and posting under the shipped CSP.
import { webkit } from 'playwright-core';
const browser = await webkit.launch();
const page = await browser.newPage();
const requests = [];
const failures = [];
page.on('request', (r) => requests.push(r.url()));
page.on('requestfailed', (r) => failures.push(`${r.url()} — ${r.failure()?.errorText}`));
await page.addInitScript(() => {
	window.__csp = [];
	document.addEventListener('securitypolicyviolation', (e) =>
		window.__csp.push(`${e.violatedDirective}: ${e.blockedURI}`)
	);
});
for (const path of ['/', '/edit', '/docs', '/no-such-page']) {
	await page.goto('https://bc-canvas.pages.dev' + path, { waitUntil: 'networkidle' });
	await page.waitForTimeout(1200);
	const v = await page.evaluate(() => window.__csp.splice(0));
	console.log(path, '→ violations:', v.length ? v : 'none');
}
const beacon = requests.filter((u) => u.includes('cloudflareinsights'));
console.log('beacon requests:', beacon.length ? beacon : 'NONE SEEN');
console.log('failed requests:', failures.length ? failures : 'none');
await browser.close();

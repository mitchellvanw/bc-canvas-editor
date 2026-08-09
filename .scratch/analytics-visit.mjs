// Web-analytics verification: real WebKit visit to the live site.
// Confirms the injected beacon script loads and its telemetry request fires.
import { webkit } from 'playwright-core';

const APP = 'https://bc-canvas.pages.dev/';

const browser = await webkit.launch();
try {
	const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
	const insights = [];
	page.on('response', (r) => {
		if (r.url().includes('cloudflareinsights.com'))
			insights.push({ method: r.request().method(), url: r.url(), status: r.status() });
	});
	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.waitForSelector('h1');
	// Give the beacon a beat to fire its POST after load.
	await page.waitForTimeout(5000);

	const dom = await page.evaluate(() => {
		const beacons = [...document.querySelectorAll('script')]
			.filter((s) => (s.src || '').includes('cloudflareinsights') || s.hasAttribute('data-cf-beacon'))
			.map((s) => ({ src: s.src, beacon: s.getAttribute('data-cf-beacon') }));
		return { title: document.title, beacons, userAgent: navigator.userAgent };
	});

	console.log(JSON.stringify({ dom, insights }, null, 2));
} finally {
	await browser.close();
}

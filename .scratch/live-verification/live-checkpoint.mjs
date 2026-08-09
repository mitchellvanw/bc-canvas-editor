// Live-verification checkpoint (wayfinder ticket 017) on Playwright WebKit,
// run against the production origin — drives the shipped UI, no /src imports.
import { mkdirSync, writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const APP = 'https://bc-canvas.pages.dev/';
const OUT = new URL('./live-checkpoint/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const NAME = 'Live Checkpoint';
const facts = {};
const browser = await webkit.launch();
try {
	const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

	// ── network audit: every request host, plus the analytics RUM exchange
	const requests = [];
	const rum = [];
	page.on('request', (r) => requests.push(r.url()));
	page.on('response', (r) => {
		if (r.url().includes('cloudflareinsights.com'))
			rum.push({ method: r.request().method(), url: r.url(), status: r.status() });
	});

	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.waitForSelector('h1');
	await page.waitForTimeout(5000); // let the beacon fire its POST

	facts.title = await page.title();
	facts.eyebrow = await page.textContent('.tb__eyebrow');
	await page.screenshot({ path: OUT + 'live-quiet-sheet.png', fullPage: false });

	const hosts = [...new Set(requests.map((u) => new URL(u).host))].sort();
	facts.hosts = hosts;
	facts.thirdPartyBeyondBeacon = hosts.filter(
		(h) => h !== 'bc-canvas.pages.dev' && !h.endsWith('cloudflareinsights.com')
	);
	facts.fontRequests = requests.filter((u) => /\.woff2?($|\?)/.test(u));
	facts.rum = rum;

	// ── edit + autosave: rename the canvas, Enter commits, check the slot
	const nameField = page.locator('[contenteditable][aria-label="Name"]');
	await nameField.click();
	await page.keyboard.press('Meta+a');
	await page.keyboard.type(NAME);
	await page.keyboard.press('Enter');
	await page.waitForTimeout(300);
	const slot = await page.evaluate(() => localStorage.getItem('bcc.autosave'));
	facts.autosave = {
		present: slot !== null,
		carriesEdit: slot !== null && slot.includes('Live Checkpoint')
	};

	// ── intercept downloads: record anchor clicks, keep blob URLs alive
	await page.evaluate(() => {
		window.__clicks = [];
		HTMLAnchorElement.prototype.click = function () {
			window.__clicks.push({ href: this.href, download: this.download });
		};
		URL.revokeObjectURL = () => {};
	});
	const exportVia = async (item) => {
		const before = await page.evaluate(() => window.__clicks.length);
		await page.click('button:has-text("Export")');
		await page.click(`[role="menuitem"]:has-text("${item}")`);
		await page.waitForFunction((n) => window.__clicks.length > n, before);
		const click = await page.evaluate(() => window.__clicks.at(-1));
		const body = await page.evaluate(async (href) => {
			const blob = await fetch(href).then((r) => r.blob());
			const fr = new FileReader();
			return new Promise((res, rej) => {
				fr.onload = () => res(fr.result);
				fr.onerror = () => rej(fr.error);
				fr.readAsDataURL(blob);
			});
		}, click.href);
		return { download: click.download, bytes: Buffer.from(body.split(',')[1], 'base64') };
	};
	const unexported = () =>
		page.evaluate(() => document.body.textContent.includes('Unexported changes'));

	facts.unexportedAfterEdit = await unexported();

	// ── Canvas file export
	const json = await exportVia('Canvas file');
	writeFileSync(OUT + json.download, json.bytes);
	const parsed = JSON.parse(json.bytes.toString('utf8'));
	facts.canvasFile = { download: json.download, name: parsed.name, version: parsed.version };

	// ── HTML artifact export (clears Unexported changes on success)
	const html = await exportVia('HTML artifact');
	const artifactPath = OUT + html.download;
	writeFileSync(artifactPath, html.bytes);
	const text = html.bytes.toString('utf8');
	facts.htmlArtifact = {
		download: html.download,
		bytes: html.bytes.length,
		scriptTags: (text.match(/<script/g) || []).length,
		mentionsInsights: text.includes('cloudflareinsights'),
		mentionsBeaconAttr: text.includes('data-cf-beacon'),
		mentionsLiveOrigin: text.includes('bc-canvas.pages.dev'),
		externalUrlRefs: [...new Set(text.match(/https?:\/\/[^"'\s<)]+/g) || [])],
		unexportedCleared: !(await unexported())
	};

	// ── PNG export (pixels only, never clears Unexported)
	const png = await exportVia('PNG image');
	writeFileSync(OUT + png.download, png.bytes);
	facts.png = {
		download: png.download,
		bytes: png.bytes.length,
		magicOk: png.bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
	};

	// ── re-import the exported HTML artifact on the live origin
	await page.setInputFiles('input[type="file"]', artifactPath);
	await page.waitForTimeout(500);
	facts.reimport = {
		dialogShown: await page.evaluate(() => !!document.querySelector('dialog[open]')),
		nameAfter: (await page.textContent('h1')).trim()
	};

	// ── open the artifact offline: fresh context, every network route aborted
	const offline = await browser.newContext();
	const attempted = [];
	await offline.route('**/*', (route) => {
		const url = route.request().url();
		if (url.startsWith('file://')) return route.continue();
		attempted.push(url);
		route.abort();
	});
	const opage = await offline.newPage();
	await opage.goto('file://' + artifactPath, { waitUntil: 'load' });
	await opage.waitForTimeout(1000);
	facts.offline = {
		title: await opage.title(),
		h1: (await opage.textContent('h1'))?.trim(),
		networkAttempts: attempted
	};
	await opage.screenshot({ path: OUT + 'artifact-offline.png' });
	await offline.close();

	console.log(JSON.stringify(facts, null, 2));
} finally {
	await browser.close();
}

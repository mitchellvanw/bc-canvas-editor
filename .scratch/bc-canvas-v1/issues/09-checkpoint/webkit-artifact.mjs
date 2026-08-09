// Ticket 09 checkpoint on Playwright WebKit: drive the production build's real
// UI end to end — dirty the reference canvas, export the HTML artifact (flag
// must clear) and the Canvas file (bytes must match the embedded block), open
// the artifact standalone with the network blocked, check AA structure /
// one-column stack / print pass, then re-import the artifact and refuse a
// plain HTML file.
import { readFileSync, writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const APP = 'http://localhost:4173';
const DIR = new URL('./', import.meta.url).pathname;

// The spec reference example, extracted from the shared fixture's template literal.
const fixture = readFileSync(new URL('../../../../src/lib/model/reference.fixture.ts', import.meta.url), 'utf8');
const REFERENCE_FILE = fixture.slice(fixture.indexOf('`') + 1, fixture.lastIndexOf('`'));

const failures = [];
function check(label, ok, detail = '') {
	console.log(`${ok ? 'ok ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
	if (!ok) failures.push(label);
}

const browser = await webkit.launch();
try {
	const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
	const page = await context.newPage();
	page.on('console', (m) => console.log('[app]', m.text()));

	// Seed the reference canvas into the autosave slot, reload to restore it.
	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.evaluate((file) => localStorage.setItem('bcc.autosave', file), REFERENCE_FILE);
	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.waitForSelector('h1');

	// Dirty the canvas through the live sheet: append to the description, Tab commits.
	await page.getByRole('textbox', { name: 'Description', exact: true }).click();
	await page.keyboard.press('End');
	await page.keyboard.type(' Extra.');
	await page.keyboard.press('Tab');
	check('editing shows Unexported changes', await page.getByText('Unexported changes').isVisible());

	// Export → HTML artifact through the real menu; the download is the artifact.
	await page.getByRole('button', { name: 'Export' }).click();
	const [artifactDownload] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('menuitem', { name: 'HTML artifact (.bcc.html)' }).click()
	]);
	check(
		'artifact filename',
		artifactDownload.suggestedFilename() === 'order-fulfillment.bcc.html',
		artifactDownload.suggestedFilename()
	);
	const artifactPath = DIR + 'order-fulfillment.bcc.html';
	await artifactDownload.saveAs(artifactPath);
	await page.waitForTimeout(100);
	check(
		'HTML export clears Unexported changes',
		!(await page.getByText('Unexported changes').isVisible())
	);

	// Export → Canvas file; its bytes must equal the artifact's embedded block.
	await page.getByRole('button', { name: 'Export' }).click();
	const [jsonDownload] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('menuitem', { name: 'Canvas file (.bcc.json)' }).click()
	]);
	const jsonPath = DIR + 'order-fulfillment.bcc.json';
	await jsonDownload.saveAs(jsonPath);

	const artifact = readFileSync(artifactPath, 'utf8');
	const canvasFile = readFileSync(jsonPath, 'utf8');
	const OPEN = '<script type="application/json" data-canvas-file>';
	const start = artifact.indexOf(OPEN) + OPEN.length;
	const embedded = artifact.slice(start, artifact.indexOf('</scr' + 'ipt>', start)).trim();
	check('embedded JSON byte-identical to .bcc.json export', embedded === canvasFile);
	check('credit comment near the top', artifact.slice(0, 400).includes('ddd-crew'));
	check(
		'license URL in the comment',
		artifact.slice(0, 400).includes('https://creativecommons.org/licenses/by/4.0/')
	);
	check('fonts inlined as data URIs', artifact.includes('data:font/woff2;base64,'));
	check('no live font URL left', !/url\([^)]*\.woff2\)/.test(artifact));

	// ---- the artifact standalone: file://, all network requests blocked ----
	const offline = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
	const art = await offline.newPage();
	const escaped = [];
	await art.route(/^https?:/, (route) => {
		escaped.push(route.request().url());
		route.abort();
	});
	await art.goto('file://' + artifactPath, { waitUntil: 'load' });
	await art.evaluate(() => document.fonts.ready);

	check('no network request escaped the artifact', escaped.length === 0, escaped.join(', '));
	check('lang tag', (await art.getAttribute('html', 'lang')) === 'en');
	check(
		'title',
		(await art.title()) === 'Order Fulfillment — BC Canvas',
		await art.title()
	);
	const structure = await art.evaluate(() => ({
		h1: document.querySelectorAll('h1').length,
		h2: document.querySelectorAll('h2').length,
		h3: [...document.querySelectorAll('h3')].map((h) => h.textContent.trim()),
		h1Text: document.querySelector('h1')?.textContent.trim(),
		legend: document.querySelector('[data-legend]')?.textContent.trim(),
		footer: document.querySelector('footer')?.textContent,
		srOnlyTypes: [...document.querySelectorAll('.msg .sr-only')].map((s) => s.textContent.trim()),
		gridColumns: getComputedStyle(document.querySelector('.grid')).gridTemplateColumns.split(' ')
			.length,
		archivo: document.fonts.check('700 1rem Archivo'),
		serif: document.fonts.check('1rem "Source Serif 4"'),
		mono: document.fonts.check('1rem "IBM Plex Mono"'),
		scrollX: document.documentElement.scrollWidth,
		description: document.querySelector('.area-description .panel__body')?.textContent.trim(),
		// The raw file legitimately contains these words inside the inlined app
		// CSS ([contenteditable] selectors); what must be clean is the DOM.
		affordanceLeak: document.querySelector('[contenteditable], [data-placeholder], button, input')
	}));
	check('no editor affordance leaked into the DOM', structure.affordanceLeak === null);
	check('one h1, the canvas name', structure.h1 === 1 && structure.h1Text === 'Order Fulfillment');
	check('nine h2 sections', structure.h2 === 9, String(structure.h2));
	check(
		'h3 collaborators',
		structure.h3.join(',') === 'Checkout,Notifications',
		structure.h3.join(',')
	);
	check('committed edit present', structure.description?.includes('Extra.'), structure.description);
	check('footer attribution inside', structure.footer?.includes('CC BY 4.0'));
	check('legend rendered', /command.*query.*event/s.test(structure.legend ?? ''));
	check(
		'glyph meanings also carried as text',
		structure.srOnlyTypes.includes('command,') && structure.srOnlyTypes.includes('event,'),
		structure.srOnlyTypes.join(' ')
	);
	check('12-column grid at desktop', structure.gridColumns === 12, String(structure.gridColumns));
	check('Archivo loaded from data URI', structure.archivo);
	check('Source Serif 4 loaded from data URI', structure.serif);
	check('IBM Plex Mono loaded from data URI', structure.mono);
	check('no horizontal scroll at 1600', structure.scrollX <= 1600, String(structure.scrollX));
	await art.screenshot({ path: DIR + 'artifact-desktop.png', fullPage: true });

	// Below the breakpoint: one column, reading order, no horizontal scroll.
	await art.setViewportSize({ width: 400, height: 900 });
	const narrow = await art.evaluate(() => ({
		gridColumns: getComputedStyle(document.querySelector('.grid')).gridTemplateColumns.split(' ')
			.length,
		scrollX: document.documentElement.scrollWidth,
		order: [...document.querySelectorAll('.grid > section')]
			.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
			.map((s) => s.querySelector('h2')?.textContent.trim())
	}));
	check('one column below the breakpoint', narrow.gridColumns === 1, String(narrow.gridColumns));
	check('no horizontal scroll at 400', narrow.scrollX <= 400, String(narrow.scrollX));
	check(
		'stacked in reading order',
		narrow.order.join(' | ') ===
			'Description | Domain roles | Inbound communication | Ubiquitous language | Business decisions | Outbound communication | Assumptions | Verification metrics | Open questions',
		narrow.order.join(' | ')
	);
	await art.screenshot({ path: DIR + 'artifact-narrow.png', fullPage: true });

	// Print pass: the grid gives way to unbreakable stacked sections.
	await art.setViewportSize({ width: 1600, height: 1000 });
	await art.emulateMedia({ media: 'print' });
	const print = await art.evaluate(() => ({
		gridDisplay: getComputedStyle(document.querySelector('.grid')).display,
		breakInside: getComputedStyle(document.querySelector('.grid > section')).breakInside
	}));
	check('print stacks the grid', print.gridDisplay === 'block', print.gridDisplay);
	check('print avoids splitting sections', print.breakInside === 'avoid', print.breakInside);
	await offline.close();

	// ---- re-import the artifact through the real Import… control ----
	await page.getByRole('textbox', { name: 'Description', exact: true }).click();
	await page.keyboard.type('Scribble. ');
	await page.keyboard.press('Tab');
	check('dirty again before re-import', await page.getByText('Unexported changes').isVisible());

	await page.setInputFiles('input[type="file"]', artifactPath);
	const gate = await page
		.getByText('Replace "Order Fulfillment"?')
		.waitFor({ timeout: 3000 })
		.then(() => true, () => false);
	check('confirmation gate on dirty import', gate);
	await page.getByRole('button', { name: 'Replace' }).click();
	await page.waitForTimeout(200);
	const restored = await page.evaluate(() => ({
		h1: document.querySelector('h1')?.textContent.trim(),
		description: document.querySelector('[aria-label="Description"]')?.textContent.trim()
	}));
	check('artifact import restores the canvas', restored.h1 === 'Order Fulfillment');
	check(
		'import restored the exported bytes, scribble gone',
		restored.description?.includes('Extra.') && !restored.description.includes('Scribble'),
		restored.description
	);
	check(
		'import cleared Unexported changes',
		!(await page.getByText('Unexported changes').isVisible())
	);
	check(
		'import cleared undo history',
		await page.getByRole('button', { name: 'Undo' }).isDisabled()
	);

	// ---- a plain HTML file (no embedded block) is refused ----
	const plainPath = DIR + 'plain.html';
	writeFileSync(plainPath, '<!doctype html><html><body><p>just a page</p></body></html>');
	await page.setInputFiles('input[type="file"]', plainPath);
	check(
		'plain HTML refused with the not-a-Canvas-file notice',
		await page.getByText("This file couldn't be read as a Canvas file.").isVisible()
	);
	await page.getByRole('button', { name: 'OK' }).click();

	console.log(
		failures.length === 0
			? '\nCHECKPOINT PASSED'
			: `\nCHECKPOINT FAILED: ${failures.length} — ${failures.join('; ')}`
	);
	process.exitCode = failures.length === 0 ? 0 : 1;
} finally {
	await browser.close();
}

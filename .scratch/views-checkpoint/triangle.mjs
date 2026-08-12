// Views checkpoint, part 1 (wayfinder ticket 048): the byte-identity triangle.
//
// For each of the four bundled examples, three Markdown strings are produced by
// three different paths and diffed as bytes:
//   app  — the `.bcc.md` export, taken off the real Export menu in the shipped
//          production build (vite preview, not the dev server)
//   art  — the Markdown panel inside an exported `.bcc.html`, read back out of
//          the file through a browser's DOM rather than un-escaped by hand
//   mcp  — `bcc_read_canvas`'s digest return from the committed dist/server.js
//
// Byte equality across all three is the only thing that proves "one renderer"
// held, rather than three renderers that happen to agree today.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { webkit } from 'playwright-core';

const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const OUT = new URL('./evidence/', import.meta.url).pathname;
const APP = 'http://localhost:4173/';
mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, 'triangle'), { recursive: true });

const CLIENT_PKG = join(REPO, 'mcp', 'node_modules', '@modelcontextprotocol', 'client');
const { Client } = await import(join(CLIENT_PKG, 'dist', 'index.mjs'));
const { StdioClientTransport } = await import(join(CLIENT_PKG, 'dist', 'stdio.mjs'));
const SERVER = join(REPO, 'mcp', 'dist', 'server.js');

const ROSTER = [
	{ name: 'Order Fulfillment', file: 'order-fulfillment.bcc.json' },
	{ name: 'Notifications', file: 'notifications.bcc.json' },
	{ name: 'Appointment Scheduling', file: 'appointment-scheduling.bcc.json' },
	{ name: 'Royalty Distribution', file: 'royalty-distribution.bcc.json' }
];

const fail = (msg) => {
	throw new Error(msg);
};
const facts = {};

// ── the app and artifact legs, in the shipped build ─────────────────────────
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(APP, { waitUntil: 'networkidle' });
await page.waitForSelector('h1');

const armExports = () =>
	page.evaluate(() => {
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

const legs = {};
for (const [index, example] of ROSTER.entries()) {
	await page.getByRole('button', { name: 'Examples' }).click();
	await page.getByRole('menuitem').nth(index).click();
	await page.waitForFunction(
		(name) => document.querySelector('h1')?.textContent?.includes(name),
		example.name
	);
	await armExports();

	const md = await exportVia('Markdown');
	const html = await exportVia('HTML artifact');
	writeFileSync(join(OUT, 'triangle', `app-${md.download}`), md.bytes);
	const artifactPath = join(OUT, 'triangle', `artifact-${html.download}`);
	writeFileSync(artifactPath, html.bytes);

	// The panel is read out of the written file through the DOM — the bytes a
	// reader of the artifact actually sees, not an un-escape performed here.
	const reader = await browser.newPage();
	await reader.goto('file://' + artifactPath);
	const panel = await reader.evaluate(
		() => document.querySelector('#view-panel-markdown pre')?.textContent ?? null
	);
	const panelIsPre = await reader.evaluate(
		() => document.querySelector('#view-panel-markdown pre')?.className ?? null
	);
	await reader.close();
	if (panel === null) fail(`${example.name}: the artifact has no Markdown panel`);
	writeFileSync(join(OUT, 'triangle', `artifact-panel-${example.file}.md`), panel);

	legs[example.name] = {
		mdDownload: md.download,
		app: md.bytes.toString('utf8'),
		artifact: panel,
		panelClass: panelIsPre
	};
}
await browser.close();

// ── the MCP leg, over stdio against the committed bundle ────────────────────
const root = join(tmpdir(), `bcc-views-triangle-${process.pid}`);
mkdirSync(root, { recursive: true });
for (const example of ROSTER)
	writeFileSync(join(root, example.file), readFileSync(join(REPO, 'examples', example.file)));

const client = new Client({ name: 'views-checkpoint', version: '0.0.1' });
await client.connect(
	new StdioClientTransport({ command: process.execPath, args: [SERVER, '--root', root] })
);
const textOf = (r) =>
	r.content
		.filter((c) => c.type === 'text')
		.map((c) => c.text)
		.join('\n');
try {
	for (const example of ROSTER) {
		const read = await client.callTool({
			name: 'bcc_read_canvas',
			arguments: { path: example.file }
		});
		if (read.isError) fail(`${example.name}: bcc_read_canvas refused — ${textOf(read)}`);
		const digest = textOf(read);
		writeFileSync(join(OUT, 'triangle', `mcp-${example.file}.md`), digest);
		legs[example.name].mcp = digest;
	}
} finally {
	await client.close();
}

// ── the diff ────────────────────────────────────────────────────────────────
const sha = async (text) => {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

for (const example of ROSTER) {
	const leg = legs[example.name];
	const hashes = {
		app: await sha(leg.app),
		artifact: await sha(leg.artifact),
		mcp: await sha(leg.mcp)
	};
	const identical = hashes.app === hashes.artifact && hashes.app === hashes.mcp;
	facts[example.name] = {
		mdDownload: leg.mdDownload,
		bytes: Buffer.byteLength(leg.app, 'utf8'),
		lines: leg.app.split('\n').length,
		panelClass: leg.panelClass,
		sha256: hashes,
		identical
	};
	if (!identical) {
		const lines = { app: leg.app.split('\n'), artifact: leg.artifact.split('\n'), mcp: leg.mcp.split('\n') };
		const n = Math.max(lines.app.length, lines.artifact.length, lines.mcp.length);
		const diffs = [];
		for (let i = 0; i < n; i++) {
			if (lines.app[i] !== lines.artifact[i] || lines.app[i] !== lines.mcp[i])
				diffs.push({ line: i + 1, app: lines.app[i], artifact: lines.artifact[i], mcp: lines.mcp[i] });
			if (diffs.length >= 8) break;
		}
		facts[example.name].firstDivergences = diffs;
	}
}

writeFileSync(join(OUT, 'part1-triangle.json'), JSON.stringify(facts, null, '\t') + '\n');
console.log(JSON.stringify(facts, null, '\t'));
const broken = ROSTER.filter((e) => !facts[e.name].identical);
if (broken.length > 0) fail(`triangle broken for: ${broken.map((e) => e.name).join(', ')}`);
console.log('\npart 1 green — the triangle holds on all four examples');

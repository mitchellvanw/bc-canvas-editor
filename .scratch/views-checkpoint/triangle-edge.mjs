// Views checkpoint, part 1b (wayfinder ticket 048): the triangle on a canvas
// that actually exercises the artifact's escape path.
//
// None of the four bundled examples contains `<`, `>` or `&`, so running the
// triangle on them alone leaves the one lossy-looking leg — HTML-escaping the
// Markdown into a `<pre>` and reading it back — untested. This specimen carries
// all three characters plus a literal `</script>` and a literal `&amp;`, so a
// double-unescape or an early-closed embed shows up as a byte difference here.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { webkit } from 'playwright-core';

const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const HERE = new URL('./', import.meta.url).pathname;
const OUT = join(HERE, 'evidence');
const APP = 'http://localhost:4173/';
mkdirSync(join(OUT, 'triangle'), { recursive: true });

// Derived here rather than committed: `.bcc.json` under `.scratch` is ignored,
// and a driver that builds its own specimen can be re-run from a clean checkout.
const SPECIMEN = join(HERE, 'edge-canvas.bcc.json');
const SPECIMEN_BYTES = (() => {
	const canvas = JSON.parse(readFileSync(join(REPO, 'examples', 'notifications.bcc.json'), 'utf8'));
	canvas.name = 'Angle & Script <edge>';
	canvas.purpose =
		'Carries the three characters the artifact escapes: an ampersand &, a less-than <, a ' +
		'greater-than >, and the sequence </scr' +
		'ipt> that would close the embed block early. Also a stray &amp; entity written ' +
		'literally, to catch a double-unescape.';
	canvas.ubiquitousLanguage.unshift({
		term: '<template>',
		definition: 'A literal tag name, angle brackets and all — read as text, never as markup.'
	});
	canvas.assumptions = ['a < b && b < c'].concat(canvas.assumptions ?? []);
	const bytes = JSON.stringify(canvas, null, 2) + '\n';
	writeFileSync(SPECIMEN, bytes);
	return bytes;
})();

const CLIENT_PKG = join(REPO, 'mcp', 'node_modules', '@modelcontextprotocol', 'client');
const { Client } = await import(join(CLIENT_PKG, 'dist', 'index.mjs'));
const { StdioClientTransport } = await import(join(CLIENT_PKG, 'dist', 'stdio.mjs'));
const SERVER = join(REPO, 'mcp', 'dist', 'server.js');

const fail = (msg) => {
	throw new Error(msg);
};

const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(APP, { waitUntil: 'networkidle' });
await page.waitForSelector('h1');

await page.setInputFiles('input[type=file]', SPECIMEN);
await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('Angle'));

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

const md = await exportVia('Markdown');
const html = await exportVia('HTML artifact');
const json = await exportVia('Canvas file');
writeFileSync(join(OUT, 'triangle', 'edge-app.bcc.md'), md.bytes);
const artifactPath = join(OUT, 'triangle', 'edge-artifact.bcc.html');
writeFileSync(artifactPath, html.bytes);

// Read the Markdown panel and the JSON panel back out through the DOM, and
// check the embedded block still round-trips despite the literal `</script>`.
const reader = await browser.newPage();
await reader.goto('file://' + artifactPath);
const read = await reader.evaluate(() => ({
	markdown: document.querySelector('#view-panel-markdown pre')?.textContent ?? null,
	json: document.querySelector('#view-panel-json pre')?.textContent ?? null,
	// If the embed's `</script>` closed early, markup would have leaked into the
	// body as elements rather than text.
	strayTemplates: document.querySelectorAll('#view-panel-markdown template, #view-panel-json template')
		.length,
	scripts: document.querySelectorAll('script').length
}));
await reader.close();
await browser.close();

const artifactText = html.bytes.toString('utf8');
const OPEN = '<script type="application/json" data-canvas-file>';
const start = artifactText.indexOf(OPEN);
const embedded =
	start < 0
		? null
		: artifactText.slice(start + OPEN.length, artifactText.indexOf('</scr' + 'ipt>', start)).trim();

const root = join(tmpdir(), `bcc-views-edge-${process.pid}`);
mkdirSync(root, { recursive: true });
writeFileSync(join(root, 'edge-canvas.bcc.json'), SPECIMEN_BYTES);
const client = new Client({ name: 'views-checkpoint-edge', version: '0.0.1' });
await client.connect(
	new StdioClientTransport({ command: process.execPath, args: [SERVER, '--root', root] })
);
let mcpMarkdown;
try {
	const result = await client.callTool({
		name: 'bcc_read_canvas',
		arguments: { path: 'edge-canvas.bcc.json' }
	});
	if (result.isError) fail(`bcc_read_canvas refused the specimen: ${JSON.stringify(result)}`);
	mcpMarkdown = result.content
		.filter((c) => c.type === 'text')
		.map((c) => c.text)
		.join('\n');
} finally {
	await client.close();
}
writeFileSync(join(OUT, 'triangle', 'edge-mcp.md'), mcpMarkdown);

const appMarkdown = md.bytes.toString('utf8');
const jsonBytes = json.bytes.toString('utf8');
const facts = {
	specimen: {
		name: 'Angle & Script <edge>',
		carries: ['&', '<', '>', '</script>', '&amp; written literally']
	},
	markdownCarriesRawAngles: /</.test(appMarkdown) && /&/.test(appMarkdown),
	markdownMentionsScriptClose: appMarkdown.includes('</scr' + 'ipt>'),
	identical:
		appMarkdown === read.markdown && appMarkdown === mcpMarkdown,
	sameAsArtifactPanel: appMarkdown === read.markdown,
	sameAsMcp: appMarkdown === mcpMarkdown,
	jsonPanelIsExportBytes: read.json === jsonBytes.replace(/\n$/, '') || read.json === jsonBytes,
	embedRoundTrips: embedded === jsonBytes.trimEnd(),
	serializerEscapesAngles: !jsonBytes.includes('<'),
	strayTemplates: read.strayTemplates,
	scriptsInArtifact: read.scripts
};
writeFileSync(join(OUT, 'part1b-triangle-edge.json'), JSON.stringify(facts, null, '\t') + '\n');
console.log(JSON.stringify(facts, null, '\t'));

if (!facts.markdownCarriesRawAngles) fail('the specimen did not put `<`/`&` into the Markdown at all');
if (!facts.identical) fail('the triangle broke on the escaping specimen');
if (!facts.embedRoundTrips) fail('the embedded Canvas file no longer round-trips');
if (facts.strayTemplates !== 0) fail('markup leaked out of a panel as elements');
console.log('\npart 1b green — the triangle survives `<`, `>`, `&` and a literal </script' + '>');

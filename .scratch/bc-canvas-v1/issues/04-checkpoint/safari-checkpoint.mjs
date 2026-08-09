// Ticket 04 checkpoint: drive real Safari via safaridriver, run the shipped
// PNG export path against the reference canvas, and bring the pixels home.
import { writeFileSync } from 'node:fs';

const DRIVER = 'http://localhost:4724';
const APP = 'http://localhost:5173';
const OUT = new URL('./safari-capture.png', import.meta.url).pathname;

async function req(method, path, body) {
	const res = await fetch(DRIVER + path, {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const json = await res.json();
	if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json).slice(0, 500)}`);
	return json;
}

const seedScript = `
const done = arguments[arguments.length - 1];
(async () => {
	try {
		const { REFERENCE_FILE } = await import('/src/lib/model/reference.fixture.ts');
		localStorage.setItem('bcc.autosave', REFERENCE_FILE);
		done('seeded');
	} catch (e) { done('ERROR ' + (e && e.message)); }
})();`;

const captureScript = `
const done = arguments[arguments.length - 1];
(async () => {
	try {
		const clicks = [];
		HTMLAnchorElement.prototype.click = function () {
			clicks.push({ href: this.href, download: this.download });
		};
		URL.revokeObjectURL = () => {};
		const { canvas } = await import('/src/lib/editor/document.svelte.ts');
		const { exportPngArtifact } = await import('/src/lib/artifact/png.ts');
		canvas.commit(() => {}); // dirty the doc: PNG export must leave this set
		const unexportedBefore = canvas.unexported;
		await exportPngArtifact(canvas.doc);
		if (clicks.length !== 1) return done('ERROR expected 1 download click, got ' + clicks.length);
		const blob = await fetch(clicks[0].href).then((r) => r.blob());
		const dataUrl = await new Promise((res, rej) => {
			const fr = new FileReader();
			fr.onload = () => res(fr.result);
			fr.onerror = () => rej(fr.error);
			fr.readAsDataURL(blob);
		});
		const img = await new Promise((res, rej) => {
			const i = new Image();
			i.onload = () => res(i);
			i.onerror = rej;
			i.src = dataUrl;
		});
		done(JSON.stringify({
			download: clicks[0].download,
			width: img.naturalWidth,
			height: img.naturalHeight,
			windowInnerWidth: window.innerWidth,
			unexportedBefore,
			unexportedAfter: canvas.unexported,
			offscreenLeftBehind: document.querySelectorAll('.paper-ground').length,
			bytes: blob.size,
			userAgent: navigator.userAgent,
			dataUrl
		}));
	} catch (e) { done('ERROR ' + (e && (e.stack || e.message))); }
})();`;

const { value: session } = await req('POST', '/session', {
	capabilities: { alwaysMatch: { browserName: 'safari' } }
});
const S = (p) => `/session/${session.sessionId}${p}`;

try {
	await req('POST', S('/timeouts'), { script: 120000 });
	// A deliberately narrow window: the artifact width must not care.
	await req('POST', S('/window/rect'), { x: 40, y: 40, width: 900, height: 700 });
	await req('POST', S('/url'), { url: APP });
	const seed = await req('POST', S('/execute/async'), { script: seedScript, args: [] });
	if (seed.value !== 'seeded') throw new Error('seed failed: ' + seed.value);
	await req('POST', S('/url'), { url: APP });
	const { value } = await req('POST', S('/execute/async'), { script: captureScript, args: [] });
	if (typeof value !== 'string' || value.startsWith('ERROR')) throw new Error('capture failed: ' + value);
	const result = JSON.parse(value);
	const { dataUrl, ...facts } = result;
	writeFileSync(OUT, Buffer.from(dataUrl.split(',')[1], 'base64'));
	console.log(JSON.stringify(facts, null, 2));
	console.log('PNG written to', OUT);
} finally {
	await req('DELETE', S(''));
}

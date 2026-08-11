/**
 * The claim this package rests on: the app's model layer is plain TypeScript
 * that bundles through the `$lib` alias and runs in Node, with `src/lib`
 * untouched.
 *
 * Worth proving rather than assuming, because `src/lib/editor/vocab.ts` — the
 * source of the curated vocabularies, and load-bearing for the write schema —
 * type-imports `PickKind` from `src/lib/sheet/pick-slots.ts`, which type-imports
 * back from `model/canvas`. Type-only, so it should erase; this runs the built
 * bundle in a real Node process and looks at what comes out.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { describe, expect, it } from 'vitest';

const TSCONFIG = fileURLToPath(new URL('../tsconfig.json', import.meta.url));

const PROBE = `
import { PICK_OPTIONS } from '$lib/editor/vocab';
import { CANVAS_VERSION } from '$lib/model/canvas';
import { extractEmbeddedCanvas } from '$lib/model/embed';
import { parseCanvasFile } from '$lib/model/parse';
import { serializeCanvasFile } from '$lib/model/serialize';

const refusal = parseCanvasFile('{"version":2,"name":1}');
process.stdout.write(
	JSON.stringify({
		version: CANVAS_VERSION,
		domains: PICK_OPTIONS.domain.map((option) => option.value),
		relationships: PICK_OPTIONS.relationship.length,
		detail: refusal.ok ? null : refusal.detail,
		bytes: serializeCanvasFile({
			version: 2,
			name: 'Orders',
			purpose: '',
			strategicClassification: {},
			domainRoles: [],
			inboundCommunication: [],
			ubiquitousLanguage: [],
			businessDecisions: [],
			outboundCommunication: [],
			assumptions: [],
			verificationMetrics: [],
			openQuestions: []
		}).slice(0, 16),
		embedded: extractEmbeddedCanvas('nothing here')
	})
);
`;

describe('the model layer under Node', () => {
	it('bundles through $lib and runs, vocabularies and parser intact', () => {
		const directory = mkdtempSync(join(tmpdir(), 'bcc-probe-'));
		const entry = join(directory, 'probe.ts');
		const outfile = join(directory, 'probe.js');
		writeFileSync(entry, PROBE);

		buildSync({
			entryPoints: [entry],
			outfile,
			bundle: true,
			platform: 'node',
			format: 'esm',
			tsconfig: TSCONFIG,
			logLevel: 'silent'
		});

		const out = JSON.parse(execFileSync(process.execPath, [outfile], { encoding: 'utf8' }));

		expect(out.version).toBe(2);
		expect(out.domains).toEqual(['core', 'supporting', 'generic']);
		expect(out.relationships).toBeGreaterThan(0);
		expect(out.detail).toBe('name: expected a string, got a number.');
		expect(out.bytes).toBe('{\n  "version": 2');
		expect(out.embedded).toBe(null);
	});
});

/**
 * The guard is only worth having if it holds, so it is tested in a real
 * process rather than in this one — importing it here would rebind the
 * console the test runner is writing through.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const STDERR = fileURLToPath(new URL('./stderr.ts', import.meta.url));

function probe(source: string): { stdout: string; stderr: string; status: number | null } {
	const run = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
		encoding: 'utf8'
	});
	return { stdout: run.stdout, stderr: run.stderr, status: run.status };
}

describe('the stdout guard', () => {
	it('sends a stray console.log to stderr, where the spec invites logs to go', () => {
		const run = probe(
			`await import(${JSON.stringify(STDERR)});
			 console.log('a stray log');
			 console.info('an info line');
			 console.error('a deliberate diagnostic');`
		);

		expect(run.stdout).toBe('');
		expect(run.stderr).toContain('a stray log');
		expect(run.stderr).toContain('an info line');
		expect(run.stderr).toContain('a deliberate diagnostic');
	});

	it('reports a failure on stderr and exits non-zero, saying nothing on stdout', () => {
		const run = probe(
			`const { fail } = await import(${JSON.stringify(STDERR)});
			 fail('the root fell over');`
		);

		expect(run.stdout).toBe('');
		expect(run.stderr).toContain('bc-canvas-mcp: the root fell over');
		expect(run.status).toBe(1);
	});
});

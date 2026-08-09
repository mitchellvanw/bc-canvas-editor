/**
 * The bar for the scaffold: the built server starts, a client connects over
 * stdio, and `tools/list` comes back empty but well-formed — in both protocol
 * eras, because the day-one hosts are split across them.
 *
 * Deliberately spoken as raw lines rather than through the client SDK: half of
 * what is being proved is what does *not* appear on stdout, and only the bytes
 * can show that.
 */

import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

const PACKAGE = fileURLToPath(new URL('..', import.meta.url));
const SERVER = join(PACKAGE, 'dist', 'server.js');

const MODERN = '2026-07-28';

/** The order every session's context opens with; `tools.test.ts` owns why. */
const TOOL_ORDER = ['bcc_list_canvases', 'bcc_read_canvas', 'bcc_write_canvas', 'bcc_explain'];

/** The per-request envelope a 2026-07-28 client puts on every request. */
const ENVELOPE = {
	'io.modelcontextprotocol/protocolVersion': MODERN,
	'io.modelcontextprotocol/clientCapabilities': {},
	'io.modelcontextprotocol/clientInfo': { name: 'scaffold-smoke-test', version: '0.0.1' }
};

interface Run {
	stdout: string;
	stderr: string;
	code: number | null;
}

/** Feed the server some lines, close stdin, and collect everything it said. */
function drive(lines: unknown[], root: string, args: string[] = ['--root', root]): Promise<Run> {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [SERVER, ...args], { stdio: 'pipe' });
		let stdout = '';
		let stderr = '';
		child.stdout.setEncoding('utf8').on('data', (chunk: string) => (stdout += chunk));
		child.stderr.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk));
		child.on('error', reject);
		child.on('close', (code) => resolve({ stdout, stderr, code }));
		for (const line of lines) child.stdin.write(`${JSON.stringify(line)}\n`);
		child.stdin.end();
	});
}

function replies(run: Run): Record<string, any>[] {
	return run.stdout
		.split('\n')
		.filter((line) => line !== '')
		.map((line) => JSON.parse(line));
}

let root: string;

beforeAll(() => {
	execFileSync(process.execPath, ['build.js'], { cwd: PACKAGE, stdio: 'inherit' });
	root = realpathSync(mkdtempSync(join(tmpdir(), 'bcc-serve-')));
}, 60_000);

describe('the built server over stdio', () => {
	it('answers a 2026-07-28 client with the four tools', async () => {
		const run = await drive(
			[{ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: ENVELOPE } }],
			root
		);

		const [reply] = replies(run);
		expect(reply).toMatchObject({ jsonrpc: '2.0', id: 1 });
		expect(reply.error).toBeUndefined();
		expect(reply.result.tools.map((tool: { name: string }) => tool.name)).toEqual(TOOL_ORDER);
		// The 2026-07-28 result shape, which is the whole reason the entry is
		// `serveStdio` and not a hand-wired transport: that one stays on the
		// 2025-era wire, where `resultType` does not exist.
		expect(reply.result.resultType).toBe('complete');
		expect(reply.result._meta['io.modelcontextprotocol/serverInfo']).toMatchObject({
			name: 'bc-canvas'
		});
	});

	it('still serves a 2025-era client, which is most of them', async () => {
		const run = await drive(
			[
				{
					jsonrpc: '2.0',
					id: 1,
					method: 'initialize',
					params: {
						protocolVersion: '2025-06-18',
						capabilities: {},
						clientInfo: { name: 'scaffold-smoke-test', version: '0.0.1' }
					}
				},
				{ jsonrpc: '2.0', method: 'notifications/initialized' },
				{ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }
			],
			root
		);

		const [initialized, listed] = replies(run);
		expect(initialized.result.protocolVersion).toBe('2025-06-18');
		expect(initialized.result.serverInfo).toMatchObject({ name: 'bc-canvas' });
		expect(initialized.result.capabilities.tools).toBeDefined();
		expect(initialized.result.capabilities.prompts).toBeDefined();
		expect(listed.result.tools.map((tool: { name: string }) => tool.name)).toEqual(TOOL_ORDER);
		expect(listed.result.resultType).toBeUndefined();
	});

	it('offers review-canvas, which is what a Desktop user picks from a menu', async () => {
		const run = await drive(
			[{ jsonrpc: '2.0', id: 1, method: 'prompts/list', params: { _meta: ENVELOPE } }],
			root
		);

		const [reply] = replies(run);
		expect(reply.error).toBeUndefined();
		expect(reply.result.prompts.map((prompt: { name: string }) => prompt.name)).toEqual([
			'review-canvas'
		]);
	});

	it('says nothing on stdout that is not an MCP message, and reports itself on stderr', async () => {
		const run = await drive(
			[{ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: ENVELOPE } }],
			root
		);

		for (const line of run.stdout.split('\n').filter((l) => l !== '')) {
			expect(JSON.parse(line).jsonrpc).toBe('2.0');
		}
		expect(run.stderr).toContain(`serving ${root}`);
	});

	it('exits when its stdin closes', async () => {
		const run = await drive([], root);
		expect(run.code).toBe(0);
	});
});

describe('--root', () => {
	it('defaults to the working directory', async () => {
		const run = await drive([], root, []);
		expect(run.stderr).toContain('serving ');
		expect(run.code).toBe(0);
	});

	it('fails loudly on stderr, and only stderr, when the directory is missing', async () => {
		const run = await drive([], root, ['--root', join(root, 'nope')]);
		expect(run.code).toBe(1);
		expect(run.stderr).toContain('no such directory');
		expect(run.stdout).toBe('');
	});

	it('refuses an option it does not know', async () => {
		const run = await drive([], root, ['--verbose']);
		expect(run.code).toBe(1);
		expect(run.stderr).toContain('unknown option: --verbose');
		expect(run.stdout).toBe('');
	});
});

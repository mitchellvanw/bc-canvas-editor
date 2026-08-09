/**
 * `review-canvas`, driven through a real client.
 *
 * Three things are worth pinning. The prompt lists with a completable `path`,
 * because a Desktop user with no filesystem picker has nothing else to type
 * against. It embeds the digest, because the round trip it saves is the reason
 * it is a prompt rather than a sentence in a tool description. And its body
 * tells the model to ask rather than to fill in — the one property that
 * separates facilitation from a plausible-looking canvas nobody agreed to.
 */

import { copyFileSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openRoot } from './root';
import { buildServer } from './server';

const EXAMPLES = fileURLToPath(new URL('../../examples/', import.meta.url));

let base: string;
let client: Client;

/** The text blocks of a prompt's messages, joined. */
function prose(result: any): string {
	return result.messages
		.filter((message: any) => message.content.type === 'text')
		.map((message: any) => message.content.text)
		.join('\n');
}

function get(path: string): Promise<any> {
	return client.getPrompt({ name: 'review-canvas', arguments: { path } });
}

beforeEach(async () => {
	base = realpathSync(mkdtempSync(join(tmpdir(), 'bcc-prompt-')));
	copyFileSync(join(EXAMPLES, 'order-fulfillment.bcc.json'), join(base, 'orders.bcc.json'));

	const server = buildServer(openRoot(base));
	const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
	client = new Client({ name: 'bcc-tests', version: '0.0.1' });
	await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
});

afterEach(async () => {
	await client.close();
});

describe('prompts/list', () => {
	it('offers the one prompt, with path required', async () => {
		const { prompts } = await client.listPrompts();

		expect(prompts).toHaveLength(1);
		expect(prompts[0]).toMatchObject({ name: 'review-canvas', title: 'Review a canvas' });
		expect(prompts[0].arguments).toEqual([
			expect.objectContaining({ name: 'path', required: true })
		]);
	});

	it('completes the path against the canvases that are there', async () => {
		const { completion } = await client.complete({
			ref: { type: 'ref/prompt', name: 'review-canvas' },
			argument: { name: 'path', value: 'ord' }
		});

		expect(completion.values).toEqual(['orders.bcc.json']);
	});
});

describe('prompts/get', () => {
	it('embeds the digest, so reviewing costs no round trip', async () => {
		const result = await get('orders.bcc.json');

		const [first] = result.messages;
		expect(first.role).toBe('user');
		expect(first.content.type).toBe('resource');
		expect(first.content.resource.uri).toBe('bcc://canvas/orders.bcc.json');
		expect(first.content.resource.mimeType).toBe('text/markdown');
		// The digest, not the file: prose the model reads, under the same URI the
		// resource template serves.
		expect(first.content.resource.text).toContain('# Order Fulfillment');
		expect(first.content.resource.text).not.toContain('"version"');
	});

	it('asks the questions back rather than answering them', async () => {
		const text = prose(await get('orders.bcc.json'));

		expect(text).toContain('by asking, not by filling in');
		expect(text).toContain('Leave the questions open');
		expect(text).toContain('do not draft the rows that are missing');
	});

	it('names the path a review would be written back to', async () => {
		expect(prose(await get('orders.bcc.json'))).toContain('back to orders.bcc.json');
	});

	it('titles itself with the canvas, since a host shows that above the thread', async () => {
		expect((await get('orders.bcc.json')).description).toBe('Review Order Fulfillment');
	});

	it('reads a canvas out of an HTML artifact, like every other door', async () => {
		const committed = readFileSync(join(EXAMPLES, 'notifications.bcc.json'), 'utf8');
		writeFileSync(
			join(base, 'notifications.bcc.html'),
			`<!doctype html><title>x</title>\n<script type="application/json" data-canvas-file>\n${committed.trimEnd()}\n</script>\n`
		);

		const result = await get('notifications.bcc.html');

		expect(result.messages[0].content.resource.text).toContain('# Notifications');
	});
});

describe('a path that names no canvas', () => {
	it('comes back as invalid params, which the ticket accepts knowingly', async () => {
		// -32602, not a teaching `isError` result: `prompts/get` has no channel
		// for one. The path came from the server's own completion list.
		await expect(get('nope.bcc.json')).rejects.toMatchObject({ code: -32602 });
	});

	it('refuses one that leaves the root', async () => {
		await expect(get('../escape.bcc.json')).rejects.toMatchObject({
			code: -32602,
			message: expect.stringContaining('outside the canvas root')
		});
	});

	it('says what is wrong with a file that is not a canvas', async () => {
		writeFileSync(join(base, 'broken.bcc.json'), '{"version":1,"name":42}');

		await expect(get('broken.bcc.json')).rejects.toMatchObject({
			message: expect.stringContaining('name: expected a string, got a number')
		});
	});
});

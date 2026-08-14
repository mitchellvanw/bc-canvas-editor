/**
 * The two tools and the canvas resource, driven through a real client.
 *
 * Everything here goes over the protocol rather than into a handler, because
 * the failures worth catching live in the gap between the two. A Zod schema
 * that converts into JSON Schema a host quietly rejects produces no error a
 * unit test can see — it produces a server that "just doesn't work" in a host,
 * with protocol logging deprecated and nothing to read. A client on the other
 * end of an in-memory transport is the cheapest thing that notices.
 *
 * What used to be the crown jewel here — every committed example read out and
 * written back byte for byte — went with the write tool (ticket 059). The
 * property did not: `bcc fmt --check` runs it over `examples/` in
 * `cli/src/bcc.test.ts`, and `parse.test.ts` holds export → import → export at
 * the model layer. It is tested where the writing now happens.
 *
 * The load-bearing test in this file is now the resource listing. Concrete
 * URIs in `resources/list` are what let a host offer canvases in a picker; a
 * server that answered with the template alone would leave every canvas
 * unattachable, which is the one capability the diet kept the server for.
 */

import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CANVAS_VERSION } from '$lib/model/canvas';
import { openRoot } from '$lib/fs/root';
import { buildServer } from './server';

const EXAMPLES = fileURLToPath(new URL('../../examples/', import.meta.url));

let base: string;
let client: Client;

/** Put a file under the root, making its directory on the way. */
function put(relative: string, text: string): void {
	const path = join(base, relative);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, text);
}

async function connect(): Promise<Client> {
	const server = buildServer(openRoot(base));
	const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
	const connected = new Client({ name: 'bcc-tests', version: '0.0.1' });
	await Promise.all([server.connect(serverSide), connected.connect(clientSide)]);
	return connected;
}

/** A tool call's text content, joined — what the model actually reads. */
function text(result: any): string {
	return result.content
		.filter((block: any) => block.type === 'text')
		.map((block: any) => block.text)
		.join('\n');
}

function call(name: string, args: Record<string, unknown> = {}): Promise<any> {
	return client.callTool({ name, arguments: args });
}

beforeEach(async () => {
	base = realpathSync(mkdtempSync(join(tmpdir(), 'bcc-tools-')));
	client = await connect();
});

afterEach(async () => {
	await client.close();
});

describe('tools/list', () => {
	it('is well-formed, and in the order it will be in tomorrow', async () => {
		const { tools } = await client.listTools();

		expect(tools.map((tool) => tool.name)).toEqual(['bcc_read_canvas', 'bcc_explain']);
		for (const tool of tools) {
			expect(tool.description, `${tool.name} has no description`).toBeTruthy();
			expect(tool.inputSchema.type).toBe('object');
			expect(tool.annotations?.openWorldHint).toBe(false);
		}
	});

	it('offers no way to write, which is the diet', async () => {
		const { tools } = await client.listTools();

		// The server reads; `bcc` writes (ticket 059). A write tool reappearing
		// here is the change that has to argue for itself, so it fails first.
		for (const tool of tools) {
			expect(tool.annotations?.readOnlyHint, `${tool.name} is not read-only`).toBe(true);
		}
	});

	it('stays small, because it is paid for once per session whether or not it is used', async () => {
		const { tools } = await client.listTools();

		// `tools/list` cost 3,526 tokens before the diet, 85% of it the write
		// tool's generated vocabularies. This is a floor against that coming back
		// by accretion — a rough proxy, deliberately loose, and four times the
		// measured size of what is here.
		expect(JSON.stringify(tools).length).toBeLessThan(8000);
	});

	it('declares no output schema on any tool, so the prose is the result', async () => {
		const { tools } = await client.listTools();

		// A declared output schema entitles a host to drop the text block as a
		// duplicate serialization, and both day-one hosts do — the standing rule
		// at the registration site in tools.ts.
		for (const tool of tools) {
			expect(tool.outputSchema, `${tool.name} declares an outputSchema`).toBeUndefined();
		}
	});
});

describe('bcc_read_canvas', () => {
	it('reads the sheet in words', async () => {
		put(
			'docs/orders.bcc.json',
			readFileSync(join(EXAMPLES, 'order-fulfillment.bcc.json'), 'utf8')
		);

		const result = await call('bcc_read_canvas', { path: 'docs/orders.bcc.json' });

		expect(result.isError).toBeFalsy();
		expect(text(result)).toContain('# Order Fulfillment');
	});

	it('reads a canvas back out of an HTML artifact', async () => {
		const committed = readFileSync(join(EXAMPLES, 'notifications.bcc.json'), 'utf8');
		put(
			'artifacts/notifications.bcc.html',
			`<!doctype html><title>x</title>\n<script type="application/json" data-canvas-file>\n${committed.trimEnd()}\n</script>\n<p>the rendered sheet</p>\n`
		);

		const result = await call('bcc_read_canvas', {
			path: 'artifacts/notifications.bcc.html'
		});

		// The canvas the artifact carries, not the HTML that carries it.
		expect(result.isError).toBeFalsy();
		expect(text(result)).toContain('# Notifications');
	});

	it('takes a path and nothing else', async () => {
		const { tools } = await client.listTools();
		const read = tools.find((tool) => tool.name === 'bcc_read_canvas');

		// `view` went with the write tool it existed for: reading bytes in order
		// to hand them back is not a thing this server does any more, and a host
		// with a filesystem has its own way to read a file.
		expect(Object.keys((read?.inputSchema as any).properties)).toEqual(['path']);
	});
});

describe('refusals that teach', () => {
	it('will not read a canvas from a newer version, and does not read the file', async () => {
		put('future.bcc.json', '{"version":9,"name":"Later","description":""}');

		const result = await call('bcc_read_canvas', { path: 'future.bcc.json' });

		expect(result.isError).toBe(true);
		expect(text(result)).toContain('format version 9');
		expect(text(result)).toContain(`version ${CANVAS_VERSION} is the newest that can be read here`);
	});

	it('refuses a path that leaves the root, naming the root', async () => {
		const result = await call('bcc_read_canvas', { path: '../escape.bcc.json' });

		expect(result.isError).toBe(true);
		expect(text(result)).toContain('outside the canvas root');
		expect(text(result)).toContain(base);
	});

	it('names the field on a file that is not a Canvas file, wherever it is read from', async () => {
		// Whole and legal but for one row, so the parser reaches domainRoles
		// rather than stopping at the first missing section.
		put(
			'docs/broken.bcc.json',
			JSON.stringify({
				version: 1,
				name: 'X',
				purpose: '',
				strategicClassification: {},
				domainRoles: [{}],
				inboundCommunication: [],
				ubiquitousLanguage: [],
				businessDecisions: [],
				outboundCommunication: [],
				assumptions: [],
				verificationMetrics: [],
				openQuestions: []
			})
		);

		const result = await call('bcc_read_canvas', { path: 'docs/broken.bcc.json' });

		// The parser's path-carrying detail (ticket 026) is what reaches the model
		// here: on disk there is no input schema in front of the file, so this is
		// the only thing that can say which field is wrong.
		expect(result.isError).toBe(true);
		expect(text(result)).toContain('domainRoles[0].name: expected a string, got nothing');
		expect(text(result)).toContain('bcc_explain');
	});

	it('stops at the problem when no tool here fixes it', async () => {
		const result = await call('bcc_read_canvas', { path: 'nope.bcc.json' });

		// This used to end at `bcc_list_canvases`. Listing is `bcc ls` now, and
		// the server cannot name a command it has no way of knowing is installed
		// (ticket 059), so the refusal stops after the problem rather than
		// sending the model somewhere that may not be there.
		expect(result.isError).toBe(true);
		expect(text(result)).toContain('could not be read');
		expect(text(result)).not.toContain('bcc ls');
		expect(text(result)).not.toContain('bcc_list_canvases');
	});
});

describe('bcc_explain', () => {
	it("asks the section its own question, in the sheet's words", async () => {
		const roles = text(await call('bcc_explain', { topic: 'domainRoles' }));

		expect(roles).toContain('# Domain roles');
		expect(roles).toContain('how does this context behave?');
		// The worksheet set, with its teaching, from the same module the pickers
		// read — named by source, not by count (the worksheet fixes none).
		expect(roles).toContain('From the ddd-crew model-traits worksheet, plus one local addition:');
		expect(roles).toContain('octopus enforcer — Holds many contexts at once to the same standard rule.');
		expect(roles).toContain('kept as written');
	});

	it('teaches the lane its kind and both relationship ends', async () => {
		const inbound = text(await call('bcc_explain', { topic: 'inboundCommunication' }));

		// The wording the symmetric-example failure hangs on: two ends are a
		// pairing, not a field to fill twice.
		expect(inbound).toContain('a pairing across one boundary, not a duplicate field');
		expect(inbound).toContain('bounded-context — Another modelled context');
		// The escape hatch names relationships alone; the kind is the set the
		// parser refuses unknown values for, and a blanket "any other value"
		// would teach the opposite.
		expect(inbound).toContain('Any other relationship is accepted and kept as written.');
		expect(inbound).not.toContain('Any other value is accepted');
	});

	it('carries the vocabularies the write schema used to', async () => {
		const roles = text(await call('bcc_explain', { topic: 'domainRoles' }));
		const inbound = text(await call('bcc_explain', { topic: 'inboundCommunication' }));

		// Generated from vocab.ts. This was the write schema's job, where it was
		// unskippable and cost ~1,340 tokens every session; here it is asked for
		// and costs nothing until it is (ticket 059).
		expect(inbound).toContain('anticorruption-layer');
		expect(inbound).toContain('A translation layer at the boundary');
		expect(roles).toContain('octopus enforcer');
	});

	it('describes the method as eleven questions, and credits it', async () => {
		const canvas = text(await call('bcc_explain', { topic: 'canvas' }));

		expect(canvas).toContain('Ubiquitous language — which words mean something precise here?');
		expect(canvas).toContain('ddd-crew · CC BY 4.0');
	});

	it('tells a model drafting from code where the judgment sections go', async () => {
		const canvas = text(await call('bcc_explain', { topic: 'canvas' }));

		// The five sections code cannot answer, and the honest place for them —
		// method knowledge that lives server-side so every MCP client gets it.
		expect(canvas).toContain('business judgments a codebase cannot answer');
		expect(canvas).toContain('verification metrics');
		expect(canvas).toContain('under Open questions');
	});

	it('points at a neighbouring canvas without naming a tool that left', async () => {
		const canvas = text(await call('bcc_explain', { topic: 'canvas' }));

		expect(canvas).toContain('calibrate better than');
		expect(canvas).toContain('bcc_read_canvas');
		expect(canvas).not.toContain('bcc_list_canvases');
	});

	it('covers the canvas and all eleven sections', async () => {
		const { tools } = await client.listTools();
		const topics = (tools.find((tool) => tool.name === 'bcc_explain')?.inputSchema as any).properties
			.topic.enum;

		expect(topics).toHaveLength(12);
		for (const topic of topics) {
			const result = await call('bcc_explain', { topic });
			expect(result.isError, `${topic} refused`).toBeFalsy();
			expect(text(result).length).toBeGreaterThan(60);
		}
	});
});

describe('the canvas resource', () => {
	beforeEach(() => {
		copyFileSync(join(EXAMPLES, 'notifications.bcc.json'), join(base, 'notifications.bcc.json'));
		mkdirSync(join(base, 'docs'), { recursive: true });
		copyFileSync(join(EXAMPLES, 'order-fulfillment.bcc.json'), join(base, 'docs/orders.bcc.json'));
	});

	it('lists concrete URIs, which is what makes a canvas attachable', async () => {
		const { resources } = await client.listResources();

		// Not the template — a host that only got `bcc://canvas/{+path}` back
		// could not offer any of these in a picker, and attaching one is the
		// capability the whole server now exists for (ticket 059).
		expect(resources.map((resource) => resource.uri)).toEqual([
			'bcc://canvas/docs/orders.bcc.json',
			'bcc://canvas/notifications.bcc.json'
		]);
	});

	it('names each one by what the context is for, so a person can choose', async () => {
		const { resources } = await client.listResources();
		const orders = resources.find((r) => r.uri === 'bcc://canvas/docs/orders.bcc.json');

		expect(orders?.title).toBe('Order Fulfillment');
		expect(orders?.description).toContain('picking, packing and shipping');
	});

	it('leaves out a file it cannot read, rather than offering an entry that errors', async () => {
		writeFileSync(join(base, 'broken.bcc.json'), '{"version":1,"name":42}');

		const { resources } = await client.listResources();

		// The listing feeds a picker now, not a report. `bcc ls` is what names
		// the unreadable ones (ticket 059).
		expect(resources.map((resource) => resource.uri)).not.toContain('bcc://canvas/broken.bcc.json');
		expect(resources).toHaveLength(2);
	});

	it('serves the digest and the exact file under one URI', async () => {
		const { contents } = await client.readResource({ uri: 'bcc://canvas/docs/orders.bcc.json' });
		const [digest, json] = contents as { mimeType?: string; text: string }[];

		expect(contents).toHaveLength(2);
		expect(digest.mimeType).toBe('text/markdown');
		expect(digest.text).toContain('# Order Fulfillment');
		expect(json.mimeType).toBe('application/json');
		expect(json.text).toBe(readFileSync(join(EXAMPLES, 'order-fulfillment.bcc.json'), 'utf8'));
	});

	it('completes a path the way a person types one', async () => {
		const { completion } = await client.complete({
			ref: { type: 'ref/resource', uri: 'bcc://canvas/{+path}' },
			argument: { name: 'path', value: 'docs/' }
		});

		expect(completion.values).toEqual(['docs/orders.bcc.json']);
	});

	it('links the canvas it just read, so a host can pin it', async () => {
		const result = await call('bcc_read_canvas', { path: 'docs/orders.bcc.json' });
		const link = result.content.find((block: any) => block.type === 'resource_link');

		expect(link.uri).toBe('bcc://canvas/docs/orders.bcc.json');
		expect(link.name).toBe('Order Fulfillment');
	});
});

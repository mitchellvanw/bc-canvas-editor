// MCP hosts checkpoint (wayfinder ticket 030), half one: drive the *built*
// server — `mcp/dist/server.js`, launched as a subprocess over real stdio by
// the real SDK client, exactly as a host launches it. Not the in-memory
// transport the unit tests use: the point here is the shipped binary.
//
// The root is a tmpdir outside the checkout and outside git, which is the
// Claude Desktop case (`--root` on a folder that is not a repo).
//
// Gate lines: the four tools in fixed order; a canvas drafted from this repo's
// own code written, listed, and read back in both views; the resource; the
// prompt with its path completion; and the four teaching paths, which are the
// reason this is a server and not a skill.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// The client SDK lives in mcp/node_modules — this script sits outside the
// package on purpose, so it resolves the dependency the way a host would find
// the server: by path.
const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const CLIENT_PKG = join(REPO, 'mcp', 'node_modules', '@modelcontextprotocol', 'client');
const { Client } = await import(join(CLIENT_PKG, 'dist', 'index.mjs'));
const { StdioClientTransport } = await import(join(CLIENT_PKG, 'dist', 'stdio.mjs'));
const SERVER = join(REPO, 'mcp', 'dist', 'server.js');
const OUT = new URL('./evidence/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const root = mkdtempSync(join(tmpdir(), 'bcc-checkpoint-'));
const facts = { root, notARepo: null, tools: {}, draft: {}, resource: {}, prompt: {}, teaching: {} };
const fail = (msg) => {
	throw new Error(msg);
};

// The root is a plain folder: no .git anywhere above it inside the tmpdir.
try {
	execFileSync('git', ['-C', root, 'rev-parse', '--show-toplevel'], { stdio: 'pipe' });
	facts.notARepo = false;
} catch {
	facts.notARepo = true;
}
if (!facts.notARepo) fail('the checkpoint root turned out to be inside a git repo');

// A neighbouring canvas to be found by the listing — the committed example,
// copied in as a project would have it committed beside its code.
mkdirSync(join(root, 'docs', 'contexts'), { recursive: true });
cpSync(
	join(REPO, 'examples', 'order-fulfillment.bcc.json'),
	join(root, 'docs', 'contexts', 'order-fulfillment.bcc.json')
);

// ── The canvas drafted from code ────────────────────────────────────────────
// The subject is this repo's own MCP server, modelled from mcp/src/*: the
// tools it registers, what it refuses, and who is on each side of it.
const DRAFT = {
	name: 'Canvas MCP Server',
	description:
		'Gives an agent working in a codebase a way to read the Bounded Context Canvases committed beside that code, and to write new ones back in the form the editor imports. It carries the modelling method — the ddd-crew questions and the curated vocabularies — so the agent does not have to reconstruct it. It holds no state of its own: the files are the state and git is the history.',
	strategicClassification: {
		domain: 'supporting',
		businessModel: 'cost-reduction',
		evolution: 'custom-built'
	},
	domainRoles: [{ name: 'gateway context' }, { name: 'service context' }],
	inboundCommunication: [
		{
			collaborator: 'MCP Host',
			relationship: 'conformist',
			messages: [
				{
					type: 'query',
					name: 'List Canvases',
					description: 'Every canvas under the root, with how far along each one is.'
				},
				{
					type: 'query',
					name: 'Read Canvas',
					description: 'One canvas, as prose or as its exact file bytes.'
				},
				{
					type: 'command',
					name: 'Write Canvas',
					description: 'A whole canvas to a .bcc.json path. Whole document every time.'
				},
				{
					type: 'query',
					name: 'Explain Section',
					description: 'What a section is for, in the ddd-crew’s own question.'
				}
			]
		}
	],
	ubiquitousLanguage: [
		{ term: 'Canvas file', definition: 'The .bcc.json document: one canvas, serialized in a fixed key order.' },
		{ term: 'Root', definition: 'The one directory the server reads and writes. Everything outside it is refused.' },
		{ term: 'Digest', definition: 'The canvas as prose, at roughly half the tokens of the file.' },
		{ term: 'Artifact', definition: 'A .bcc.html export. Readable here through the Canvas file embedded in it, never written.' },
		{ term: 'Whole document', definition: 'A write replaces the canvas entirely. There is no row addressing.' }
	],
	businessDecisions: [
		{
			name: 'Nothing is read or written outside the root.',
			description: 'Symlinks are resolved before the comparison, so a link cannot lead out.'
		},
		{
			name: 'The parser decides what a Canvas file is, not the tool schema.',
			description: 'One authority, reached through the bytes, the same way the editor reaches it.'
		},
		{
			name: 'A value outside a curated vocabulary is kept as written and noted.',
			description: 'The editor allows a custom value, so a stricter server would be wrong about its own format.'
		},
		{
			name: 'Only the current format version is written.',
			description: 'A hand-bumped version is refused and nothing lands on disk.'
		},
		{
			name: 'Only .bcc.json is written.',
			description: 'It is what the listing globs on and what the editor’s Import… accepts.'
		},
		{
			name: 'There is no conflict check.',
			description: 'Canvases are committed files; git is already the conflict detector and the undo.'
		}
	],
	outboundCommunication: [
		{
			collaborator: 'Canvas Files',
			relationship: 'shared-kernel',
			messages: [
				{
					type: 'event',
					name: 'Canvas Written',
					description: 'A whole document replaced at a path under the root.'
				}
			]
		},
		{
			collaborator: 'BC Canvas Editor',
			relationship: 'published-language',
			messages: [
				{
					type: 'event',
					name: 'Canvas Available For Import',
					description: 'The written bytes are what the editor’s Import… reads, unchanged.'
				}
			]
		}
	],
	assumptions: [
		'Canvases live in the repository beside the code they describe, so the agent already has the right root.',
		'The agent driving the tools has the code in view; the server supplies the method, not the domain.',
		'One person edits a canvas at a time, with git as the arbiter when that turns out to be false.'
	],
	verificationMetrics: [
		'Bytes the server writes open unchanged in the editor, and bytes the editor exports read unchanged here.',
		'A canvas drafted from code needs no hand-repair before it imports.',
		'The digest costs about half the tokens of the file it describes.'
	],
	openQuestions: [
		'Does a facilitated workshop need row-level edits, or is a whole-document rewrite enough?',
		'Should the server say anything when a canvas on disk is older than the code around it?'
	]
};

const transport = new StdioClientTransport({
	command: process.execPath,
	args: [SERVER, '--root', root]
});
const client = new Client({ name: 'mcp-hosts-checkpoint', version: '0.0.1' });
await client.connect(transport);

try {
	facts.serverInfo = client.getServerVersion();
	facts.serverCapabilities = client.getServerCapabilities();

	// ── the four tools, in the order every session's context opens with
	const listed = await client.listTools();
	facts.tools.order = listed.tools.map((t) => t.name);
	const EXPECTED = ['bcc_list_canvases', 'bcc_read_canvas', 'bcc_write_canvas', 'bcc_explain'];
	if (facts.tools.order.join() !== EXPECTED.join())
		fail(`tools/list order: ${facts.tools.order.join(', ')}`);
	facts.tools.listBytes = JSON.stringify(listed.tools).length;
	writeFileSync(OUT + 'tools-list.json', JSON.stringify(listed.tools, null, '\t'));

	const call = (name, args) => client.callTool({ name, arguments: args });
	const textOf = (r) =>
		r.content
			.filter((c) => c.type === 'text')
			.map((c) => c.text)
			.join('\n');

	// ── bcc_explain returns the SPEC §10 question verbatim ───────────────────
	// Spot-checked against the SPEC table itself, read off disk rather than
	// retyped, so a drifted placeholder fails here.
	const spec = readFileSync(join(REPO, 'SPEC.md'), 'utf8');
	const specQuestion = (row) => {
		const match = spec.match(new RegExp(`^\\| ${row} \\| \\*(.+?)\\* \\|`, 'm'));
		return match?.[1];
	};
	const SPOT = [
		{ topic: 'inboundCommunication', row: 'Inbound ghost' },
		{ topic: 'ubiquitousLanguage', row: 'Ubiquitous language ghost' },
		{ topic: 'openQuestions', row: 'Open questions ghost' }
	];
	facts.teaching.explain = {};
	for (const { topic, row } of SPOT) {
		const ghost = specQuestion(row);
		if (!ghost) fail(`SPEC §10 has no row "${row}"`);
		// §10 writes the placeholder lead-in ("+ term — "); the tool drops it.
		const asked = ghost.replace(/^\+ [^—]+ — /, '');
		const text = textOf(await call('bcc_explain', { topic }));
		if (!text.includes(asked)) fail(`bcc_explain ${topic} is missing "${asked}"`);
		facts.teaching.explain[topic] = { specQuestion: asked, verbatim: true };
		writeFileSync(OUT + `explain-${topic}.txt`, text);
	}
	writeFileSync(OUT + 'explain-canvas.txt', textOf(await call('bcc_explain', { topic: 'canvas' })));

	// ── write the drafted canvas ─────────────────────────────────────────────
	const PATH = 'docs/contexts/canvas-mcp-server.bcc.json';
	const wrote = await call('bcc_write_canvas', { path: PATH, canvas: DRAFT });
	if (wrote.isError) fail(`write refused: ${textOf(wrote)}`);
	facts.draft.write = { text: textOf(wrote), structured: wrote.structuredContent };
	if (wrote.structuredContent.created !== true) fail('write did not report a creation');
	if (wrote.structuredContent.empty.length !== 0)
		fail(`sections came out empty: ${wrote.structuredContent.empty.join(', ')}`);
	if (wrote.structuredContent.warnings.length !== 0)
		fail(`unexpected warnings on a fully in-vocabulary draft: ${wrote.structuredContent.warnings}`);

	const onDisk = readFileSync(join(root, PATH), 'utf8');
	writeFileSync(OUT + 'canvas-mcp-server.bcc.json', onDisk);
	facts.draft.bytes = onDisk.length;

	// ── list finds both, and reports progress ────────────────────────────────
	const list = await call('bcc_list_canvases', {});
	facts.draft.list = {
		text: textOf(list),
		paths: list.structuredContent.canvases.map((c) => c.path),
		problems: list.structuredContent.problems
	};
	if (!facts.draft.list.paths.includes(PATH)) fail('the written canvas is not in the listing');
	if (facts.draft.list.problems.length !== 0) fail('the listing reported problems');
	writeFileSync(OUT + 'list-canvases.txt', facts.draft.list.text);

	// ── read back, both views; json is byte-for-byte what is on disk ─────────
	const asJson = await call('bcc_read_canvas', { path: PATH, view: 'json' });
	const jsonText = textOf(asJson);
	facts.draft.jsonViewMatchesDisk = jsonText === onDisk.trimEnd() || jsonText === onDisk;
	if (!facts.draft.jsonViewMatchesDisk) fail('view: json diverges from the bytes on disk');

	const asDigest = await call('bcc_read_canvas', { path: PATH, view: 'digest' });
	const digestText = textOf(asDigest);
	writeFileSync(OUT + 'digest.md', digestText);
	facts.draft.digest = {
		bytes: digestText.length,
		jsonBytes: jsonText.length,
		ratio: +(digestText.length / jsonText.length).toFixed(2)
	};
	facts.draft.resourceLink = asDigest.content.find((c) => c.type === 'resource_link')?.uri;

	// ── the resource, under the same URI the tools hand out ──────────────────
	const templates = await client.listResourceTemplates();
	facts.resource.templates = templates.resourceTemplates.map((t) => t.uriTemplate);
	const read = await client.readResource({ uri: `bcc://canvas/${PATH}` });
	facts.resource.contents = read.contents.map((c) => ({
		uri: c.uri,
		mimeType: c.mimeType,
		bytes: (c.text ?? '').length
	}));
	const exact = read.contents.find((c) => c.mimeType === 'application/json');
	facts.resource.carriesExactBytes = exact?.text === onDisk || exact?.text === onDisk.trimEnd();
	if (!facts.resource.carriesExactBytes) fail('the resource does not carry the exact bytes');

	// ── the prompt, and its path completion ──────────────────────────────────
	const prompts = await client.listPrompts();
	facts.prompt.listed = prompts.prompts.map((p) => ({
		name: p.name,
		title: p.title,
		arguments: p.arguments
	}));
	const completion = await client.complete({
		ref: { type: 'ref/prompt', name: prompts.prompts[0].name },
		argument: { name: 'path', value: 'docs/' }
	});
	facts.prompt.completion = completion.completion.values;
	if (!facts.prompt.completion.includes(PATH))
		fail(`completion did not offer the written canvas: ${facts.prompt.completion}`);

	const got = await client.getPrompt({
		name: prompts.prompts[0].name,
		arguments: { path: PATH }
	});
	facts.prompt.messages = got.messages.map((m) => ({
		role: m.role,
		type: m.content.type,
		uri: m.content.resource?.uri,
		bytes: (m.content.text ?? m.content.resource?.text ?? '').length
	}));
	writeFileSync(OUT + 'review-canvas-prompt.json', JSON.stringify(got, null, '\t'));

	let badPath = null;
	try {
		await client.getPrompt({ name: prompts.prompts[0].name, arguments: { path: 'nope.bcc.json' } });
	} catch (error) {
		badPath = { code: error.code, message: error.message };
	}
	facts.prompt.badPath = badPath;
	if (badPath?.code !== -32602) fail(`bad prompt path gave ${JSON.stringify(badPath)}, not -32602`);

	// ── teaching path: an off-vocabulary relationship is accepted with a note ─
	const OFF_PATH = 'docs/contexts/off-vocabulary.bcc.json';
	const offDraft = structuredClone(DRAFT);
	offDraft.name = 'Off Vocabulary Probe';
	offDraft.inboundCommunication[0].relationship = 'strangler-fig';
	offDraft.domainRoles = [{ name: 'shepherd context' }];
	const off = await call('bcc_write_canvas', { path: OFF_PATH, canvas: offDraft });
	facts.teaching.offVocabulary = {
		refused: off.isError === true,
		text: textOf(off),
		warnings: off.structuredContent?.warnings,
		landedOnDisk: readFileSync(join(root, OFF_PATH), 'utf8').includes('strangler-fig')
	};
	if (facts.teaching.offVocabulary.refused) fail('an off-vocabulary value was refused');
	if (!facts.teaching.offVocabulary.landedOnDisk) fail('the custom value did not survive to disk');
	if (!(off.structuredContent.warnings ?? []).some((w) => w.includes('strangler-fig')))
		fail(`no warning named the custom value: ${off.structuredContent.warnings}`);

	// ── teaching path: a bad message.type names the field path ───────────────
	// The write schema closes message.type, so the refusal comes back as a
	// validation error; the read path is where ticket 026's detail teaches, so
	// a file with a bad type is put on disk and read back.
	const BAD_PATH = 'docs/contexts/bad-type.bcc.json';
	const badFile = JSON.parse(onDisk);
	badFile.inboundCommunication[0].messages[0].type = 'notification';
	writeFileSync(join(root, BAD_PATH), JSON.stringify(badFile, null, '\t'));
	const badRead = await call('bcc_read_canvas', { path: BAD_PATH, view: 'json' });
	facts.teaching.badMessageType = { isError: badRead.isError === true, text: textOf(badRead) };
	if (!facts.teaching.badMessageType.isError) fail('a bad message.type was read without complaint');
	if (!facts.teaching.badMessageType.text.includes('inboundCommunication[0].messages[0].type'))
		fail(`the refusal does not name the path: ${facts.teaching.badMessageType.text}`);

	let schemaRefusal = null;
	try {
		const badWrite = await call('bcc_write_canvas', {
			path: 'docs/contexts/bad-type-write.bcc.json',
			canvas: { ...DRAFT, inboundCommunication: [{ ...DRAFT.inboundCommunication[0], messages: [{ type: 'notification', name: 'Nope' }] }] }
		});
		schemaRefusal = { isError: badWrite.isError === true, text: textOf(badWrite) };
	} catch (error) {
		schemaRefusal = { code: error.code, message: error.message };
	}
	facts.teaching.badMessageTypeOnWrite = schemaRefusal;

	// ── teaching path: a hand-bumped version is refused, file untouched ──────
	const before = readFileSync(join(root, PATH), 'utf8');
	const bumped = await call('bcc_write_canvas', { path: PATH, version: 2, canvas: DRAFT });
	const after = readFileSync(join(root, PATH), 'utf8');
	facts.teaching.bumpedVersion = {
		refused: bumped.isError === true,
		text: textOf(bumped),
		fileUntouched: before === after
	};
	if (!facts.teaching.bumpedVersion.refused) fail('a bumped version was accepted');
	if (!facts.teaching.bumpedVersion.fileUntouched) fail('a refused write still changed the file');

	// ── the round trip inside the server: read json, write it straight back ──
	const roundTrip = await call('bcc_write_canvas', { path: PATH, canvas: JSON.parse(jsonText) });
	if (roundTrip.isError) fail(`round-trip write refused: ${textOf(roundTrip)}`);
	facts.draft.serverRoundTripByteIdentical = readFileSync(join(root, PATH), 'utf8') === onDisk;
	if (!facts.draft.serverRoundTripByteIdentical) fail('read-then-write changed the bytes');

	// ── an exported artifact reads here, through the embedded Canvas file ────
	// The committed example's own artifact, exported by the app in ticket 024.
	const artifactSource = join(
		REPO,
		'.scratch',
		'examples-live-checkpoint',
		'evidence',
		'royalty-distribution.bcc.html'
	);
	cpSync(artifactSource, join(root, 'docs', 'contexts', 'royalty-distribution.bcc.html'));
	const fromArtifact = await call('bcc_read_canvas', {
		path: 'docs/contexts/royalty-distribution.bcc.html',
		view: 'json'
	});
	const committedRd = readFileSync(join(REPO, 'examples', 'royalty-distribution.bcc.json'), 'utf8');
	facts.draft.artifactReadsAsCommittedBytes = textOf(fromArtifact).trimEnd() === committedRd.trimEnd();
	if (!facts.draft.artifactReadsAsCommittedBytes)
		fail('the artifact’s embedded canvas diverges from the committed bytes');
} finally {
	await client.close();
}

writeFileSync(OUT + 'drive-server.json', JSON.stringify(facts, null, '\t'));
console.log(JSON.stringify(facts, null, '\t'));
console.log('\nroot kept at', root);

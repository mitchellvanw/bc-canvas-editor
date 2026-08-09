// First, before the SDK or anything else can log while it loads: the console
// is rebound to stderr, because stdout belongs to the protocol (see stderr.ts).
import { fail } from './stderr';

import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { openRoot, whyUnservable, type CanvasRoot } from './root';
import { buildServer } from './server';

const USAGE = 'usage: bc-canvas-mcp [--root <directory>]';

/**
 * `--root` names the directory the server may read and write, and defaults to
 * the working directory — which is what a host launching the server from a
 * project checkout gives it anyway. One root, resolved once.
 */
function rootArgument(argv: string[]): string {
	let root = process.cwd();
	for (let i = 0; i < argv.length; i++) {
		const argument = argv[i];
		if (argument === '--root') {
			const value = argv[++i];
			if (value === undefined) fail(`--root needs a directory\n${USAGE}`);
			root = value;
		} else if (argument.startsWith('--root=')) {
			root = argument.slice('--root='.length);
		} else {
			fail(`unknown option: ${argument}\n${USAGE}`);
		}
	}
	return root;
}

function openRequestedRoot(requested: string): CanvasRoot {
	try {
		return openRoot(requested);
	} catch (error) {
		fail(`--root ${requested}: ${error instanceof Error ? error.message : String(error)}`);
	}
}

const root = openRequestedRoot(rootArgument(process.argv.slice(2)));

const unservable = whyUnservable(root.path);
if (unservable !== null) fail(`${unservable}\n${USAGE}`);

console.error(`bc-canvas-mcp: serving ${root.path}`);

// One factory, both protocol eras. `serveStdio` is what actually puts the
// current revision on the wire — a hand-wired `server.connect(transport)`
// stays on the 2025-era protocol — and 2025-era clients are served rather than
// rejected, because most hosts have not migrated off the v1 SDK yet.
serveStdio(() => buildServer(root), {
	onerror: (error) => console.error(`bc-canvas-mcp: ${error.message}`)
});

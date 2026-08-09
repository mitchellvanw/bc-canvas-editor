/**
 * The canvas root, and the containment rule around it.
 *
 * The server is launched with `--root` (defaulting to the working directory)
 * and every path a tool accepts is turned into an absolute one through
 * `resolve()` before anything touches the filesystem. That check is the
 * security seam of the whole package: the model proposes a path, the server
 * decides whether it is inside the root, and the directory-traversal rule the
 * transport spec puts on servers is honoured here rather than assumed of the
 * caller.
 *
 * Symlinks are resolved first, so a link that sits inside the root but points
 * out of it is refused like any other escape. Paths that do not exist yet are
 * legal — a write names a file that is about to exist — so resolution walks up
 * to the deepest ancestor that does exist, resolves that, and re-attaches the
 * rest.
 *
 * Filesystem calls are synchronous throughout the server: one canvas file per
 * call, one caller at a time, and the alternative buys nothing but colour.
 */

import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { realpathSync, statSync } from 'node:fs';

/** A path that resolved outside the root. Never a retry; the model needs a different path. */
export class OutsideRoot extends Error {
	constructor(
		readonly input: string,
		readonly root: string
	) {
		super(
			`${input}: outside the canvas root. Paths are relative to ${root}, ` +
				`and the server will not follow one out of it.`
		);
	}
}

export interface CanvasRoot {
	/** The root itself: absolute, with every symlink already resolved. */
	readonly path: string;
	/** An absolute path inside the root, or `OutsideRoot`. The file need not exist. */
	resolve(input: string): string;
	/** The path a tool would name, relative to the root and always `/`-separated. */
	relative(absolute: string): string;
}

/** The deepest existing ancestor of `path`, resolved, plus the segments below it. */
function realAncestor(path: string): string {
	const below: string[] = [];
	let at = path;
	for (;;) {
		try {
			return join(realpathSync(at), ...below);
		} catch {
			const up = dirname(at);
			// The filesystem root itself failing to resolve is not a path problem.
			if (up === at) return path;
			below.unshift(basename(at));
			at = up;
		}
	}
}

function inside(path: string, root: string): boolean {
	return path === root || path.startsWith(root + sep);
}

/**
 * Open the root at startup. Throws when it is missing or is not a directory —
 * a launch misconfiguration, which `main.ts` reports on stderr and exits on.
 */
export function openRoot(input: string): CanvasRoot {
	const absolute = resolve(input);
	let path: string;
	try {
		path = realpathSync(absolute);
	} catch {
		throw new Error(`no such directory: ${absolute}`);
	}
	if (!statSync(path).isDirectory()) throw new Error(`not a directory: ${absolute}`);

	return {
		path,
		resolve(candidate: string): string {
			const target = realAncestor(isAbsolute(candidate) ? candidate : resolve(path, candidate));
			if (!inside(target, path)) throw new OutsideRoot(candidate, path);
			return target;
		},
		relative(absolutePath: string): string {
			if (!inside(absolutePath, path)) throw new OutsideRoot(absolutePath, path);
			return absolutePath.slice(path.length + 1).split(sep).join('/');
		}
	};
}

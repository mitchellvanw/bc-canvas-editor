/**
 * The canvas root, and the containment rule around it.
 *
 * A root is opened once — from the server's `--root`, from a CLI invocation's
 * working directory, from the workspace folder holding the markdown file a
 * fence sits in — and every path any caller accepts is turned into an absolute
 * one through `resolve()` before anything touches the filesystem.
 *
 * This is the bound on the walk, not a security seam. It was written as one,
 * when the server was the only caller and the paths came from a model; the
 * honest reading is narrower and survives every caller. `findCanvases` needs to
 * know where to stop, `relative()` needs a base to name paths against, and both
 * are meaningless without a root. Containment is what makes the root a root.
 * A caller that wanted the whole disk would open `/` and get it (which is why
 * that case is tested rather than assumed away).
 *
 * Symlinks are resolved first, so a link that sits inside the root but points
 * out of it is refused like any other escape. Paths that do not exist yet are
 * legal — a write names a file that is about to exist — so resolution walks up
 * to the deepest ancestor that does exist, resolves that, and re-attaches the
 * rest.
 *
 * Filesystem calls are synchronous throughout: one canvas file per call, one
 * caller at a time, and a fence resolves during a markdown-it renderer rule
 * that cannot await. The alternative buys nothing but colour.
 */

import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { realpathSync, statSync } from 'node:fs';

/** A path that resolved outside the root. Never a retry; it takes a different path. */
export class OutsideRoot extends Error {
	constructor(
		readonly input: string,
		readonly root: string
	) {
		super(
			`${input}: outside the canvas root. Paths are relative to ${root}, ` +
				`and a path out of it is not followed.`
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

/**
 * The root with exactly one trailing separator — what a child path must start
 * with. Almost every root needs one appended; the filesystem root already has
 * it, and appending anyway gives `//`, which nothing starts with, so every path
 * on the machine would read as outside. Both callers go through here.
 */
function boundary(root: string): string {
	return root.endsWith(sep) ? root : root + sep;
}

function inside(path: string, root: string): boolean {
	return path === root || path.startsWith(boundary(root));
}

/**
 * Why an otherwise valid root will not be opened, or null.
 *
 * Only one rule, and it is policy rather than containment — the rule above
 * holds for `/` like any other directory, and is tested there. Claude Desktop
 * starts a stdio server at the filesystem root, so the server's default lands
 * on `/` whenever `--root` is left off; opening it is legal and useless,
 * because the first listing would try to walk the whole disk. Refusing costs
 * nothing — nobody keeps a project at `/` — and it fails at the point of
 * opening, where a reader can still act on it, rather than as a listing that
 * never comes back.
 *
 * The sentence names `--root` because every caller that can land here spells
 * the flag that way. A surface with no flag to offer — a fence, which takes
 * its root from the document rather than an argument — cannot reach `/` in the
 * first place, since there is no workspace folder at the filesystem root.
 */
export function whyUnservable(path: string): string | null {
	if (dirname(path) !== path) return null;
	return (
		`${path} is the filesystem root, not a project — listing it would walk the whole disk.\n` +
		`Pass --root <directory>, naming the folder your canvases live under.`
	);
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
			return absolutePath.slice(boundary(path).length).split(sep).join('/');
		}
	};
}

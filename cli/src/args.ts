/**
 * Option parsing, hand-rolled for the sentences it produces.
 *
 * `node:util`'s `parseArgs` would do the mechanics, and its refusals are
 * Node's — `Unknown option '--hieght'`, with no idea what command was run or
 * what it does take. The whole interface of this program is its help text and
 * its refusals, so the forty lines are worth owning.
 *
 * Both spellings of a value option are accepted, `--root dir` and `--root=dir`,
 * matching the server's own `--root` handling exactly. `--` ends the options,
 * so a canvas named like a flag is still nameable.
 */

/** A refusal the reader can fix by typing something else. Exits 2, not 1. */
export class UsageError extends Error {}

export interface OptionSpec {
	/** Options that stand alone. */
	readonly booleans?: readonly string[];
	/** Options that take the word after them. */
	readonly values?: readonly string[];
}

export interface ParsedOptions {
	readonly booleans: ReadonlySet<string>;
	readonly values: ReadonlyMap<string, string>;
	/** Everything that was not an option, in the order it was written. */
	readonly operands: readonly string[];
}

function known(spec: OptionSpec): string[] {
	return [...(spec.booleans ?? []), ...(spec.values ?? [])].map((name) => `--${name}`).sort();
}

export function parseOptions(argv: readonly string[], spec: OptionSpec): ParsedOptions {
	const booleans = new Set<string>();
	const values = new Map<string, string>();
	const operands: string[] = [];

	for (let i = 0; i < argv.length; i++) {
		const argument = argv[i];

		if (argument === '--') {
			operands.push(...argv.slice(i + 1));
			break;
		}
		if (!argument.startsWith('--')) {
			operands.push(argument);
			continue;
		}

		const split = argument.indexOf('=');
		const name = (split === -1 ? argument : argument.slice(0, split)).slice(2);

		if (spec.booleans?.includes(name)) {
			if (split !== -1) throw new UsageError(`--${name} takes no value.`);
			booleans.add(name);
			continue;
		}
		if (spec.values?.includes(name)) {
			const value = split === -1 ? argv[++i] : argument.slice(split + 1);
			if (value === undefined || value === '') {
				throw new UsageError(`--${name} needs a value after it.`);
			}
			values.set(name, value);
			continue;
		}

		throw new UsageError(
			`no such option: ${argument}. This command takes ${known(spec).join(', ')}.`
		);
	}

	return { booleans, values, operands };
}

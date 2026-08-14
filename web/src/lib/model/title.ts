/** Title bar per SPEC §10: `<canvas name> — BC Canvas`; unnamed reads Untitled. */
export function windowTitle(name: string): string {
	const trimmed = name.trim();
	return `${trimmed === '' ? 'Untitled' : trimmed} — BC Canvas`;
}

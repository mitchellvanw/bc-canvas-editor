/**
 * Build risk #2 (SPEC §8.4, §13): the documented build-time AA check of the
 * quiet-sheet tokens. Reads the shipped `src/app.css` so the check can never
 * drift from the CSS the sheet actually renders with; if a pair fails here,
 * the token shifts everywhere — AA outranks palette attachment.
 *
 * Outcome of the check, for the record:
 * - Every SPEC §5 fill/ink pair passes as used (near-black ink text on the
 *   pastel fills, same-hue ink borders against sheet and paper).
 * - The prototype's faint gray `#8E948C` fails AA as text on both grounds
 *   (≈3:1); it was shifted out of every text role. Secondary text uses
 *   `--color-ink-soft` instead; the faint gray survives only as
 *   `--color-ink-faint` for decorative hairlines and neutral list markers,
 *   which WCAG 1.4.11 exempts.
 * - The pink collaborator underline (collaborator fill on sheet, ≈1.9:1) is
 *   decorative: identification is carried by the collaborator name itself,
 *   set in collaborator ink, which must pass 4.5:1 — asserted below. Per
 *   WCAG 1.4.11 the underline itself carries no requirement.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../app.css', import.meta.url), 'utf8');

function token(name: string): string {
	const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
	if (!match) throw new Error(`token --color-${name} missing from src/app.css @theme`);
	return match[1].toLowerCase();
}

function channels(hex: string): number[] {
	return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** WCAG 2.x relative luminance. */
function luminance(hex: string): number {
	const [r, g, b] = channels(hex).map((v) => {
		const c = v / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, 1..21. */
function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** The color an alpha-composited foreground actually renders as. */
function blend(fg: string, bg: string, alpha: number): string {
	const mixed = channels(fg).map((f, i) => Math.round(alpha * f + (1 - alpha) * channels(bg)[i]));
	return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const MEANINGS = ['command', 'query', 'event', 'policy', 'collaborator', 'hotspot', 'term'];

describe('quiet-sheet tokens meet WCAG AA (SPEC §8.4)', () => {
	it('body text passes 4.5:1 on both grounds (cream paper is an at-risk pair)', () => {
		for (const text of ['ink', 'ink-soft']) {
			for (const ground of ['sheet', 'paper']) {
				expect(contrast(token(text), token(ground)), `${text} on ${ground}`).toBeGreaterThanOrEqual(
					4.5
				);
			}
		}
	});

	it('title-block text passes 4.5:1 on the ink block, including the 60% color-mix eyebrow', () => {
		expect(contrast(token('sheet'), token('ink'))).toBeGreaterThanOrEqual(4.5);
		// The eyebrow is color-mix(in srgb, sheet 60%, ink) — dimmed by colour,
		// never by opacity (ticket 063) — which is exactly this blend.
		const eyebrow = blend(token('sheet'), token('ink'), 0.6);
		expect(contrast(eyebrow, token('ink')), 'eyebrow at 60% mix').toBeGreaterThanOrEqual(4.5);
	});

	it('ink text on the pastel fills passes 4.5:1 (chips, glyphs, term highlighter — at-risk pairs)', () => {
		for (const fill of ['command', 'query', 'event', 'term']) {
			expect(contrast(token('ink'), token(fill)), `ink on ${fill} fill`).toBeGreaterThanOrEqual(4.5);
		}
	});

	it('collaborator names in collaborator ink pass 4.5:1 on the sheet (the underline is decorative)', () => {
		expect(contrast(token('collaborator-ink'), token('sheet'))).toBeGreaterThanOrEqual(4.5);
	});

	it('same-hue ink borders pass 3:1 non-text contrast against sheet and paper (chips, markers, legend swatches)', () => {
		for (const meaning of MEANINGS) {
			for (const ground of ['sheet', 'paper']) {
				expect(
					contrast(token(`${meaning}-ink`), token(ground)),
					`${meaning}-ink border on ${ground}`
				).toBeGreaterThanOrEqual(3);
			}
		}
	});

	it('the faint gray is never a text color — it fails AA and is reserved for decorative rules', () => {
		// Documents the shift: the visual-language prototype set relationship
		// badges and the attribution in this gray; both now use ink-soft. The
		// two-sided relationship's set-back side is the same case again — the
		// canonical-v5 mockup drew `theirs` in ink-faint, and it ships in
		// ink-soft for exactly this reason.
		expect(contrast(token('ink-faint'), token('sheet'))).toBeLessThan(4.5);
		expect(contrast(token('ink-soft'), token('sheet'))).toBeGreaterThanOrEqual(4.5);
	});

	it('the caution ring passes 4.5:1 — hotspot-ink text on its 8% hotspot wash over sheet', () => {
		// The anti-pattern trait chip (SPEC §5): text and ⚠ in hotspot ink on
		// `rgb(247 107 163 / 0.08)` over the sheet, per CanvasSheet's
		// .role--caution. The wash literal here mirrors the component's.
		const ground = blend(token('hotspot'), token('sheet'), 0.08);
		expect(contrast(token('hotspot-ink'), ground)).toBeGreaterThanOrEqual(4.5);
	});
});

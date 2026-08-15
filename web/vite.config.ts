import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// The site's project root is `web/`, but Cloudflare Pages builds from
			// the repo root with its output dir set to `build` — so the adapter
			// keeps writing there.
			adapter: adapter({ pages: '../build', assets: '../build' }),

			// Prerendered pages carry the policy as a <meta> tag, with SvelteKit
			// hashing its own inline init script — which is why script-src can stay
			// strict on a static host. The two cloudflareinsights hosts are Web
			// Analytics: the edge injects the loader, the beacon posts home.
			// style-src takes unsafe-inline because style= attributes (homepage
			// stagger/confetti vars) have no hashable form; img-src takes data: and
			// blob: for the inlined example SVGs and the PNG capture path.
			// frame-ancestors can't ride a <meta> policy; static/_headers keeps
			// x-frame-options DENY for that.
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self', 'https://static.cloudflareinsights.com'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:', 'blob:'],
					'font-src': ['self'],
					'connect-src': ['self', 'https://cloudflareinsights.com'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'frame-src': ['none'],
					'form-action': ['self']
				}
			}
		})
	],

	// `examples/` and `docs/` live at the repo root, outside this project's
	// root. They are served in dev because the homepage imports the committed
	// example SVGs as assets and `/docs` imports its eight section bodies from
	// `docs/site/*.md`; the build inlines both either way.
	server: { fs: { allow: ['../examples', '../docs'] } }
});

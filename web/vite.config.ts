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
			adapter: adapter({ pages: '../build', assets: '../build' })
		})
	],

	// `examples/` lives at the repo root, outside this project's root. It is
	// served in dev because the homepage imports the committed example SVGs as
	// assets; the build inlines them either way.
	server: { fs: { allow: ['../examples'] } }
});

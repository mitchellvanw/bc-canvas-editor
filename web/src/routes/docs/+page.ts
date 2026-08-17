/**
 * `/docs` ships no client JavaScript (SPEC §2.1).
 *
 * This declaration belongs *here* and not in `+page.server.ts`, and the
 * placement is load-bearing rather than stylistic. `app.html` carries
 * `data-sveltekit-preload-data="hover"` site-wide, so the router follows every
 * hover on a Docs link. From the universal module it learns the page is
 * CSR-less by loading this one-line file; from the server module it could only
 * learn it by fetching the node module *and* `__data.json` — measured at 27 KB
 * against 412 bytes.
 */
export const csr = false;

---
source: tests/cross-cutting/entry-chunk-budget.spec.ts
sha256: 88eadcf028082a9c9f0424dfadc29144cc0873359ba9d665c1b27fd523108cb1
signature: eab2a92bdafe7bb599daa488109e2b40102ccccb576b8ae52c91079bb9fbf2fa
generated_at: 2026-11-10T06:36:38.284990+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/entry-chunk-budget.spec.ts

## Purpose

Guards the production entry-chunk size against silent bloat. It runs a real `vite build` (forced to `NODE_ENV=production`) into a scratch temp directory, then asserts that the single JS file named by `index.html`'s `<script type="module">` tag stays under a raw-byte budget, and that the generated Zod schema chunk remains a separate, lazily-loaded file rather than being inlined into the entry graph.

## Key elements

- **`ENTRY_CHUNK_BUDGET_BYTES`** (`480 * 1024`) — the raw-byte ceiling for the entry chunk. Chosen with headroom over the current ~397 KB but well below the pre-fix 767 KB so a large dependency re-entering the entry graph fails the test.
- **`entryScriptPath(html)`** — extracts the `/assets/<file>.js` path from `index.html`'s module `<script>` tag via regex. Throws if the tag shape changes.
- **`beforeAll` hook** — creates a temp dir (`mkdtempSync` under `os.tmpdir()`), invokes the locally-installed `vite` binary (`node_modules/.bin/vite build --outDir …`) with `NODE_ENV=production`, and reads the resulting `index.html`. Timeout is 120 s.
- **`afterAll` hook** — removes the temp directory recursively.
- **Test: "stays under the raw-byte budget"** — stats the entry JS file and asserts its size ≤ `ENTRY_CHUNK_BUDGET_BYTES`, formatting the failure message in KB.
- **Test: "does not eagerly load the response-schema contract chunk"** — confirms a `schemas.zod-*.js` file exists in `assets/` (the lazy split is still happening) and that its filename does **not** appear in `index.html` (no `<script>` or `<link rel="modulepreload">` reference), i.e. it is not fetched on first load.

## Relationships

None (no graph neighbors listed).

## Notes

- The build is invoked against the **local** `node_modules/.bin/vite` binary, not via `npx`, so the test has zero network/npm resolution dependency.
- `NODE_ENV` is explicitly overridden to `production` because Vitest sets it to `test`, which would produce a dev build (larger, and different import graph — e.g. `isReportOnly()` branches would be excluded).
- Gzip size is deliberately **not** budgeted: raw size is what a static-import regression changes directly, and gzip ratios vary with interleaving, making the assertion noisier without adding a distinct check.
- The schema-laziness test inspects `index.html` (the browser's parse-time fetch list), **not** the entry chunk's source text — a dynamic `import()` inside the entry JS is the expected lazy mechanism and would not trigger a false failure.
- `ROOT` is derived from `import.meta.dirname` (two levels up from `tests/cross-cutting/`), so the file must remain at that path for the relative binary lookup to work.

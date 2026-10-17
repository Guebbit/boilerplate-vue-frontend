---
source: tests/cross-cutting/entry-chunk-budget.spec.ts
sha256: 87eae58907656cd7bf2a7df6342f6bf426abaf78d886853fa3eba7c6554f4b09
generated_at: 2026-10-17T02:00:20.347277+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/entry-chunk-budget.spec.ts

## Purpose

Guards against the production entry chunk (the single JS file every visitor downloads before any other code runs) growing past a raw-byte ceiling. It performs a real `vite build` into a throwaway temp directory and asserts both a size budget and that the large Zod schema contract chunk remains code-split (i.e., not referenced by the HTML shell at parse time).

## Key elements

- **`ENTRY_CHUNK_BUDGET_BYTES`** (460 KB) — the raw-byte cap. Chosen with headroom over the post-fix measured size (407 KB) but far below the pre-fix regression (767 KB).
- **`ROOT`** — repo root, resolved two levels up from this file.
- **`entryScriptPath(html)`** — extracts the `src` of the `<script type="module">` tag from `index.html`; throws if the tag is missing.
- **`beforeAll` hook** — creates a `mkdtempSync` dir, runs `node_modules/.bin/vite build --outDir <dir>` (120 s timeout), reads `index.html`. One build serves all assertions.
- **`afterAll` hook** — recursively removes the temp directory.
- **Test "stays under the raw-byte budget"** — `statSync` on the entry JS file; fails with a human-readable KB message.
- **Test "does not eagerly load the response-schema contract chunk"** — asserts a `schemas.zod-*.js` file exists in `assets/` (split still happens) *and* that `index.html` does not reference it via `<script>` or `<link rel="modulepreload">` (not loaded at parse time).

## Relationships

No graph neighbors are recorded. The test is self-contained but depends externally on:

- `node_modules/.bin/vite` — invoked via `execFileSync` for the production build.
- Build output shape — expects `index.html` with a `<script type="module" src="/assets/…">` tag and a co-located `assets/` directory.
- The code-split behavior it verifies is produced by `main.ts` (lazy `import()` gated on `shouldValidateResponses()`) and `scripts/contracts/strip-schema-descriptions.ts`, as noted in the module docblock.

## Notes

- Budgets **raw bytes**, not gzip. The docblock explains gzip ratio is too noisy for a stable assertion; raw size directly reflects what a static-import regression changes.
- The second test inspects the **HTML shell**, not the entry chunk's JS text, so a dynamic `import()` of the schema chunk inside the entry JS (the intended lazy-load mechanism) does not trip it.
- The test runs inside the unit-test suite; it deliberately calls the local `vite` binary rather than `npx` to avoid any npm network resolution.
- The 120 s `beforeAll` timeout is generous to accommodate cold CI builds; locally the build takes a few seconds.

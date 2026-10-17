---
source: vitest.config.mutation.ts
sha256: a63f101a9da3cd03de365d3426ade4486a644ee3c562abd224448e087236c5bc
generated_at: 2026-10-17T02:48:55.206733+00:00
model: ollama:qwen3.8:27b
---

# vitest.config.mutation.ts

## Purpose

Vitest configuration consumed only by Stryker's mutation-testing runner (`npm run test:mutation`). It layers a thin override on top of the shared `vitest.config.ts` to fix three sandbox-specific problems: dropping the explicit `root` path (which would resolve to the sandbox directory and crash vitest), pinning the worker pool to one (to avoid Stryker's concurrency multiplier blowing up memory), and excluding spec files that read source text or docs the sandbox does not contain.

## Key elements

- **`mutationConfig`** (module-level const) — the result of `mergeConfig(baseConfig, …)` with the `test.root` key deleted after the merge. This is the single object Stryker's Vitest runner reads.
- **`export default mutationConfig`** — the sole export.
- **`delete mutationConfig.test?.root`** — removes the inherited `root` key post-merge so vitest falls back to `process.cwd()` (the sandbox). Must be a `delete`, not `root: undefined`, because Vite's `mergeConfig` silently skips `undefined` values.
- **`test.maxWorkers: 1` / `test.fileParallelism: false`** — collapses the pool to a single serial worker. Under Stryker each runner spawns its own pool; with N runners × cores forks the machine thrashes. One worker also matches `coverageAnalysis: "perTest"`, which already narrows each mutant to a small test set.
- **`test.exclude`** — extends `configDefaults.exclude` with `**/dist/**`, `**/.stryker-tmp/**`, `reports/**`, and three cross-cutting specs (`mutation-safe-imports`, `sitemap-document`, `a11y-coverage`) that would fail inside the sandbox because they assert on raw source text or files absent from the sandbox copy.

## Relationships

- **`vitest.config.ts`** — imported as `baseConfig`; every setting here is an *override on top of* that file. All shared test setup lives there; this file should stay a thin delta.
- **`tsconfig.node.json`** — governs TypeScript compilation for this Node-side config file (it is not picked up by the browser/app tsconfig).

## Notes

- **Why `delete` and not `root: undefined`:** `mergeConfig` walks the override object and skips keys whose value is `undefined`, so the base `root` survives. The key must be removed *after* the merge call.
- **Keep this file thin.** Any setting that belongs to the normal test run belongs in `vitest.config.ts`. If a new exclusion is sandbox-specific, add it here; if it is a general "not a test source" path, add it to the base config.
- **The three excluded specs** (`mutation-safe-imports`, `sitemap-document`, `a11y-coverage`) do not kill mutants; they guard documentation or formatting. Excluding them costs no mutation signal but prevents a dry-run abort that would look like a false failure.
- **Worker-pool interaction with Stryker:** the paired Jest backend pins the same single-worker setting in `jest.config.mutation.js`. See `docs/tools/mutation-testing.md#the-worker-pool-multiplication` for the full explanation.

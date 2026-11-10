---
source: vitest.config.mutation.ts
sha256: a63f101a9da3cd03de365d3426ade4486a644ee3c562abd224448e087236c5bc
signature: 3ee339a55b34b937cf2c29b4200d6e510a3d868d08909d365dddba16e3f6e789
generated_at: 2026-11-10T08:33:55.815584+00:00
model: ollama:qwen3.8:27b
---

# vitest.config.mutation.ts

## Purpose

Vitest configuration consumed exclusively by Stryker's Vitest runner (`npm run test:mutation`). It layers a small set of sandbox-compatibility overrides on top of the shared base config so that the dry run and mutant runs succeed inside Stryker's `.stryker-tmp/sandbox-*` copy of the project.

## Key elements

- **`mutationConfig`** — `mergeConfig(baseConfig, defineConfig({…}))` result; the single source of truth for the mutation run.
- **`delete mutationConfig.test?.root`** — removes the `root` key *after* merging so Vitest falls back to CWD (the sandbox). Setting `root: undefined` in the override object would be silently ignored by Vite's merge walker.
- **`maxWorkers: 1` / `fileParallelism: false`** — prevents the worker-pool multiplication that occurs when Stryker's `concurrency` runners each spin up a full Vitest pool; avoids OOM on multi-core machines.
- **`exclude` array** — appends `dist/`, `.stryker-tmp/`, `reports/`, and three cross-cutting spec files that either read source-as-text (Babel/Stryker instrumentation breaks assertions) or read files absent from the sandbox (`sitemap.md`).
- **`export default mutationConfig`** — the entry point Stryker's Vitest runner imports.

## Relationships

- **`vitest.config.ts`** — imported as `baseConfig`; all shared test setup (transformers, globals, coverage, etc.) lives there. This file is a *thin override* and must not duplicate base settings.
- **`tsconfig.node.json`** — this file is a Node-side script (no DOM, no JSX) and is compiled under the node tsconfig rather than the browser one.

## Notes

- **`delete` is load-bearing.** Replacing it with `root: undefined` in the `defineConfig` object will appear to fix the problem but actually does nothing—Vite's `mergeConfig` skips `undefined` values, the base `root` survives, and the sandbox dry run crashes with `ERR_LOAD_URL`.
- **Excluded specs kill zero mutants.** They guard documentation or tooling (a11y sweeps, import directives, sitemap consistency). Dropping them costs no mutation signal; keeping them aborts the run before any mutant is tested.
- **Keep overrides minimal.** Anything that belongs in the normal Vitest run belongs in `vitest.config.ts`. This file should stay a 2-line-diff override so the two configs never drift.
- **ESLint suppression** on the `delete` line is intentional: `mergeConfig`'s declared return type is too wide for the optional-chain member access, so the rule is disabled inline rather than widened globally.

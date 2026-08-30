# vitest.config.mutation.ts

## Purpose

A thin Vitest override consumed only by Stryker's mutation-testing dry run (`npm run test:mutation`). It layers two small changes on top of the shared base config so that Stryker's sandboxed copy of the project can execute tests without a `root`-resolution crash or a false failure from a meta-spec.

## Key elements

- **`mutationConfig`** — `mergeConfig(baseConfig, defineConfig({...}))` followed by `delete mutationConfig.test?.root`. The merge adds extra `exclude` globs; the `delete` strips the base config's explicit `root` so Vitest falls back to `process.cwd()` (the sandbox dir).
- **`exclude` additions** — on top of `configDefaults.exclude`, excludes `**/dist/**`, `**/.stryker-tmp/**`, `reports/**`, and `tests/cross-cutting/mutation-safe-imports.spec.ts`.
- **`export default mutationConfig`** — single default export; no other bindings are published.

## Relationships

- **`vitest.config.ts`** — imported as `baseConfig`; every shared setting (plugins, environment, coverage, etc.) comes from that file. This file intentionally changes nothing else.
- **`package.json`** — the `test:mutation` script references this config (typically via `--config vitest.config.mutation.ts`); that script is the only consumer.
- **`tsconfig.node.json`** — provides the compiler options under which this file is type-checked and transpiled (ESM `.ts` at the project root).

## Notes

- **`delete` is mandatory, not stylistic.** Passing `root: undefined` in the override object is a silent no-op: Vite's `mergeConfig` skips keys whose value is `undefined`, so the base `root` survives. The key must be removed *after* the merge.
- **The excluded spec is deliberate.** `mutation-safe-imports.spec.ts` asserts on comment placement in source files. Inside the sandbox those files are Babel-instrumented output where comment positions shift; the spec would fail on formatting, not on a real mutation. It kills no mutants, so dropping it is cost-free.
- **Keep it thin.** All shared test-setup belongs in `vitest.config.ts`. This file should only contain the sandbox-specific deltas; anything added here risks diverging the two runs.

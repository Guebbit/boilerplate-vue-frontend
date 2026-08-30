# vitest.config.ts

## Purpose

Configures the Vitest unit and component test suite: environment, file inclusion, CSS handling, and—most critically—per-file coverage thresholds. It merges the resolved `vite.config.ts` with Vitest-specific `test` options and exports a plain object so `vitest.config.mutation.ts` can layer overrides on top.

## Key elements

- **`resolvedViteConfig`** — calls `vite.config.ts` (which is a function reading `VITE_APP_PORT` via `loadEnv`) to produce a plain object, required because `mergeConfig` cannot merge a function.
- **`COVERAGE_FLOOR`** — a single `{ statements, branches, functions, lines: 70 }` object shared by most threshold globs so the number is written once.
- **Default export (`mergeConfig(resolvedViteConfig, defineConfig({...}))`)** — the final config object consumed by `vitest` and by `vitest.config.mutation.ts`.
- **`test.environment`** — points to `./tests/support/unit/jsdom-quiet-css.environment.ts` (a quieted jsdom), not the stock `'jsdom'`.
- **`test.setupFiles`** — `tests/support/unit/setup.ts`.
- **`test.include`** — three globs: `tests/unit/**`, `tests/cross-cutting/**`, and `src/modules/*/tests/**` (co-located module specs).
- **`test.server.deps.inline`** — inlines `@guebbit/vue-toolkit` and `vuetify` to avoid raw CSS import errors from their ESM builds.
- **`test.coverage.thresholds.perFile: true`** — enforces each threshold per individual file rather than pooling across a glob; without it a covered file can mask an untested one.
- **Per-glob threshold entries** — e.g. `src/modules/*/store.ts`, `src/app/guards/!(authentications).ts`, `src/infrastructure/http/**`, etc. `authentications.ts` carries intentionally lower, measured values (branches 50, functions 55) as a ratcheting floor, not a target.
- **`test.coverage.include: ['src/**/*.{ts,vue}']`** — forces every source file into the coverage denominator so untested files appear as 0% instead of being absent.

## Relationships

- **`vite.config.ts`** — imported and resolved at the top of this file; its plugins and base Vite options are merged into the final Vitest config via `mergeConfig`.
- **`vitest.config.mutation.ts`** — imports this file's default export and merges mutation-testing overrides on top; this file must therefore export a plain object, not a function.
- **`package.json`** — provides the `test` / `test:coverage` / `type-check-only` scripts that invoke this config (and the separate type-check command, since Vitest does not type-check).
- **`tsconfig.node.json`** — supplies the TypeScript compiler settings for root-level `.ts` config files (including this one) during tooling runs.

## Notes

- **Vitest does not type-check.** A spec that fails to compile can still report green. `npm run type-check-only` is the actual compile gate.
- **`perFile: true` is the single load-bearing threshold setting.** Removing it silently reverts to pooled averages, letting one well-covered file carry several untested ones past the 70% gate.
- **The extglob `!(authentications)` in the guards glob is functional, not cosmetic.** A file matching two glob keys lands in both groups; the negation is what actually exempts it from the broad guard threshold.
- **`tests/cross-cutting/store-location.spec.ts`** asserts that every `defineStore` under `src/modules/` sits in either `store.ts` or `stores/*.ts`, protecting the two threshold globs from silently losing a new store file.
- **Coverage `exclude` list** intentionally removes type-only dirs, `main.ts` (e2e-only), vendor Vuetify config, and `src/modules/*/tests/**` (tests are not the thing being measured).

# vitest.config.ts

## Purpose

Vitest configuration for the unit and component test suite (jsdom-based). It merges the Vite config, points Vitest at the correct spec globs, and enforces **per-file** coverage thresholds so no untested file can hide inside a pooled average.

## Key elements

- **`COVERAGE_FLOOR`** — Single object holding the shared 70% floor (statements, branches, functions, lines). Referenced by every threshold glob except `authentications.ts`, which has its own lower, measured values.
- **`resolvedViteConfig`** — Resolves the function exported by `vite.config.ts` (which calls `loadEnv`) into a plain object so `mergeConfig` can work. Must be done here, not at merge time.
- **`test.environment`** — Points to a custom `jsdom-quiet-css.environment.ts` wrapper that filters parser noise; not the stock `'jsdom'` string.
- **`test.include`** — Three globs: central unit tests, cross-cutting tests, and module-local specs (`src/modules/*/tests/`). The `e2e/` subfolder under each module is excluded by the `.spec.ts` suffix and by `tsconfig.vitest.json`.
- **`test.server.deps.inline`** — Inlines `@guebbit/vue-toolkit` and `vuetify` to work around raw `.css` imports in their ESM builds.
- **`test.coverage.thresholds.perFile: true`** — The load-bearing line. Without it Vitest pools all files under a glob into one average, letting a covered file mask an untested one. With it, each file is checked independently and the error names the offender.
- **`test.coverage.include` / `exclude`** — Forces every source file into the coverage denominator (prevents untested files from being silently absent) while excluding type declarations, bootstrap, vendor config, and the test files themselves.

## Relationships

- **`vite.config.ts`** — Imported and resolved to an object before `mergeConfig`; supplies base Vite settings (resolve aliases, plugins, etc.) that Vitest inherits.
- **`vitest.config.mutation.ts`** — Imports this file's default export (a plain object) and layers Stryker-specific overrides on top; the design of keeping the export as an object (not a function) exists specifically to make that merge possible.
- **`tsconfig.node.json`** — Governs type-checking of this config file and other tooling scripts; Vitest itself does not type-check, so a compile error in a spec will not surface in a test run.

## Notes

- **Vitest does not type-check.** A spec that fails to compile can still pass. Use `npm run type-check-only` separately.
- **Thresholds are per-file, not pooled.** Raising `COVERAGE_FLOOR` changes every glob at once; the exception (`authentications.ts`) is intentional and must be updated independently.
- **`authentications.ts` thresholds are a measured floor, not a target.** They record where the file actually stands (2026-08-08); the convention is to ratchet them up over time, never lower them to make a run pass.
- **Glob extglob negation is required.** `'src/app/guards/!(authentications).ts'` is not cosmetic: a file matching two glob keys lands in both groups, so the exemption must *leave* the broad glob to take effect.
- **Coverage `include` glob is the fix for silent gaps.** Without it, v8 only reports files a test actually imported; untested files were absent from the report rather than showing 0%.

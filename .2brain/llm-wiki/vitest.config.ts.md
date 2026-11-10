---
source: vitest.config.ts
sha256: 02a09d1774a489cd85c9a66baeb890a97a7c196fd57e309ec5f764a77d688ea1
signature: 171aef5252a731f79a05891a8221cdbff33414a2fdeaa8b611ef20233d31d373
generated_at: 2026-11-10T08:34:10.150784+00:00
model: ollama:qwen3.8:27b
---

# vitest.config.ts

## Purpose

Vitest configuration for the unit and component test suite (jsdom-based: pure functions, stores, composables, single Vue components). It resolves and merges the app's Vite config with test-specific settings, producing a single object that downstream configs can build on.

## Key elements

- **`resolvedViteConfig`** — Calls `viteConfig({ command: 'serve', mode: 'test' })` to resolve the function-form export from `vite.config.ts` into a plain object, making it compatible with `mergeConfig`.
- **`DEPTH_KNOBS` / `depthKnobs`** — An allowlist (`TEST_PROPERTY_RUNS`, `RANDOM_DATA_SEED`) of env vars read from `process.env` (shell-first) then `.env`. Only these reach the test worker; nothing else from `.env` is exposed.
- **`export default`** — `mergeConfig(resolvedViteConfig, defineConfig({ test: { … } }))`. The merged test block sets:
  - `environment` — a custom jsdom wrapper (`tests/support/unit/jsdom-quiet-css.environment.ts`) that filters CSS parser noise.
  - `setupFiles` — `tests/support/unit/setup.ts`.
  - `maxWorkers: 2` — deliberate cap for the pre-commit path; overridable via `VITEST_MAX_WORKERS`.
  - `env` — pins `VITE_API_URL` to `''` and injects the depth knobs.
  - `restoreMocks` / `unstubEnvs` / `unstubGlobals` — all `true`; each runs before every test so specs must create spies/stubs in `beforeEach`.
  - `testTimeout: 15_000` — raised from the 5 s default to survive slow CI runners.
  - `include` / `exclude` — three glob roots (`tests/unit/`, `tests/cross-cutting/`, `src/modules/*/tests/`) for `.spec.ts` files; Cypress e2e files are excluded by convention.
  - `server.deps.inline` — forces Vitest to process `@guebbit/vue-toolkit` and `vuetify` through its transform pipeline (they ship raw `.css` imports in ESM).
  - `css: true` — enables CSS processing in tests.
  - `root` — pinned to this file's directory via `fileURLToPath(new URL('./', import.meta.url))`.

## Relationships

- **`vite.config.ts`** — Imported directly. Because it exports a *function* (it reads `VITE_APP_PORT` via `loadEnv`), this file calls it before passing the result to `mergeConfig`. The resolved object is what gets merged under the test block.
- **`vitest.config.mutation.ts`** — Imports this file's default export and calls `mergeConfig` on top of it with mutation-testing overrides. That is why the default export here is a plain object (not a function).
- **`tsconfig.node.json`** — Provides the TypeScript compilation context for this file (and other node-side configs); it is the project that makes `npm run type-check-only` cover this file.

## Notes

- **Vitest does not type-check.** The transform strips types without validating them. A spec that fails to compile can still pass. Rely on `npm run type-check-only` for compile guarantees.
- **Default export shape is load-bearing.** It must remain a resolved object, not a function, so `vitest.config.mutation.ts` can `mergeConfig` over it.
- **Spy/stub lifecycle.** Because `restoreMocks`, `unstubEnvs`, and `unstubGlobals` all fire before every test, any `vi.spyOn`, `vi.stubEnv`, or `vi.stubGlobal` created at module scope or in `beforeAll` is destroyed before the first assertion. Always create them in `beforeEach`.
- **Test file placement is a convention, not just a glob.** Module-owned specs live in `src/modules/<name>/tests/`; cross-cutting and infrastructure specs live under `tests/unit/` and `tests/cross-cutting/`. The e2e subfolder in the same directory belongs to Cypress and is excluded by `tsconfig.vitest.json`.
- **`maxWorkers: 2` is a speed choice, not a correctness one.** Each worker is a full jsdom + Vuetify instance; two is enough for the pre-commit path and keeps memory in check on typical dev machines.

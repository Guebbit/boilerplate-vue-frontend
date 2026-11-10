---
source: tsconfig.vitest.json
sha256: 6118982b0167a88f5e8c828bfb8179ad902ee099e68f3040f37a17407efe26af
signature: 6118982b0167a88f5e8c828bfb8179ad902ee099e68f3040f37a17407efe26af
generated_at: 2026-11-10T08:33:31.667306+00:00
model: ollama:qwen3.8:27b
---

# tsconfig.vitest.json

## Purpose

TypeScript project-reference configuration for the Vitest unit-test type-check. It extends `tsconfig.app.json` and narrows the included files to the scope relevant to unit and cross-cutting tests (contracts, `src`, co-located module specs, `tests/`), while explicitly excluding Cypress e2e specs so they are not type-checked under Vitest's ambient types.

## Key elements

- **`extends: "./tsconfig.app.json"`** — inherits the base compiler options (paths, strictness, etc.) from the app config.
- **`include`** — enumerates the files this project covers: `contracts/rest`, `contracts/asyncapi.generated.ts`, `contracts/permission-vocabulary.ts`, `src/**/*` (and `.vue`), `tests/unit/**`, `src/modules/*/tests/**`, `tests/support/**`, `tests/cross-cutting/**`, `tests/lighthouse/**`, and `scripts/**/*.ts`.
- **`exclude`** — removes `tests/support/e2e/**` and `src/modules/*/tests/e2e/**` so co-located Cypress specs don't leak into the Vitest type-check.
- **`compilerOptions.composite: true`** — marks this as a project-references participant (required for `tsc -b` builds).
- **`compilerOptions.tsBuildInfoFile`** — writes incremental build state to `node_modules/.tmp/tsconfig.vitest.tsbuildinfo`.
- **`compilerOptions.lib: ["ESNext", "DOM"]`** — ambient libraries available to checked files.
- **`compilerOptions.types: ["vite/client", "node", "jsdom"]`** — ambient type packages in scope; notably *not* Cypress types.

## Relationships

None. No other file in this project is a declared graph neighbor of this config.

## Notes

- **`scripts/**/*.ts` is load-bearing in `include`.** The file `tests/unit/scripts/pairing/spec-identity.spec.ts` imports from `scripts/`. Without the entry, `tsc` reports TS6307 (file not in project) rather than a resolution error. The comment in the file calls this out explicitly.
- **The `exclude` array is load-bearing, not cosmetic.** Because `include` claims `src/modules/*/tests/**/*.ts`, co-located Cypress e2e specs in that same folder would otherwise be type-checked here and every `cy.*` call would error. Removing the exclude lines breaks the main type-check.
- **Cypress types are intentionally absent from `types`.** They are loaded by `tsconfig.cypress.json`; loading them here would pollute the Vitest scope.
- **`composite: true`** means this file must be referenced (via `"references"`) in a root `tsconfig.json` for `tsc -b` to pick it up; it cannot be used standalone with plain `tsc`.

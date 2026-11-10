---
source: tests/unit/infrastructure/http/response-schema-map.spec.ts
sha256: 7b11958485038f5a0e3ae23607c5a51d64bdc7909498777191932d9b07bcd09c
signature: d96bddcc85b76405c10d0bcab2e9dd89fcb97b93d56b97900585f6cfd3ddac73
generated_at: 2026-11-10T07:59:48.333522+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/response-schema-map.spec.ts

## Purpose

Guards the two invariants of the generated route-to-response-schema lookup table (`resolveResponseSchema` / `resolveRequestSchema`) that are invisible in a code review: regex **anchoring** (both `^` and `$` on every pattern) and **row ordering** (literal paths listed before parameterised siblings). It also verifies that the table covers every operation in `openapi.yaml`, that request-body schemas resolve, that no duplicate rows exist, and that the app's actual `@api` import call sites all resolve to a real schema.

## Key elements

- **`beforeAll` → `loadResponseSchemas(collectModuleResponseSchemas(enabledModules))`** — wires the per-module schema rows into the lookup exactly as `src/main.ts` does; awaited so every test sees them installed.
- **`schemaByName(name)`** — resolves a schema export from `@api/schemas` by string name via `asStub`, avoiding serialising deep Zod objects into `it.each` titles (which would exhaust the worker heap).
- **`SPEC_OPERATIONS`** — parsed from `openapi.yaml` at test time (not a hand-typed mirror), yielding `[METHOD, concrete-path, SchemaName][]` with `{param}` placeholders replaced by a representative ObjectId.
- **`importedApiFunctionNames()` / `isImportedByApp()`** — scans every `.ts`/`.vue` file under `src/` for `@api` import clauses, building a set of function names the app actually calls; used to cross-check the table independently of module ownership lists.
- **`describe('routeSchemas table')`** — coverage, request-schema resolution, duplicate-row detection, per-operation resolution, and the anchoring / non-empty-segment negative tests (each run for **every** row via `it.each`).
- **`describe('operations this app actually imports')`** — asserts the import-scanned set is a non-trivial partial subset of declared operations and that every imported operation resolves to the correct schema.

## Relationships

- **`tests/support/stub.ts`** — provides `asStub<T>`, a type-erasure wrapper used by `schemaByName` to access `@api/schemas` exports without triggering full Zod object serialisation in test titles.

## Notes

- The file reads `openapi.yaml` from disk at runtime (`process.cwd()`) rather than importing a generated constant, so the spec list cannot drift from the contract it guards.
- Anchoring tests assert **both** anchors (`^` and `$`) for **every** row, not just one representative, because either missing silently mis-routes deeper or prefixed paths.
- The `[^/]+` non-empty-segment test (trailing-slash guard) is filtered to only parameterised routes (`path.includes(ID)`).
- The "imported by app" describe block is intentionally a **second, independent** signal: it reads the same import shape as `tests/cross-cutting/module-coupling.spec.ts` but checks resolution correctness, not coupling.
- The file is truncated in the provided content; the "operations this app actually imports" suite likely contains further assertions after the canary check.

---
source: tests/unit/infrastructure/http/response-schema-map.spec.ts
sha256: e6933a20032eb514e7db832f754e20b497bd63c10aa8bc34ad5d9ed79017582c
generated_at: 2026-10-17T02:37:04.892206+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/response-schema-map.spec.ts

## Purpose

Unit tests for the route → response-schema lookup map (`response-schema-map.ts`). Verifies that `resolveResponseSchema` and `resolveRequestSchema` correctly map a `method` + concrete path to the right Zod schema, that the generated route table covers every `openapi.yaml` operation, and that pattern anchoring and ordering invariants hold—two properties invisible in a code review of the table itself.

## Key elements

- **`beforeAll` wiring** — calls `loadResponseSchemas(collectModuleResponseSchemas(enabledModules))` to register every module's response-schema rows, mirroring `src/main.ts`. Without it the lookup returns `undefined` and the suite passes vacuously.
- **`SPEC_OPERATIONS`** — parsed live from `openapi.yaml` at suite start; yields `[METHOD, concretePath, expectedSchemaName]` tuples with `{param}` placeholders replaced by a fixed ObjectId. This is the source of truth for coverage assertions.
- **`importedApiFunctionNames()` / `isImportedByApp()`** — regex-scans every `src/**/*.ts|vue` for `import { … } from '@api'` to build the set of operations the app actually calls. Used by the second `describe` block for an independent parity signal.
- **`describe('routeSchemas table')`** — core assertions: full OpenAPI coverage, no duplicate rows, correct schema resolution per operation, leading-anchoring (no prefix match), trailing-anchoring (no deeper-path match), and non-empty-segment (`[^/]+`) enforcement.
- **`describe('operations this app actually imports')`** — verifies the import-scan set is a non-trivial subset and that every imported operation resolves to the expected schema (truncated in source).
- **`schemaByName`** — thin wrapper around `asStub(…)` to fetch a schema by export name, avoiding serialising deep Zod objects into `it.each` titles.

## Relationships

- **`tests/support/stub.ts`** — imports `asStub`, which is used to access `schemas` (a module of Zod objects) by name without triggering deep-object serialisation in test titles.
- **`src/infrastructure/http/response-schema-map.ts`** — the unit under test; imports `loadResponseSchemas`, `resolveRequestSchema`, `resolveResponseSchema`, and the `ResponseSchemaRoute` type.
- **`@api/routes`** — the generated route table (`ROUTES`) consumed for duplicate-key and body-schema-name checks.
- **`@/kernel/registry` / `@/modules`** — `collectModuleResponseSchemas` and `enabledModules` supply the module rows wired in `beforeAll`.
- **`openapi.yaml`** (project root) — read at suite start to build `SPEC_OPERATIONS`; the spec is the ground truth, not a hand-maintained mirror.

## Notes

- **Anchoring is the primary guard.** Both `^` and `$` are asserted for *every* row, not just one representative, because a missing anchor on any single pattern silently mis-routes a valid response to the wrong schema.
- **Order matters.** `find()` returns the first match, so a literal path (e.g. `/products/categories`) must precede a same-depth param path (`/products/{id}`). The generated table is sorted by ascending param count; this file only verifies that `resolveResponseSchema` respects whatever order it receives.
- **Vacuity canaries are explicit.** The body-schema-name test asserts `> 50` routes have a `bodySchemaName`; the import-scan test asserts the set is neither empty nor equal to all declared operations. These prevent the checks from silently passing over zero data.
- **`process.cwd()` is used** (not `import.meta.url`) for file paths because the jsdom transform breaks file-URL resolution in this suite.

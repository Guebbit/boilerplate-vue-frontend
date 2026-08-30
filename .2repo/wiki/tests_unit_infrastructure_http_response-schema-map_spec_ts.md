# tests/unit/infrastructure/http/response-schema-map.spec.ts

## Purpose

Unit tests for the route → response-schema lookup table (`response-schema-map.ts`). They guard two properties that are invisible in a code review of the table itself: **anchoring** (every pattern is `^…$`-anchored so `[^/]+` cannot bleed into adjacent segments) and **ordering** (longer/more-specific paths listed before shorter ones so `find()` hits the right row). They also verify the table is complete against `openapi.yaml` and that each row resolves to the correct generated schema.

## Key elements

- **`beforeAll` registration** — calls `registerResponseSchemas(collectModuleResponseSchemas(enabledModules))` to wire the real module registry, mirroring `src/main.ts`. Without this, every lookup returns `undefined` and the suite passes vacuously.
- **`schemaByName(name)`** — resolves a generated schema by export name via `asStub(Record<string, unknown>)`. Kept string-only so `it.each` never serialises deep Zod objects into test titles (avoids heap exhaustion).
- **`ID`** — a fixed representative ObjectId used in parameterised paths.
- **`ROUTES`** — the exhaustive `[method, path, schemaName]` table (~110 entries), asserted row-by-row rather than sampled.
- **`SPEC_OPERATIONS`** — derived by parsing `openapi.yaml` at the project root; substitutes `{param}` placeholders with `ID` to produce concrete `METHOD /path` strings for parity checking.
- **`it.each(ROUTES)` — resolution** — asserts `resolveResponseSchema(method, path)` returns the expected schema object.
- **`it.each(ROUTES)` — anchoring** — asserts appending `/deeper` to any path does **not** resolve to the same row (catches missing `$` or `^` anchors).
- **Coverage test** — every operation in `openapi.yaml` must resolve; failures list the unmapped operations by name.
- **Row-count test** — `ROUTES.length === SPEC_OPERATIONS.length`.

## Relationships

- **`tests/support/stub.ts`** — provides `asStub`, a type-narrowing cast used to index `@api/schemas` without triggering runtime Zod evaluation.
- **`src/infrastructure/http/response-schema-map.ts`** — the module under test; exports `registerResponseSchemas`, `resolveResponseSchema`, and the `ResponseSchemaRoute` type.
- **`src/kernel/registry.ts`** — `collectModuleResponseSchemas` aggregates per-module schema tables.
- **`src/modules`** — `enabledModules` array determines which modules contribute rows.
- **`openapi.yaml`** (project root) — read at runtime for the parity assertion.

## Notes

- **Ordering is load-bearing.** `find()` returns the first match, so `/orders/:id/invoice` must precede `/orders/:id`. Alphabetising the array would silently break exactly one endpoint — the anchoring and ordering tests exist because neither defect is visible in a diff of the table.
- **`process.cwd()` over `import.meta.url`.** The jsdom transform turns `import.meta.url` into a non-file URL, so the spec resolves `openapi.yaml` via `process.cwd()` (which vitest pins to the project root).
- **String-only schema references in `ROUTES`.** The table stores schema *names*, not schema objects. Directly embedding Zod schemas would make Vitest's title serialiser walk deep recursive objects and OOM the worker.
- **Anchoring is asserted for every row, not one representative.** A single missing anchor anywhere in the table is a production bug; the `it.each` loop guards all ~110 entries.

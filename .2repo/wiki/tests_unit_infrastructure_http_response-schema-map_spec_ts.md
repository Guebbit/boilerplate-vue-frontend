# tests/unit/infrastructure/http/response-schema-map.spec.ts

## Purpose

Unit tests for the route → response-schema lookup table (`response-schema-map.ts`). They guarantee two silent-failure properties that aren't visible in a code review of the table itself: (1) every regex pattern is anchored at both ends so `[^/]+` can't absorb adjacent segments, and (2) array order matters because `find()` returns the first match (e.g. `/orders/:id/invoice` must precede `/orders/:id`). The suite also cross-checks the table against `openapi.yaml` to catch any operation whose response would go unvalidated.

## Key elements

- **`beforeAll` hook** — calls `registerResponseSchemas(collectModuleResponseSchemas(enabledModules))` to wire the module registry exactly as `src/main.ts` does, so the lookup answers real data rather than returning `undefined` for every route.
- **`schemaByName(name)`** — resolves a generated response schema by its export name via `asStub(schemas)[name]`; keeps the table string-only so Vitest's `it.each` never serialises deep recursive Zod objects into a test title.
- **`ID`** — a fixed representative ObjectId (`65dc8a99604c307b702b5ccc`) substituted into parameterised paths.
- **`ROUTES`** — a `[method, path, schemaName]` triple for every endpoint, in the same order as the source table. Asserted row-by-row (not sampled) because a wrong schema on a rarely-hit endpoint only surfaces when a user hits it.
- **`SPEC_OPERATIONS`** — read from `openapi.yaml` at test time; lists every `METHOD /path` with `{param}` placeholders replaced by `ID`. Serves as the ground truth for coverage checks.
- **`describe('routeSchemas table')`** — three tests:
  - *covers every operation declared in openapi.yaml* — asserts no spec operation is left unmapped (named failure list, not a count).
  - *has one table row per declared operation* — `ROUTES.length === SPEC_OPERATIONS.length`.
  - *`%s %s resolves to %s`* (parameterised over `ROUTES`) — asserts `resolveResponseSchema` returns the expected schema for each route.

## Relationships

- **`tests/support/stub.ts`** — provides `asStub`, a typed identity wrapper used to index the `@api/schemas` module by export name without triggering ESM named-import resolution at test time. Keeps the `ROUTES` table as plain strings.
- **`@/infrastructure/http/response-schema-map`** (the module under test) — exports `registerResponseSchemas`, `resolveResponseSchema`, and the `ResponseSchemaRoute` type.
- **`@/kernel/registry`** — `collectModuleResponseSchemas` aggregates per-module schema tables.
- **`@/modules`** — `enabledModules` supplies the module list used to build the registry.
- **`openapi.yaml`** (project root) — the source-of-truth spec read by `SPEC_OPERATIONS` to validate completeness.

## Notes

- The `ROUTES` array order is **load-bearing**: reordering it (e.g. alphabetising) can change which pattern `find()` hits first for overlapping prefixes like `/orders/:id` vs. `/orders/:id/invoice`.
- `SPEC_OPERATIONS` uses `process.cwd()` rather than `import.meta.url` because the jsdom transform in Vitest turns `import.meta.url` into something other than a file URL.
- The test deliberately does **not** import or compare actual Zod schemas by value; it only checks that the lookup returns the correct *name*. Schema shape validation lives in the separate `http-validate-responses.spec.ts`.
- Adding a new endpoint requires updating both the module's `response-schemas.ts` **and** the `ROUTES` array here, or the row-count and coverage tests will fail.

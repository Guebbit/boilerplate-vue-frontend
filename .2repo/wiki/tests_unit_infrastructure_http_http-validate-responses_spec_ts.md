# tests/unit/infrastructure/http/http-validate-responses.spec.ts

## Purpose

Tests the contract-validation gate (`VITE_VALIDATE_RESPONSES`) on `orvalMutator` by sending real HTTP requests through MSW to a live `http://api.test` server, exercising the full interceptor chain rather than a stubbed axios adapter. Verifies the default-on/off behaviour driven by `MODE`, pass/fail on schema conformance, strict rejection of undeclared fields, and the fail-open path for unmapped routes.

## Key elements

- **`loadHttp()`** — resets modules, stubs `VITE_API_URL`, dynamically imports `@/infrastructure/http`, `response-schema-map`, `@/kernel/registry`, and `@/modules`, then wires enabled modules' response schemas into the module's `responseSchemaMap`. Returns the fresh `httpModule` (exporting `orvalMutator`).
- **`server`** — MSW (`msw/node`) application server; started in `beforeAll`, handlers reset per-test, closed in `afterAll`.
- **`describe('orvalMutator contract validation')`** — seven `it` blocks covering:
  - Validation is off by default under Vitest (`MODE === 'test'`).
  - Validation is on by default when `MODE` is anything other than `'test'` (e.g. `'production'`).
  - Resolves when the response satisfies the OpenAPI schema.
  - Throws a `[contract]` error when a required field is missing.
  - Throws a `[contract]` error when an undeclared field is present (strict / over-serialisation check).
  - Skips validation entirely when `VITE_VALIDATE_RESPONSES=false`.
  - Warns (via `console.warn`) and resolves for a route absent from the schema map — fail-open, no throw.

## Relationships

- **`src/infrastructure/http/index.ts`** (graph neighbour) — the module under test. `loadHttp()` imports it dynamically after `vi.resetModules()` to obtain a clean instance, then extracts `orvalMutator` from it. The test also imports `@/infrastructure/http/response-schema-map` (a sibling of the index) to call `registerResponseSchemas`, and `@/kernel/registry` + `@/modules` to collect and supply the per-module schema definitions that populate the map before the mutator is invoked.

## Notes

- `vi.resetModules()` is **mandatory** here: without it the `responseSchemaMap` retains entries from previous tests, masking the "no schema mapped" fail-open path and making throw-assertions flaky.
- The helper does the same schema-wiring `src/main.ts` performs at boot; skipping it causes `resolveResponseSchema` to return `undefined`, validation to silently no-op, and the two throw-expecting tests to fail.
- `vi.unstubAllEnvs()` runs in `beforeEach` to prevent `VITE_VALIDATE_RESPONSES` / `MODE` stubs from leaking between tests.
- A fresh Pinia store (`setActivePinia(createPinia())`) is created per test because the http module's internals depend on Pinia.
- MSW is configured with `onUnhandledRequest: 'error'` so an accidental unmatched request fails the test instead of passing silently.

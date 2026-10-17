---
source: tests/unit/infrastructure/http/http-validate-responses.spec.ts
sha256: 0f9afdfd677836a600b8ef04622528d1545327d8045303ba2fb7fc9e4285f3b9
generated_at: 2026-10-17T02:35:49.700513+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/http-validate-responses.spec.ts

## Purpose

Exercises the `VITE_VALIDATE_RESPONSES` contract-validation layer of `orvalMutator` against a real MSW-backed HTTP server (not a stubbed axios adapter) so the full interceptor chain the mutator runs through is actually hit. It pins down the on/off default, strict-schema rejection, PROD report-only mode, Faro diagnostic reporting, and the lazy-schema-loading edge cases.

## Key elements

- **`loadHttp()`** — Resets all Vitest modules, stubs `VITE_API_URL`, dynamically imports `@/infrastructure/http`, `response-schema-map`, `@/kernel/registry`, and `@/modules`, then calls `loadResponseSchemas(collectModuleResponseSchemas(enabledModules))` before returning the fresh `httpModule`. Every test must `await` this before firing a request, because schema rows load lazily.
- **`server`** — An MSW `setupServer` instance (Node mode) that intercepts real HTTP calls to `http://api.test`. Configured with `onUnhandledRequest: 'error'` to catch typos in route paths.
- **`describe('orvalMutator contract validation')`** — The single test block containing ten cases covering:
  - Default off in Vitest (`MODE='test'`), default on in production.
  - Happy-path resolve when the response satisfies the schema.
  - Rejection with a generic `{ success: false, status: 0, errors: [{ code: 'CONTRACT_MISMATCH' }] }` envelope for missing or undeclared fields.
  - Full `[contract] … does not match the OpenAPI schema` diagnostic sent to `useObservabilityStore().captureException` (Faro), separate from the call-site envelope.
  - Explicit opt-out via `VITE_VALIDATE_RESPONSES=false`.
  - PROD report-only mode (`PROD=true`): undeclared fields are stripped and the response resolves; missing fields still report to Faro but do not reject.
  - Fail-open (`console.warn`) for a route with no schema row.
  - Silent pass-through for a *mapped* route while its lazy schema chunk has not yet resolved (regression from `resilience.cy.ts`).

## Relationships

No graph neighbors are recorded for this file. It imports from `@/infrastructure/http`, `@/infrastructure/http/response-schema-map`, `@/kernel/registry`, `@/modules`, and `@/infrastructure/observability/store`, but the dependency graph lists no neighbor files.

## Notes

- **`loadHttp()` is load-bearing.** Without calling `loadResponseSchemas(…)`, `resolveResponseSchema` returns `undefined` for every route, validation silently no-ops, and the two "must throw" tests fail. The helper exists specifically to prevent that silent no-op.
- **MSW, not axios stubbing.** A stubbed axios adapter would bypass the interceptor chain; MSW intercepts at the network layer, which is what the mutator actually traverses.
- **`vi.resetModules()` per test.** Each `loadHttp()` call yields a brand-new `responseSchemaMap`. Tests never share schema state.
- **Pinia is re-created in `beforeEach`.** The observability store (Faro) is a Pinia store; a fresh instance prevents `captureException` spies from leaking between tests.
- **`vi.stubEnv` / `vi.unstubAllEnvs`.** Environment flags (`MODE`, `VITE_VALIDATE_RESPONSES`, `PROD`) are stubbed per-test and cleaned up in `beforeEach`.
- **The file was truncated at the last test** ("stays quiet for a mapped route while the lazy schema chunk is still loading"). The test body is cut off after the `warnSpy` setup; the full assertion is not visible.

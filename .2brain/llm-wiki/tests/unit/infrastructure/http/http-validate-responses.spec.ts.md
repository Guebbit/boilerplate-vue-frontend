---
source: tests/unit/infrastructure/http/http-validate-responses.spec.ts
sha256: 993322818eda23ea7ec69f62e2c4568c72bfa11a3a4b3b2781841aded2f78990
signature: d486b3982b457c4f83951c1c622c0c3aba8893405888afd60282c7aea2e6644b
generated_at: 2026-11-10T07:58:00.769470+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/http-validate-responses.spec.ts

## Purpose

Tests the `orvalMutator` contract-validation layer (gated by `VITE_VALIDATE_RESPONSES`) against a real MSW-intercepted HTTP server, exercising the full interceptor chain that a stubbed axios adapter would bypass. Covers default-on/off behavior by MODE, RFC 9457 problem handling, schema pass/fail, 204/202 short-circuits, blob/text exemptions, error-envelope shape, Faro diagnostic reporting, and the PROD report-only mode.

## Key elements

- **`loadHttp()`** — Resets all modules, stubs `VITE_API_URL`, dynamically imports `@/infrastructure/http`, `response-schema-map`, `@/kernel/registry`, and `@/modules`, then awaits `loadResponseSchemas(collectModuleResponseSchemas(enabledModules))` before returning the `httpModule`. Without this wiring, `resolveResponseSchema` returns `undefined` and validation silently no-ops.
- **`API`** — Constant `'http://api.test'`, the origin all MSW handlers match against.
- **`beforeEach`** — Activates a fresh Pinia instance so the observability store is isolated per test.
- **`describe('orvalMutator contract validation')`** — Contains ~13 `it` blocks covering:
  - Default OFF in Vitest (`MODE === 'test'`), even in DEV.
  - Default ON outside Vitest (production build), letting stores trust the body.
  - `Accept: application/problem+json` header is sent; 4xx problem bodies reach the caller as parsed objects.
  - Text-mode (`responseType: 'text'`) responses are still recognized as problem+json.
  - 204 and bodiless 202 resolve to `undefined` without triggering a schema check.
  - Blob downloads skip validation entirely.
  - Valid schema → resolves; missing required field → rejects with generic `{ code: 'CONTRACT_MISMATCH' }` envelope (status 0).
  - Undeclared (extra) field → same generic envelope (strict schema).
  - Full field-level diagnostic is reported to Faro via `useObservabilityStore().captureException`, separate from the caller-facing envelope.
  - `VITE_VALIDATE_RESPONSES=false` → never validates.
  - PROD report-only mode (`VITE_CONTRACT_THROW` unset) → strips offending fields and resolves instead of rejecting.

## Relationships

- **`tests/support/unit/msw-server.ts`** — Provides the `server` instance; every test registers one-off `http` handlers on it to simulate API responses.
- **`tests/support/unit/account-view.ts`** — Imported as `accountView`, a factory that builds a schema-conformant account object for the positive "satisfies its schema" test.

## Notes

- **`loadHttp` is not optional.** Each test must call it (and await the promise) before firing a request. The dynamic-import + `vi.resetModules()` pattern is what mirrors `src/main.ts` boot wiring; skipping it makes `resolveResponseSchema` return `undefined`, causing validation to silently no-op and the two "assert a throw" tests to fail.
- **MODE determines default, not DEV.** The first test proves that `import.meta.env.DEV === true` in Vitest does *not* enable validation; only MODE ≠ `'test'` does.
- **Error envelope is intentionally generic.** Call sites never see the raw `[contract] … does not match the OpenAPI schema` string; that diagnostic goes only to Faro. The envelope always carries `type: 'about:blank'`, `status: 0`, and `errors: [{ code: 'CONTRACT_MISMATCH' }]`.
- **PROD report-only mode** is activated by setting `PROD=true` and clearing `VITE_CONTRACT_THROW`; in that mode a strict-schema violation strips the offending fields and resolves rather than rejecting.

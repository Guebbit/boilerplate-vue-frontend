---
source: tests/unit/infrastructure/http/http-validate-requests.spec.ts
sha256: 70a000e33eebff5a9a42527a1c9e2ec7a559aa52f41935ea0a06f220ac616b3f
generated_at: 2026-10-17T02:35:36.584539+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/http-validate-requests.spec.ts

## Purpose

Unit tests for `orvalMutator`'s request-validation layer (gated by `VITE_VALIDATE_REQUESTS`). Unlike the response-validation spec, these run against a live MSW (Mock Service Worker) HTTP server so the full mutator → network path executes. The suite proves two invariants: a body that violates the operation's JSON schema is **rejected before anything is sent**, and a conforming body is **forwarded byte-for-byte** (the layer validates but never rewrites).

## Key elements

- **`loadHttp()`** – Resets Vitest modules, stubs `VITE_API_URL`, then dynamically imports `@/infrastructure/http`, the response-schema map, the kernel registry, and `@/modules`. Populates the schema map via `loadResponseSchemas(collectModuleResponseSchemas(enabledModules))` (mirrors `src/main.ts` boot) before returning the HTTP module.
- **`patchAccount(data)`** – Thin wrapper that calls `orvalMutator({ url: '/account', method: 'PATCH', data })`; the `PATCH /account` operation has a body schema (`UpdateAccountBody`) that rejects `phone: ''`.
- **`server`** – MSW `setupServer()` instance; intercepts all outbound requests in Node. Configured with `onUnhandledRequest: 'error'` so any un-stubbed URL fails the test.
- **`received`** – Module-level `unknown` set by the MSW handler; lets each test assert exactly what the "server" saw.
- **`describe('orvalMutator request validation')`** – Nine test cases covering:
  - Validation is **off by default** in Vitest (partial body passes).
  - **Rejection** names the offending field and happens before the request leaves.
  - **No request is sent** on rejection (`received` stays `undefined`).
  - A **conforming body** (`phone: null`) arrives unchanged.
  - `null` for a field that refuses it is **rejected, not repaired**.
  - Explicit `VITE_VALIDATE_REQUESTS=false` skips validation.
  - **PROD report-only mode**: still sends the body *and* calls `captureException` on the observability store (Faro).
  - **Multipart / `FormData`** bodies skip JSON-schema validation entirely.
  - A route **absent from the schema table** fails open (request proceeds).
  - A **bodyless** call (e.g. `GET`) is never checked.

## Relationships

No graph neighbors are tracked for this file. It imports `@/infrastructure/http`, `@/infrastructure/observability/store`, `@/kernel/registry`, and `@/modules`, but none appear in the recorded dependency graph.

## Notes

- `loadHttp()` calls `vi.resetModules()` every invocation; without it, a stale module cache would skip schema registration and every test would pass for the wrong reason.
- The MSW handler for `PATCH /account` is re-registered in `beforeEach` with `server.use(...)`, so each test gets a clean handler and `received` is reset to `undefined`.
- The PROD test spies on `useObservabilityStore().captureException`; a fresh Pinia instance is created in `beforeEach` to keep store state isolated.
- The file deliberately tests *behavior* (what the server receives, whether a throw occurs) rather than asserting on internal validator calls, keeping it decoupled from implementation details.

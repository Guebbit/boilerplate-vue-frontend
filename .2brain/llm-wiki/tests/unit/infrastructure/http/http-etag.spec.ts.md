---
source: tests/unit/infrastructure/http/http-etag.spec.ts
sha256: fa903b3ccb8250d7b1d43baf4802b8997aa229e4c654ce75112e36029020876f
generated_at: 2026-10-17T02:34:58.622276+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/http-etag.spec.ts

## Purpose

End-to-end test of the ETag-based conditional-write mechanism (optimistic concurrency) through the **real** interceptor chain on a live MSW node interceptor. It verifies that a read's `ETag` is replayed as `If-Match` on the next write, that a write's response tag replaces the stored one, that an action answering no tag clears it, and that a stale write surfaces as the API's 412 to the caller.

## Key elements

- **`server`** (MSW `setupServer`) — three handlers simulating the backend:
  - `GET /products/p1/admin` — returns current `ETag`.
  - `PATCH /products/p1` — validates `If-Match` against `serverVersion`; on mismatch returns 412, on match bumps the version and returns a new `ETag`. Records every `If-Match` value into `patchIfMatch`.
  - `POST /products/p1/restore` — bumps the version but answers **no** `ETag` header.
- **`loadHttp()`** — resets modules, stubs `VITE_API_URL`, and dynamically imports `@/infrastructure/http` so each test case gets a fresh axios instance with its interceptors (and tag memory) starting empty.
- **`patchIfMatch`** — ordered log of every `If-Match` header the PATCH handler received; the primary assertion target.
- **`tag(version)`** — formats a numeric version as the quoted ETag string the API uses (e.g. `"100"`).
- **`describe('conditional writes over the wire')`** — five cases: tag replay, tag chaining across two edits, unconditional write when never read, 412 on stale version, and tag-forgetting after a tag-less action.

## Relationships

- **`tests/cross-cutting/badge-name.spec.ts`** — listed as a graph neighbor; no direct import or shared symbol is visible in this file. The connection is likely indirect through shared test infrastructure (MSW setup patterns, Pinia resets) or a shared test-harness concern rather than a code-level dependency.

## Notes

- The file deliberately uses MSW's **node interceptor** (not a stubbed adapter) because what matters is what actually **arrived at the server** and the interceptors' registration order on the shared axios instance—neither is observable from a mock adapter.
- `loadHttp()` uses `vi.resetModules()` + dynamic `import()` because the http module builds its instance, registers interceptors, and initializes tag memory **at import time**; a simple static import would leak state between cases.
- `server.listen({ onUnhandledRequest: 'error' })` ensures any test that accidentally hits an unmocked endpoint fails immediately rather than leaking to the network.
- The doc-header comment positions this file as the "over-the-wire" complement to `etag.spec.ts` (interceptors in isolation) and follows the same rationale as `http-refresh.spec.ts`.

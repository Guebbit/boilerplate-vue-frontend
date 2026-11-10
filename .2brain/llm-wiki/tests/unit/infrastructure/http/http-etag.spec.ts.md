---
source: tests/unit/infrastructure/http/http-etag.spec.ts
sha256: dc25a35c67a441c5d94a6ac0ad8a9b52b0d5033ea8232e2b0e24c23650e33226
signature: 5f1981cbd3f1d170b715408c09e38aaa9b58e5973152072540810c527af104ab
generated_at: 2026-11-10T07:56:58.392466+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/http-etag.spec.ts

## Purpose

Integration-level test for the ETag/If-Match conditional-write flow through the **real** MSW node interceptor chain. It verifies the full round-trip: a `GET` response's `ETag` header is re-sent as `If-Match` on the next `PATCH`, a `PATCH` response's new `ETag` chains into the following write, an action that returns no tag clears the stored tag, and a server-side `412 Precondition Failed` surfaces to the caller as the API's problem shape. It uses a live MSW server (rather than a stubbed adapter) because interceptor registration order and the exact headers that arrive at the server are only observable this way.

## Key elements

- **`handlers`** – Array of three MSW handlers (`GET /products/p1`, `PATCH /products/p1`, `POST /products/p1/restore`) mounted on the shared server before each test. The PATCH handler records every `If-Match` it receives into `patchIfMatch` and returns `412` when the tag is stale.
- **`loadHttp()`** – Calls `vi.resetModules()`, stubs `VITE_API_URL`, and dynamically imports `@/infrastructure/http` so each test gets a fresh axios instance, interceptor chain, and (empty) tag memory.
- **`tag(version)`** – Formats a numeric version as the quoted ETag string the API uses (e.g. `"100"`).
- **`serverVersion` / `patchIfMatch`** – Module-level mutable state reset in `beforeEach`; the handler mutates them, tests assert against them.
- **Five `it` blocks** inside `describe('conditional writes over the wire')` covering: read-then-write tag propagation, chained writes, write-without-prior-read, stale-tag 412, and tag-forget-after-action.

## Relationships

- **`tests/support/unit/msw-server.ts`** – Supplies the shared MSW `server` instance imported at the top of this file. The file registers its per-test `handlers` array on that instance (via the `use` method) and relies on its request interception to make the "real wire" observable.
- **`tests/support/unit/fixtures.ts`** – Provides `aProblem(412, …)` used both to build the `412` response body inside the PATCH handler and to shape the expected error assertion in the caller.

## Notes

- The file explicitly positions itself alongside `etag.spec.ts` (interceptor-unit level) and `http-refresh.spec.ts` (same "real server" rationale). If you change the interceptor chain or its registration order, both this file and those need updating.
- `loadHttp()` is mandatory per test: the axios instance and its interceptors (including the tag-memory map) are created at **import time**, so reusing a cached module would leak state between cases.
- The PATCH handler treats a *missing* `If-Match` header as "write unconditionally" (no 412), matching the server contract; the "forgets the tag" test relies on this.
- `VITE_API_URL` is stubbed to `http://api.test` to match the handler base URL; if you change `API`, both the env stub and the handler paths must stay in sync.

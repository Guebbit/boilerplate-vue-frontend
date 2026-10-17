---
source: tests/unit/infrastructure/http/etag.spec.ts
sha256: 38a2c8c53c1ed7300137eacbf2b5a601ac8db4c56f8077f077fdaaef3ab8a22e
generated_at: 2026-10-17T02:34:44.285445+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/etag.spec.ts

## Purpose

Unit test suite for the `@/infrastructure/http/etag` module. Verifies the client-side conditional-write protocol: that ETags returned by reads/writes are remembered per resource path, re-sent as `If-Match` on subsequent mutating requests, invalidated when a tag-less action mutates the resource, and fully cleared on demand.

## Key elements

- **`answered(method, url, etag?)`** — local helper that builds a stub `AxiosResponse` (via `asStub`) shaped like what axios hands to a success interceptor.
- **`outgoing(method, url, headers?)`** — local helper that builds a stub `InternalAxiosRequestConfig` with a real `AxiosHeaders` instance so `.get`/`.set` behave as in production.
- **`ifMatchOf(config)`** — convenience accessor that reads the `If-Match` header from a request config.
- **`describe('onEtagResponse')`** — 9 tests covering: tag storage keyed by path (query stripped), tag replacement on PUT/PATCH, `/admin` and `/hard` suffixes mapping to the same resource, pass-through of the response object, ignoring tag-less reads, invalidation on tag-less POST actions, prefix-collision safety (`o1` vs `o10`), invalidation on DELETE, and refusal to adopt a tag from an action response.
- **`describe('onEtagRequest')`** — 6 tests covering: `If-Match` injection for PUT/PATCH/DELETE (case-insensitive), absence on GET/POST, absence for never-read resources, preservation of a caller-supplied `If-Match`, absolute-URL matching by path, and tag forwarding for `/hard`-suffixed DELETE.
- **`describe('clearEtags')`** — single test confirming all stored tags are dropped.
- **`beforeEach(clearEtags)`** — resets module-level ETag state before every test.

## Relationships

- **`tests/support/stub.ts`** — imports `asStub` to create lightweight object stubs for `AxiosResponse` and `InternalAxiosRequestConfig`, avoiding the need to construct full axios instances in tests.
- **`@/infrastructure/http/etag.ts`** — the module under test; imports `clearEtags`, `knownEtag`, `onEtagRequest`, `onEtagResponse`.
- **`axios`** — imports `AxiosHeaders` (for realistic header objects in `outgoing()`) and the type definitions for response/request shapes.
- **`vitest`** — provides the test runner primitives (`describe`, `it`, `expect`, `beforeEach`).

## Notes

- Resource-path normalization is implicit in the implementation under test: query strings are stripped, and trailing `/admin` / `/hard` segments are treated as aliases for the base resource. Tests document this contract but the logic lives in `etag.ts`.
- The `it.each` for mutating methods includes both lowercase and uppercase `PATCH`, pinning case-insensitive method matching.
- The "prefix collision" test (`/orders/o10` vs `/orders/o1/cancel`) guards against naïve `startsWith` matching in the tag store.
- `asStub` is used rather than full axios instances; `AxiosHeaders` is the one piece that must be real so `.get('If-Match')` returns `undefined` (not `null` or throws) when the header is absent.

---
source: tests/unit/infrastructure/http/etag.spec.ts
sha256: d03c6984dec320a7f9cb73a4d77d902f6907e543cd24076a5780be92547f7635
signature: 17871bcafcf2e37030a35c35bd0e858b3178b12ab0e81a18758d8714e6fe502c
generated_at: 2026-11-10T07:56:31.754584+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/etag.spec.ts

## Purpose

Unit-test suite for the ETag tracking module (`@/infrastructure/http/etag.ts`). Verifies the full conditional-write lifecycle: capturing an `ETag` from a response, replaying it as `If-Match` on subsequent write requests, evicting stale tags, and the boundary conditions (which methods participate, which URLs map to the same resource, caller override, and global reset).

## Key elements

- **`answered(method, url, etag?)`** – local helper; builds a minimal `AxiosResponse` stub via `asStub` so interceptor logic can be exercised without a live HTTP call.
- **`outgoing(method, url, headers?)`** – local helper; builds an `InternalAxiosRequestConfig` stub with a real `AxiosHeaders` instance so header access behaves exactly as in production.
- **`ifMatchOf(config)`** – convenience reader: extracts the `If-Match` header from a request config.
- **`describe('onEtagResponse')`** – covers tag capture on reads, tag replacement on writes, `/hard`-suffix aliasing, ignoring tag-less responses, eviction on action/delete responses, path-prefix disambiguation (`/o1` vs `/o10`), and the "observe-only" contract (returns the response unchanged).
- **`describe('onEtagRequest')`** – covers `If-Match` injection on PUT/PATCH/DELETE (case-insensitive verb matching), absence on GET/POST, absence when no tag is known, preservation of a caller-supplied `If-Match`, absolute-URL path matching, and the `/hard`-suffix write case.
- **`describe('clearEtags')`** – confirms the store is fully emptied so no tag leaks across users/sessions.
- **`beforeEach(clearEtags)`** – resets module-level state before every test.

## Relationships

- **`tests/support/stub.ts`** — supplies `asStub`, which wraps a plain object in a read-only stub. Used here to construct the `AxiosResponse` and `InternalAxiosRequestConfig` fixtures without instantiating full axios classes, keeping the test setup lightweight while remaining structurally compatible with the interceptor code under test.

## Notes

- The module under test is **stateful** (an in-memory map keyed by resource path). The `beforeEach(clearEtags)` line is essential; omitting it causes cross-test leakage.
- `/products/p1/hard` is intentionally treated as the **same resource** as `/products/p1` for both read and write sides. This is a domain convention, not a URL-normalisation accident.
- Tags are only **recorded** from read-style responses (GET, PATCH) and only **sent** on write-style requests (PUT, PATCH, DELETE). POST responses are never consulted for a tag, even if they carry an `ETag` header.
- A caller-provided `If-Match` always **wins** over the module's stored tag; the module never overrides an explicit header.
- URL matching is by **path only**: query strings are stripped on the response side, and absolute URLs are reduced to their path on the request side.

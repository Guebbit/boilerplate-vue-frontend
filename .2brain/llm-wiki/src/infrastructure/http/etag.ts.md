---
source: src/infrastructure/http/etag.ts
sha256: 3ae46484f0969a55e78ca2562fc75c308cc3cc0f1c76d85bacf4c384a9926cbd
generated_at: 2026-10-02T11:55:42.836073+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/etag.ts

## Purpose
Client-side ETag bookkeeping for conditional writes. It remembers the `ETag` each resource last answered with and re-sends it as `If-Match` on subsequent PUT/PATCH/DELETE requests so the server can reject stale edits (412). Wired transparently onto the shared axios instance by `index.ts`, so edit forms get it without explicit code.

## Key elements
- **`tags`** (module-level `Map<string, string>`) — stores the last-seen ETag keyed by resource pathname. Deliberately not a Pinia store; it is transport state that must survive route changes.
- **`VIEW_SUFFIX`** (`/\/(?:admin|hard)$/`) — regex that strips view-specific path segments so alternate views of the same row share one tag.
- **`TAGGING_METHODS`** — `get`, `put`, `patch`; methods whose responses carry a new ETag.
- **`CONDITIONAL_METHODS`** — `put`, `patch`, `delete`; methods that accept an `If-Match` header.
- **`resourceKey(url)`** — normalises a request URL to a bare pathname (via `toPathname` + suffix strip) for use as the map key.
- **`knownEtag(url)`** *(exported)* — returns the held tag for a resource, or `undefined` if it was never observed here.
- **`clearEtags()`** *(exported)* — wipes all held tags; intended for sign-out and test setup.
- **`onEtagRequest(config)`** *(exported)* — request interceptor: sets `If-Match` from the held tag when the method is conditional and no caller-supplied `If-Match` is already present.
- **`isUnder(path, key)`** — true if `path` equals `key` or is a child segment beneath it.
- **`onEtagResponse(response)`** *(exported)* — response interceptor: for non-GET successes, first invalidates every held tag under the response path (a side-effect action may have mutated the row without returning a new tag), then, if the method is in `TAGGING_METHODS` and the response carries an `ETag` header, stores that new tag.

## Relationships
- **`src/infrastructure/http/index.ts`** — registers `onEtagRequest` and `onEtagResponse` as interceptors on the shared axios instance; this file is a pure leaf it depends on.
- **`src/infrastructure/http/url.ts`** — provides `toPathname`, the only app-internal import; used to reduce absolute/relative URLs to a comparable pathname key.

## Notes
- A caller that sets its own `If-Match` header wins: `onEtagRequest` skips attachment when the header is already present.
- For non-GET responses the interceptor **invalidates before it stores**. This means a successful `PUT` that *also* returns a new `ETag` will first clear sibling tags under the same path, then set its own. A `POST` side-effect (e.g. `/orders/1/cancel`) under a parent path will clear that parent's tag without setting a replacement, forcing the next edit to go out unconditionally.
- `delete` is a conditional method (sends `If-Match`) but **not** a tagging method — a 204/200 delete response will not refresh the tag, but the invalidation loop still fires, dropping the tag that was just consumed.
- The tag map is process-wide singleton state; `clearEtags()` is the only way to reset it.

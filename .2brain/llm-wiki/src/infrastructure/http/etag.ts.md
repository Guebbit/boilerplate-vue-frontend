---
source: src/infrastructure/http/etag.ts
sha256: 3e7342f540e3c3839b094b550c493103e71fe56abf5c526f68273dc11923f1b5
signature: c7aa218924a45b4b1eeb4bfe034488a8adc02eec8e44d201992b0fb5880034a9
generated_at: 2026-11-10T03:03:23.348202+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/etag.ts

## Purpose

Client-side ETag bookkeeping for conditional writes. It remembers the `ETag` returned by reads and patches, then replays it as `If-Match` on subsequent PUT/PATCH/DELETE of the same resource so the server can reject stale edits with 412. Wired onto the shared axios instance so every edit form gets the behavior without explicit wiring.

## Key elements

- **`tags`** (module-level `Map<string, string>`) — holds the last-seen ETag per resource path. Intentionally not a Pinia store: it is transport state that must survive route changes.
- **`VIEW_SUFFIX`** — regex (`/\/hard$/`) stripped by `resourceKey` so `/users/{id}/hard` shares the tag of `/users/{id}`.
- **`TAGGING_METHODS`** — `get` and `patch`; only their responses store a tag (PUT answers none per RFC 9110 §9.3.4).
- **`CONDITIONAL_METHODS`** — `put`, `patch`, `delete`; the methods that receive `If-Match`.
- **`resourceKey(url)`** — normalizes a request URL to a stable path key via `toPathname` + suffix strip.
- **`knownEtag(url)`** (exported) — returns the tag currently held for a resource, or `undefined`.
- **`clearEtags()`** (exported) — wipes all held tags; called on sign-out and in specs.
- **`onEtagRequest(config)`** (exported) — axios request interceptor; sets `If-Match` on conditional methods when a tag exists and the caller hasn't already set one.
- **`isUnder(path, key)`** — true when `path` equals `key` or is a child path.
- **`onEtagResponse(response)`** (exported) — axios response interceptor; stores a new tag on `get`/`patch` success, and deletes any held tag for a path that is the same as or above a successful non-GET response (e.g. `POST /orders/1/cancel` invalidates `/orders/1`).

## Relationships

- **`src/infrastructure/http/index.ts`** — registers `onEtagRequest` and `onEtagResponse` on the shared axios instance, making ETag behavior transparent to all consumers.
- **`src/infrastructure/http/url.ts`** — provides `toPathname`, used by `resourceKey` and the response interceptor to normalize URLs into path keys.

## Notes

- The interceptors are purely observational: they never unwrap or transform the response body.
- A successful non-GET action (e.g. `POST /orders/1/cancel`, a restore) does not return an ETag but *does* mutate the row, so all tags under that path are dropped; the next edit goes out unconditionally rather than with a stale tag guaranteed to 412.
- If a caller sets `If-Match` explicitly, the interceptor leaves it alone.
- `PUT` responses are never used to update the tag (RFC 9110 §9.3.4), so after a PUT the resource has no known tag and the next conditional write will omit `If-Match`.

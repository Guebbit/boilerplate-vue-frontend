---
source: src/infrastructure/utils/use-link-token.ts
sha256: 84c8899c9e54eb5d8c00a7a6c3c96dcefaabf1d809b67cd9dba4e52e1784b0d0
signature: 172a93a468a0544aabb63155957b4d51f350f0763119b2620e2c416a6d105f2f
generated_at: 2026-11-10T03:14:53.904258+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/use-link-token.ts

## Purpose

Provides utilities for handling a one-time token delivered in the URL **fragment** (`#token=…`) of a mailed link. Because fragments are never transmitted to servers (RFC 3986 §3.5), the token avoids access logs, proxies, and `Referer` headers; the remaining exposure (browser history, telemetry) is eliminated by the cleanup hook.

## Key elements

- **`readLinkToken(route)`** — Synchronously extracts the `token` value from the route's `hash` via `URLSearchParams` (which also performs the percent-decoding the backend expects). Returns `''` when no token is present. Must be called *before* cleanup.
- **`isAnchorHash(hash)`** — Returns a boolean: positive when the hash is a plain in-page anchor (e.g. `#section`) rather than a key/value fragment. Relies on the fact that `=` is invalid in an id selector, so its presence identifies a credential fragment.
- **`useLinkTokenCleanup(route, router)`** — On mount, calls `router.replace({ path: route.path, hash: '' })` to strip the fragment without adding a history entry, so the Back button never lands on a spent-credential URL.

## Relationships

No graph neighbors are recorded for this file. It imports only from `vue` (`onMounted`) and `vue-router` (types `Router`, `RouteLocationNormalizedLoaded`).

## Notes

- **Ordering constraint:** `readLinkToken` must run before `useLinkTokenCleanup`; the cleanup clears the URL, not any in-memory copy the caller already holds.
- **`path` vs `name`:** Cleanup uses `path` (not `name`) so locale prefixes and dynamic segments survive the replace untouched.
- **`router.replace`, not `push`:** Guarantees no extra history entry is created.
- **Floating-promise suppression:** `router.replace` is fire-and-forget here; a failed navigation surfaces through the global router error handler rather than an awaited promise.
- **Percent-encoding:** `URLSearchParams` un-encodes the token value, reversing whatever `encodeURIComponent` the backend applied when generating the link.

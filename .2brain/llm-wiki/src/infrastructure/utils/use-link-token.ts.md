---
source: src/infrastructure/utils/use-link-token.ts
sha256: 77c864ac0c32e179a16efe97a9a5a7734af782b28a9743c7186c623d6eb67c77
generated_at: 2026-10-17T00:13:21.990966+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/use-link-token.ts

## Purpose

Handles the one-time authentication token that travels in a mailed link's URL **fragment** (`#token=…`). Because fragments are never transmitted to a server (RFC 3986 §3.5), this avoids leaking the token into access logs, proxy logs, or `Referer` headers. The module provides a read helper, an anchor-vs-credential discriminator, and a post-mount cleanup that erases the fragment from the URL so it doesn't linger in tab history or telemetry.

## Key elements

- **`readLinkToken(route)`** – Synchronously extracts the `token` value from `route.hash` (parsed via `URLSearchParams` for percent-decoding). Returns `''` when absent. Must be called *before* `useLinkTokenCleanup` strips the hash.
- **`isAnchorHash(hash)`** – Returns `true` when the hash is a plain in-page anchor (e.g. `#section`) rather than a key/value fragment. The discriminator is the presence of `=`, which is invalid in CSS id selectors.
- **`useLinkTokenCleanup(route, router)`** – On mount, calls `router.replace({ path: route.path, hash: '' })` to clear the fragment without adding a history entry. Uses `path` (not `name`) so locale prefixes and dynamic route segments are preserved.

## Relationships

No graph neighbors are recorded for this file. It is a standalone utility consumed by route components that handle mailed-link redemption.

## Notes

- **Ordering matters:** `readLinkToken` must run *before* `useLinkTokenCleanup`; the latter destroys the hash the former reads. Both operate on the same `route` object but at different lifecycle points (read = before mount, cleanup = in `onMounted`).
- **`router.replace`, not `router.push`:** avoids leaving a spent token in browser history, so a "Back" click never re-lands on a URL containing a consumed credential.
- **Fragment ≠ query param:** this is an intentional security choice. A query param (`?token=…`) would appear in server access logs and `Referer` headers; a fragment does not. The trade-off is that the token is still visible in the browser's own history and any client-side telemetry until `useLinkTokenCleanup` fires.
- **`isAnchorHash` guard:** prevents a token fragment (`#token=abc`) from being treated as a scrollable anchor, which would throw a `querySelector` syntax error.

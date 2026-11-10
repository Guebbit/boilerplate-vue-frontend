---
source: tests/unit/infrastructure/utils/use-link-token.spec.ts
sha256: 7798bae49deaf400252b8405236f2ea308d5ab62e92298107eddad63236dc55c
signature: 413f4e6a2e91aa5acdbf295179f53c1bac485e5a3defb77e2648c20d2f0ef209
generated_at: 2026-11-10T08:08:32.985113+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/use-link-token.spec.ts

## Purpose
Unit tests for the `use-link-token` utility module, covering three concerns: extracting a one-time token from a URL fragment, distinguishing that fragment from a genuine in-page anchor, and the cleanup composable that strips the token from the URL on mount without adding a history entry.

## Key elements
- **`readLinkToken` (tested)** — extracts the value after `#token=`, percent-decodes it, and returns `''` when the fragment is missing or not a key/value pair.
- **`isAnchorHash` (tested)** — returns `true` for in-page anchors (e.g. `#details`), `false` for key/value fragments (`#token=…`) or an empty hash.
- **`useLinkTokenCleanup` (tested)** — a composable that, on mount, calls `router.replace` with the same path and an empty `hash`, effectively removing the token from the visible URL in a single history entry.
- **`noRender`** — a no-op render function so that `defineComponent` + `mount` can execute the composable's `setup` without rendering a DOM tree.
- **`routeWith`** — helper that builds a minimal `RouteLocationNormalizedLoaded` stub via `asStub` for the given hash string.

## Relationships
- **`tests/support/stub.ts`** — provides `asStub<T>()`, a typed cast used to pass partial objects (`{ path, hash }` for routes, `{ replace }` for the router) where full Vue Router types are expected, avoiding the need to construct a real router or complete route instance.

## Notes
- The `useLinkTokenCleanup` test asserts the composable does **not** call `replace` before mounting and **does** call it exactly once after `mount`, confirming the "once on mount" contract.
- The test for `readLinkToken` verifies percent-decoding (`%2F` → `/`, `%26` → `&`, `%3D` → `=`), so any backend that URL-encodes token characters is covered.
- `isAnchorHash` is the guard that lets callers tell a real anchor (`#details`) apart from the token fragment (`#token=…`); the token fragment must never be treated as a scroll target.

---
source: tests/unit/infrastructure/utils/use-link-token.spec.ts
sha256: 7798bae49deaf400252b8405236f2ea308d5ab62e92298107eddad63236dc55c
generated_at: 2026-10-17T02:40:23.993466+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/use-link-token.spec.ts

## Purpose
Unit tests for the one-time-link-token utilities (`readLinkToken`, `isAnchorHash`, `useLinkTokenCleanup`). They verify that a token embedded in a URL fragment is correctly parsed, that key/value fragments are distinguished from in-page anchors, and that the Vue composable strips the token from the URL via `router.replace` (no new history entry) exactly once after mount.

## Key elements
- **`routeWith(hash)`** – local helper that builds a minimal `RouteLocationNormalizedLoaded` stub (fixed path `/en/password-reset/confirm`, variable `hash`) via `asStub`.
- **`noRender`** – a render function returning `null`; used as the render of a probe component so only `setup` executes.
- **`describe('readLinkToken')`** – asserts token extraction from `#token=…`, percent-decoding (`%2F`→`/`, `%26`→`&`, `%3D`→`=`), and the empty-string fallback for missing/irrelevant fragments.
- **`describe('isAnchorHash')`** – asserts `true` for a bare anchor (`#details`) and `false` for `#token=…` or an empty hash.
- **`describe('useLinkTokenCleanup')`** – mounts a `defineComponent` probe that calls the composable in `setup`, then asserts `router.replace` is invoked exactly once with `{ path, hash: '' }` after mount (not before).

## Relationships
- **`tests/support/stub.ts`** – provides `asStub`, the generic helper used to cast a plain object into a typed stub for `RouteLocationNormalizedLoaded` and `Router`. No other methods on those types are exercised, so the stubs carry only the fields the code under test reads (`path`, `hash`, `replace`).
- **`@/infrastructure/utils/use-link-token.ts`** – the module under test; imports `isAnchorHash`, `readLinkToken`, and `useLinkTokenCleanup`.

## Notes
- The composable test relies on `@vue/test-utils` `mount` (not a bare function call) because `useLinkTokenCleanup` is expected to act inside a Vue lifecycle hook (the "once mounted" wording in the assertion). The probe's empty render is intentional—only `setup` needs to run.
- The expected `replace` argument uses `hash: ''` (explicit empty string), not an omitted key. If the implementation changes to `{ path }` without a `hash` property, the test will fail.
- Token values are expected to be URL-decoded (`decodeURIComponent`-equivalent); the backend is assumed to percent-encode before embedding in the fragment.

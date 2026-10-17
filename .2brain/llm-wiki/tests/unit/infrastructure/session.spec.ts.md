---
source: tests/unit/infrastructure/session.spec.ts
sha256: 95e9a45554e144b834615af498e5cf9b4f1db733ad973bdbec58bbddbc39f60f
generated_at: 2026-10-17T02:38:46.265625+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/session.spec.ts

## Purpose
Unit tests for `src/infrastructure/session.ts`, covering three behaviors: `persistLocalePreference` (fire-and-forget locale write that must never reject), the `isAuth`/`rememberMe` cookie pair managed by `setAccessToken`, and the `loadViewer` projection. The Pinia store under test is real; only the `@api` network boundary is mocked.

## Key elements
- **`persistLocalePreference` describe block** — asserts the locale write is skipped for guests and un-identified sessions, resolves (never rejects) whether the API call succeeds or throws, and returns `undefined` so callers can ignore the promise.
- **`setAccessToken — the isAuth/rememberMe cookie pair` describe block** — verifies session-only vs. persistent `isAuth` cookies, that a silent token refresh preserves the original `rememberMe` choice, and that the `Secure` attribute is appended only over `https:`.
- **`loadViewer` describe block** — confirms `thumbnailUrl` from the account payload is projected into `store.viewer`.
- **`signedIn()` helper** — sets both access token and viewer on a fresh store (the two conditions `isAuth` actually requires).
- **`cookieJar()` helper** — parses `document.cookie` into a plain object for assertions.
- **`vi.mock('@api', …)` factory** — replaces every exported function with an untyped `vi.fn()` forwarded to a module-level mock; `touchSession` returns a static resolved value since no test depends on its shape.
- **`contractResponse(schemas.*, payload)`** — wraps fixture payloads in the generated-API envelope shape so mocked returns match what the store expects to destructure.

## Relationships
- **`tests/support/unit/fixtures.ts`** — supplies `aUser()` (and `aUser({…})`) to build account/viewer payloads with realistic field values, including `imageUrl` and `thumbnailUrl`.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `contractResponse()` to shape those payloads into the generated `@api/schemas` envelope (e.g. `UpdateAccountResponse`, `GetAccountResponse`, `GetMyAbilitiesResponse`) that the store's code path reads.

## Notes
- The `@api` mock is **deliberately untyped** (`vi.fn()` with no generics). Fixtures return partial shapes the full generated envelope types would reject; retyping every mock to satisfy them would defeat the point of a mock. Each arrow in the factory carries an `eslint-disable-next-line` for the unsafe return.
- The store is imported via `await import('@/infrastructure/session.ts')` **after** the `vi.mock` factory, because Vitest hoists the mock and a static import would resolve before it takes effect.
- jsdom's cookie jar is **file-scoped**, not per-test. The cookie describe block's `beforeEach` calls `store.clearSession()` (not a raw `document.cookie` assignment) to avoid leaking state between cases.
- The `Secure`-flag tests spy on `Document.prototype.cookie`'s **setter** and forward to the native setter, because jsdom silently drops `Secure` against its `http:` origin, making the flag invisible to a plain `document.cookie` read.
- `isAuth` is defined as **token AND viewer** present. A token alone (restored-but-not-yet-identified) is explicitly *not* signed in, and the tests assert the API is not called in that state.

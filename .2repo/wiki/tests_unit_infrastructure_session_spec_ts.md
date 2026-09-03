# tests/unit/infrastructure/session.spec.ts

## Purpose

Unit tests for the session store (`src/infrastructure/session.ts`), covering three behaviors: `persistLocalePreference` (the one API write the store makes), the `isAuth` / `rememberMe` cookie pair set by `setAccessToken`, and the `thumbnailUrl` field in the `loadViewer` projection. The file exists to pin down that language switching never surfaces an error to the UI and that session-cookie persistence rules are honored across token refreshes.

## Key elements

- **`signedIn()`** — helper that returns a store with both an access token and a viewer set (the two conditions `isAuth` requires), so tests exercise the real auth path rather than a stub.
- **`cookieJar()`** — parses `document.cookie` (kept real by jsdom) into a plain `Record<string, string>` for assertions.
- **`vi.mock('@api', …)`** — replaces the entire API module at the network boundary; only `updateAccount` and `getAccount` are wired to controllable mocks (`updateAccountMock`, `getAccountMock`); the rest are inert `vi.fn()`s.
- **`describe('persistLocalePreference')`** — five cases asserting the call always resolves: writes locale for a signed-in user, skips the API for a guest, skips for token-without-viewer, resolves (not rejects) when the API throws, and resolves with `undefined` on success so callers can fire-and-forget.
- **`describe('setAccessToken …')`** — four cases verifying `isAuth` cookie is session-only vs. persistent based on `rememberMe`, that a refresh without an explicit `remember` flag preserves the prior `rememberMe` cookie, and that opting out clears the marker.
- **`describe('loadViewer')`** — two cases confirming `thumbnailUrl` is carried into the viewer projection when present on the account payload, and is `undefined` when absent.

## Relationships

No graph neighbors are recorded. The file imports the store under test from `@/infrastructure/session.ts` and mocks the `@api` module; it has no other source-file dependencies.

## Notes

- The `@api` mock is hoisted above the dynamic `import('@/infrastructure/session.ts')`; the store is loaded with `await import(…)` so the mock is in place before the Pinia store registers.
- `beforeEach` in the `setAccessToken` block calls `store.clearSession()` (not a raw `document.cookie = ''`) to reset cookies, because jsdom retains `document.cookie` across tests within a file.
- The `signedIn()` helper is defined at module scope and reused across describe blocks; the `setAccessToken` block's `beforeEach` must clear those cookies to avoid cross-contamination.
- The test file deliberately does **not** mock the store — only the network layer (`@api`) — so `isAuth` derivation logic (token AND viewer) is exercised as production code.
- `updateAccountMock` is pre-resolved to `{ data: {} }` in the top-level `beforeEach`; individual tests override with `mockRejectedValue` or reconfigure as needed.

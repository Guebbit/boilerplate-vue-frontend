# tests/unit/app/guards/authentications-restore.spec.ts

## Purpose

Unit tests for `tryRestoreAuth`, the vue-router guard that converts a persisted `isAuth` cookie back into an active session on every navigation. The focus is the **order** and **conditional skipping** of two store calls (`refreshToken` → `loadViewer`), and the hard contract that the function must *always resolve* (a rejection would abort navigation and strand the visitor on a blank page).

## Key elements

- **`sessionStore`** – Shared mutable mock replacing `useSessionStore`. Exposes `accessToken`, `refreshToken` (vi.fn), and `loadViewer` (vi.fn). Reset and re-stubbed in every `beforeEach`.
- **`getCookieMock`** – vi.fn stand-in for `@guebbit/js-toolkit`'s `getCookie`, driven per-suite to simulate presence/absence of the `isAuth` cookie.
- **`vi.mock` block** – Stubs `pinia/storeToRefs`, `@guebbit/vue-toolkit` notifications, and `@/infrastructure/i18n` so the SUT runs without side effects.
- **Test suites**
  - *Guest with no cookie* – asserts zero network calls.
  - *Returning visitor (cookie present)* – asserts call order, cookie name, skip-when-no-token, and resolve-not-reject on both failure paths.
  - *Token already in memory* – asserts `refreshToken` is skipped but `loadViewer` still fires.
  - *Return value* – asserts the guard resolves to `undefined` (vue-router "proceed" signal), never a user object.

## Relationships

No graph neighbors are recorded. The only import under test is `tryRestoreAuth` from `@/app/guards/authentications`; all other imports are mocked out entirely.

## Notes

- **Separate file from `authentications.spec.ts`** on purpose: that file mocks the store to `{}` and drives it through `storeToRefs` (sufficient for `enforceRouteAccess`, a pure two-boolean check). Here the store is a *recording double* so assertions can distinguish call order and which call was skipped.
- **`beforeEach` sets `refreshToken` to set `accessToken` as a side-effect.** This mirrors the real store contract (a successful refresh populates the token) so the second half of the SUT sees a realistic state.
- **The "resolves" assertions are the behavioral spec.** Tests like *"resolves rather than rejecting when the refresh fails"* use `expect(...).resolves.toBeUndefined()` — the resolve *is* the assertion; a `.rejects` would indicate a navigation-aborting bug.
- **`storeToRefs` is mocked to return fixed `value: false` refs** because `tryRestoreAuth` doesn't read those booleans; the mock exists only to satisfy the import chain.

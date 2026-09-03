# tests/unit/app/guards/authentications-restore.spec.ts

## Purpose

Unit tests for `tryRestoreAuth`, the vue-router guard that converts a surviving `isAuth` cookie into a live session (refresh token → load viewer). Because this guard must **always resolve** (a rejection aborts navigation and strands the visitor on a blank page), every failure-path test asserts a resolved promise. The file is split from `authentications.spec.ts` because the latter mocks `useSessionStore` as an empty reactive object driven through `storeToRefs`, whereas this test needs a *recording double* that captures the **order** of `refreshToken` and `loadViewer` calls and which of them is skipped.

## Key elements

- **`sessionStore`** – Module-level mutable double with `accessToken`, `refreshToken` (vi.fn), and `loadViewer` (vi.fn). Replaced in place by `vi.mock('@/infrastructure/session')` so the SUT reads the same object.
- **`getCookieMock`** – Stand-in for `@guebbit/js-toolkit`'s `getCookie`; its return value selects which describe-block scenario runs.
- **`beforeEach` (top-level)** – Clears all mocks, resets `accessToken` to `undefined`, and sets the "realistic" default where `refreshToken` writes `'restored-token'` into the store.
- **`describe('a guest with no isAuth cookie')`** – Asserts `tryRestoreAuth` resolves without calling `refreshToken` or `loadViewer` (no wasted round-trip).
- **`describe('a returning visitor holding the isAuth cookie')`** – Covers: happy-path ordering (refresh → load), cookie read by name `'isAuth'`, skipping `loadViewer` when refresh yields no token, resolving on refresh rejection, resolving on `loadViewer` rejection.
- **`describe('a visitor whose token is already in memory')`** – Sets `accessToken` before the call; asserts `refreshToken` is skipped but `loadViewer` still fires.
- **`describe('the value handed back to the router')`** – Asserts the guard resolves to `undefined` (vue-router "proceed"), not the user record.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The file header comment explicitly explains *why* this test is separate from `authentications.spec.ts`: the mock strategy differs (recording double vs. reactive refs), and merging them would force one file's mock to break the other's assertions.
- The "resolves rather than rejects" tests use `expect(...).resolves.toBeUndefined()` — the resolution itself is the assertion; there is no separate `.catch` check.
- `storeToRefs` is mocked to return static `{ value: false }` refs; this is a leftover dependency of the SUT's import chain and is not exercised by these tests.
- The realistic-default `refreshToken` mock mutates `sessionStore.accessToken` synchronously inside the mock, so the second half of `tryRestoreAuth` sees a token only when the first half succeeded.

---
source: tests/unit/app/guards/authentications-restore.spec.ts
sha256: 649920d109ee6c92edf0cc03bc3d39283305cefcd87679b674a3da26a4083eb9
signature: 13234ba6527256335156cd72bc536ea40dc545208ac806c5eb9301a9db36cdd6
generated_at: 2026-11-10T07:45:36.325075+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/guards/authentications-restore.spec.ts

## Purpose

Unit tests for `tryRestoreAuth`, the Vue Router guard that rehydrates a visitor's session from the `isAuth` cookie before `enforceRouteAccess` runs. It verifies the guard's call ordering into the session store, its short-circuit logic (guest vs. returning visitor vs. already-authenticated), and its "always resolve, never redirect" contract so a failure never strands the visitor on a blank page.

## Key elements

- **`sessionStore`** – module-level mock double exposing `hasSession`, `viewer`, `loadSessionMode`, `restoreFromCookies`, `loadViewer`. Used to assert *call order* and *skipping*, not just boolean outcomes.
- **`getCookieMock`** – typed via `vi.fn<typeof getCookie>()` so the factory return is properly typed rather than falling back to `vi.fn()`'s untyped default.
- **`vi.mock` blocks** – stub out `@/infrastructure/session`, `@guebbit/js-toolkit`, `@guebbit/vue-toolkit`, `pinia` (`storeToRefs` → `{ isAuth: { value: false } }`), and `@/i18n`.
- **`describe('a guest with no isAuth cookie')`** – asserts no store actions are called at all.
- **`describe('a returning visitor holding the isAuth cookie')`** – asserts ordering (`loadSessionMode` → `restoreFromCookies` → `loadViewer`), cookie name, skip-when-no-session-after-restore, and resolve-instead-of-reject for each failure path.
- **`describe('a visitor whose session is already held')`** – asserts `restoreFromCookies` is skipped but `loadViewer` still fires when `viewer` is undefined; asserts `loadViewer` is *not* re-called when `viewer` is already set (per-navigation perf guard).
- **`describe('the value handed back to the router')`** – asserts the guard resolves `undefined` (vue-router "proceed"), not a user record that the guard chain might misread as a redirect target.

## Relationships

No graph neighbors. The sole import under test is `tryRestoreAuth` from `@/app/guards/authentications`, which is the system under test rather than a peer dependency to document here.

## Notes

- **Resolve, never reject.** Every failure-path test asserts `.resolves.toBeUndefined()`. A rejection aborts navigation in Vue Router, leaving a blank page—so the guard swallows errors by design.
- **`beforeEach` mutates store state.** `restoreFromCookies.mockImplementation` sets `sessionStore.hasSession = true` after resolving, simulating the realistic "first half sets up the state the second half reads" flow. Tests that need the "restore produced nothing" case override this in their own `beforeEach` or inline.
- **Per-navigation cost is a first-class concern.** The "does not reload an already-known viewer" test encodes a past bug where every navigation re-fetched the viewer (two round-trips) even when it was already in the store.
- **No mode in the double.** `loadSessionMode` is a plain `vi.fn()`; the guard's contract is order and skip logic, not which mode is active. The store is responsible for interpreting the mode internally.

---
source: tests/unit/app/guards/authentications-restore.spec.ts
sha256: 649920d109ee6c92edf0cc03bc3d39283305cefcd87679b674a3da26a4083eb9
generated_at: 2026-10-17T02:30:25.355297+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/guards/authentications-restore.spec.ts

## Purpose

Unit tests for the `tryRestoreAuth` navigation guard (exported from `@/app/guards/authentications`). This guard runs on every router navigation before `enforceRouteAccess` and converts session cookies back into a live session. The tests verify the guard's ordering of store calls, its short-circuit conditions (no cookie, session already held, viewer already known), and its hard contract: **always resolve, never reject**—a rejection would abort the navigation and strand the visitor on a blank page.

## Key elements

- **`sessionStore`** – Hand-rolled double exposing `hasSession`, `viewer`, `loadSessionMode`, `restoreFromCookies`, and `loadViewer` as `vi.fn()`s. Deliberately has no "mode" field because mode selection is the store's concern, not the guard's.
- **`getCookieMock`** – `vi.fn<typeof getCookie>()` so the factory in `vi.mock('@guebbit/js-toolkit', …)` returns a properly-typed value.
- **`vi.mock` block** – Replaces `@/infrastructure/session`, `@guebbit/js-toolkit`, `@guebbit/vue-toolkit`, `pinia`, and `@/i18n` with minimal stubs. The pinia mock is a flat `{ isAuth: { value: false } }` because `tryRestoreAuth` does not use `storeToRefs` reactivity.
- **`beforeEach` (global)** – Resets all mocks, sets `restoreFromCookies` to a realistic implementation that flips `hasSession` to `true`, and stubs `loadViewer` to resolve `{ id: 'u1' }`.
- **describe blocks**
  - *guest with no isAuth cookie* – asserts neither `restoreFromCookies` nor `loadViewer` is called (avoids a futile network round-trip on every anonymous page view).
  - *returning visitor holding the isAuth cookie* – asserts call order (`loadSessionMode` → `restoreFromCookies` → `loadViewer`), cookie name, skip-viewer-when-no-session, and resolve-not-reject for each failure path.
  - *visitor whose session is already held* – asserts `restoreFromCookies` is skipped, `loadViewer` is called only when `viewer` is still `undefined`, and a later navigation does **not** re-fetch a known viewer.
  - *the value handed back to the router* – asserts the resolved value is `undefined` (vue-router "proceed"), not the viewer object.

## Relationships

No external graph neighbors are registered. The sole production import is `tryRestoreAuth` from `@/app/guards/authentications`; all other dependencies are mocked.

## Notes

- This file is intentionally **separate from `authentications.spec.ts`** because that file mocks the store down to `{}` and drives it through `storeToRefs`, which is appropriate for testing `enforceRouteAccess` (a pure function of two booleans) but useless here—`tryRestoreAuth` cares about the *order* and *skipping* of two store calls.
- The `restoreFromCookies` default mock **mutates `sessionStore.hasSession` to `true`** to simulate the realistic post-restore state; tests that need a failed restore override this with `mockResolvedValue(undefined)`.
- Every failure-path test asserts `resolves.toBeUndefined()` rather than catching a rejection, encoding the "never redirect" contract directly into the assertion.
- The "does not reload an already-known viewer" test exists to guard against a regression where `loadViewer` (and its chained round-trips) fired on **every** navigation instead of only the first one.

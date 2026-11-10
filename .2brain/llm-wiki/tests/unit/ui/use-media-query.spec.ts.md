---
source: tests/unit/ui/use-media-query.spec.ts
sha256: 851f410fca545019745e64e6ebf981418913b89207b36826adb5b6c35d08a4de
signature: b73d7dbd00f198ef410ccd3321588665a84b069b9e313a4799eaa4059784ae2f
generated_at: 2026-11-10T08:31:06.289653+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-media-query.spec.ts

## Purpose

Unit tests for the `useMediaQuery` composable. Verifies that the ref it returns reflects the current `matches` state, updates reactively when the media query changes, passes the caller's query string verbatim to `window.matchMedia`, and removes its event listener when the owning Vue effect scope is stopped.

## Key elements

- **`fakeList(initial: boolean)`** — Local helper that builds a controllable `MediaQueryList` stub. Exposes a `fire(matches)` method that dispatches a synthetic `MediaQueryListEvent` to all registered listeners, and a `listeners` `Set` so tests can assert listener count.
- **`describe('useMediaQuery')`** — Three tests:
  - *starts at the current answer and follows a change* — seeds `matches: false`, calls `useMediaQuery`, asserts initial value, then calls `fire(true)` and asserts the ref updates.
  - *asks the browser for the query it was given* — spies on the global `matchMedia` and asserts it was called with the exact query string `'(pointer: coarse)'`.
  - *removes its listener when the scope stops* — runs the composable inside a Vue `effectScope`, asserts one listener is registered, calls `scope.stop()`, asserts the listener count drops to zero.

## Relationships

- **`tests/support/stub.ts`** — Provides `asStub`, used to construct the `MediaQueryList` and `MediaQueryListEvent` fake objects with minimal surface area.

## Notes

- All tests stub the global `matchMedia` via `vi.stubGlobal`, so the composable's internal `window.matchMedia` call is intercepted. Vitest restores the global between tests.
- The cleanup test relies on the composable internally calling `onScopeDispose` (or equivalent) to remove its listener; the test asserts this contract through the `listeners` set size rather than mocking `removeEventListener` separately.

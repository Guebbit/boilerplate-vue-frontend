# src/modules/demo/tests/guards.spec.ts

## Purpose

Unit test for the demo router guard (`exampleGuard`). It verifies three contracts: the guard returns `undefined` (allowing navigation through), Pinia stores are reachable from within the guard, and the guard survives `t()` calls made before the i18n dictionary is loaded. i18n is fully mocked; Pinia is kept real by design.

## Key elements

- **`translateMock` / `localeRef`** — vi.fn and plain object standing in for `i18n.global.t` (returns the key unchanged) and `i18n.global.locale`.
- **`vi.mock('@/infrastructure/i18n', …)`** — factory mock replacing the entire i18n module so the guard resolves its `i18n` import to the stub.
- **`exampleGuard`** (imported via `await import`) — the guard under test from `@/modules/demo/guards.ts`.
- **`useDemoStore`** (imported via `await import`) — the real Pinia store; the tests assert it is callable and mutable from inside the guard.
- **`routeTo(path?)`** — helper that builds a minimal `RouteLocationNormalized` stub via `asStub`.
- **`describe('exampleGuard', …)`** — five `it` blocks: return-value contract, store increment, accumulation across navigations, translation call arguments, and no-throw under unloaded translations.

## Relationships

- **`tests/support/stub.ts`** — imports `asStub` to construct the typed route object passed into the guard.
- **`src/infrastructure/i18n/locale-overrides.ts`** (part of the `@/infrastructure/i18n` module) — this file's `vi.mock` factory replaces the entire module the guard imports, so `locale-overrides` is never exercised here.
- **`@/modules/demo/guards.ts`** — the SUT; imported after the mock is registered.
- **`@/modules/demo/store.ts`** — imported unmocked to prove Pinia works inside a guard.

## Notes

- Pinia is **deliberately not mocked**; the test's goal is to demonstrate that stores function inside a `beforeEnter` guard.
- `expect(…).toBeUndefined()` is used instead of `toBeFalsy()` because Vue Router 4 treats a `false` return as "abort navigation," which would break every route.
- Top-level `await import(…)` is used (after `vi.mock`) to guarantee the guard module sees the mocked i18n, not the real one.
- `console.log` is spied and silenced in `beforeEach`/`afterEach` to keep test output clean and avoid confusion with the resilience e2e spec's "no console noise" rule.
- An `eslint-disable` comment suppresses `@typescript-eslint/no-confusing-void-expression` on the `toBeUndefined` assertion, since the void return *is* the behavior being asserted.

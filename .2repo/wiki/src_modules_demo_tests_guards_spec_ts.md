# src/modules/demo/tests/guards.spec.ts

## Purpose
Vitest unit tests for `exampleGuard` (in `src/modules/demo/guards.ts`). The suite verifies two real Vue Router guard invariants — that the guard returns `undefined` (not `false`/an object) and that it does not throw when i18n translations are not yet loaded — while also demonstrating that Pinia stores are fully functional inside a `beforeEnter` guard.

## Key elements
- **`translateMock` / `localeRef`** – hand-rolled stubs for `i18n.global.t` and `i18n.global.locale`, injected via `vi.mock('@/infrastructure/i18n', …)` before the guard is dynamically imported.
- **`exampleGuard`** – the SUT, loaded with `await import('@/modules/demo/guards.ts')` *after* the mock so its own i18n import resolves to the stub.
- **`useDemoStore`** – the real Pinia store (not mocked); the suite proves guard code can read/write it.
- **`routeTo(path)`** – helper that builds a minimal `RouteLocationNormalized` stub via `asStub`.
- **`consoleSpy`** – per-test `console.log` spy (set in `beforeEach`, restored in `afterEach`) to keep output clean.
- **Five `it` blocks** – return-type check, single increment, accumulation across navigations, translation-call arguments, and no-throw with unloaded translations.

## Relationships
- **`src/infrastructure/i18n/locale-overrides.ts`** – The module path `@/infrastructure/i18n` is the import this spec intercepts with `vi.mock`. The guard under test calls `i18n.global.t` and reads `i18n.global.locale`; the mock replaces both so no real dictionary or locale-override logic executes.
- **`tests/support/stub.ts`** – Provides `asStub<T>`, a type-safe cast helper used by `routeTo()` to produce a minimal route object without a full Vue Router instance.

## Notes
- The `expect(…).toBeUndefined()` assertion is deliberately *not* `toBeFalsy()`; the eslint-disable comment explains that `false` is a valid (but destructive) Vue Router return value.
- The guard is imported dynamically (`await import`) to guarantee it picks up the `vi.mock` registry rather than the real i18n singleton.
- Pinia is intentionally **not** mocked (`setActivePinia(createPinia())` gives a real instance per test). The teaching point is that a mocked store would prove nothing.
- `vi.clearAllMocks()` runs in `beforeEach`; the `translateMock` implementation is re-set explicitly in the "survives translations" test because `clearAllMocks` resets call history but not the mock implementation set at module scope.

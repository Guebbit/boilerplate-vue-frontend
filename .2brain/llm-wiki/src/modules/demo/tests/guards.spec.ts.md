---
source: src/modules/demo/tests/guards.spec.ts
sha256: 0184b7f5c258b2a811bffcde5453ce4c244ed9af5fd55ae03ddd8a000a9634a0
generated_at: 2026-10-02T15:06:32.922047+00:00
model: ollama:qwen3.8:27b
---

# src/modules/demo/tests/guards.spec.ts

## Purpose

Unit tests for the demo `beforeEnter` guard (`@/modules/demo/guards.ts`). The suite verifies three behavioral contracts: the guard returns `undefined` (not `false` or an object) so Vue Router 4 allows the navigation, the guard does not throw when i18n translations are absent, and Pinia stores are fully functional inside the guard without any mocking.

## Key elements

- **`translateMock`** – `vi.fn` that returns the key unchanged, simulating `t()` being called before the dictionary loads.
- **`localeRef`** – `{ value: 'en' }`, mimicking a Vue ref so `.value` access works in the guard.
- **`vi.mock('@/i18n', …)`** – module-level mock exposing `i18n.global.t` and `i18n.global.locale` via getters that delegate to the stubs above.
- **`exampleGuard`** (dynamic import) – the guard under test, imported *after* the mock so its internal `@/i18n` import resolves to the stub.
- **`useDemoStore`** (dynamic import) – the real Pinia store; intentionally not mocked.
- **`routeTo(path?)`** – builds a minimal `RouteLocationNormalized` stub via `asStub`; default path is `/en/products`.
- **Test cases** – five `it` blocks asserting: returns `undefined`; increments `store.count`; accumulates across successive calls; passes the target path into the `t()` call as `{ load: path }`; does not throw when `t()` returns the raw key.

## Relationships

- **`tests/support/stub.ts`** – provides `asStub<T>`, a typed cast helper used by `routeTo()` to satisfy the `RouteLocationNormalized` parameter type without constructing a full route object.
- **`@/modules/demo/guards.ts`** (import target, not in the neighbor list above) – the system under test; dynamically imported after the `@/i18n` mock is registered.
- **`@/modules/demo/store.ts`** (import target) – supplies `useDemoStore`, exercised live to confirm Pinia works inside a guard.

## Notes

- **Import order is load-bearing.** The `vi.mock('@/i18n')` call must appear before the dynamic `await import` of the guard; a static import at the top would bypass the mock.
- **`toBeUndefined()` is deliberate, not stylistic.** `toBeFalsy()` would also pass for `false`, but returning `false` from a Vue Router 4 guard *aborts* navigation for every route. The explicit `undefined` assertion guards against that regression.
- **Pinia is real, i18n is mocked.** This is the pedagogical contrast the suite demonstrates: stores work in guards out of the box; i18n does not (dictionary not yet loaded at `beforeEnter` time). Mocking the store would defeat the point.
- **`console.log` is spied in `beforeEach`** and restored in `afterEach` to keep Vitest output clean and to avoid tripping the project's e2e "no unexpected console output" rule.
- **`translateMock.mockImplementation`** is re-set inside the "survives unloaded translations" test to make the intent explicit, even though it already defaults to key-echo.

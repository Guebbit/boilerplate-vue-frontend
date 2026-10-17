---
source: src/modules/example/tests/guards.spec.ts
sha256: f0832b7d43ef35ef0a89b350d5a3fd2059266119ac9a74d33d9cf95438c3a478
generated_at: 2026-10-17T00:53:18.226098+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/guards.spec.ts

## Purpose

Vitest spec for `exampleEditGuard` (the Vue Router navigation guard on the example-edit route). It verifies three production-critical contracts: the guard resolves to `undefined` so Vue Router treats it as a pass-through, it survives a failed store fetch without blocking navigation, and it only fetches when the route carries a scalar `id`.

## Key elements

- **`exampleEditGuard`** — imported (via top-level `await import`) from `../guards.ts`; the function under test.
- **`fetchExample`** — `vi.fn` stub standing in for `useExampleStore().fetchExample`; mock is wired through a `vi.mock('../store.ts', …)` factory.
- **`routeTo(parameters)`** — local helper that builds a minimal `RouteLocationNormalized` object using `asStub` so each test case only specifies the `params` the guard reads.
- **`vi.mock('@/infrastructure/utils/logger.ts', …)`** — silences the guard's per-navigation debug logging.
- **`beforeEach`** — resets Pinia (`setActivePinia(createPinia())`), clears all mocks, and defaults `fetchExample` to resolve `undefined`.
- **Five `it` cases** covering: successful fetch with the route's `id`, `undefined` resolution, survival of a rejected fetch, no-fetch when `id` is absent, and no-fetch when `id` is an array.

## Relationships

- **`tests/support/stub.ts`** — provides `asStub<T>()`, used by `routeTo` to cast a partial object to `RouteLocationNormalized` without the test importing the full type shape.

## Notes

- The file uses top-level `await import('../guards.ts')` *after* the `vi.mock` calls, which is the standard ESM pattern to ensure mocks are registered before the module under test is loaded.
- Resolving to `undefined` (not `true`, not `null`, not an object) is the only correct pass-through in Vue Router; the test asserts this explicitly because a wrong return type silently changes routing behavior.
- The `id`-as-array case guards against Vue Router's `params` type, which allows `string | string[]` — the guard must not call `fetchExample` with an array.

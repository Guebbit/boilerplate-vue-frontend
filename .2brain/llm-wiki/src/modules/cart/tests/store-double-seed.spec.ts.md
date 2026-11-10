---
source: src/modules/cart/tests/store-double-seed.spec.ts
sha256: 2f12f216ec666cba24c4f385908940937f1bd8c6c0d2be1c0bc88de4aade9115
signature: 6f6fd05926b26c6c100c37b553956bd50bcb2d395023146cff9bf555a7e594a5
generated_at: 2026-11-10T04:10:26.731539+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store-double-seed.spec.ts

## Purpose

Verifies that two consecutive `seedAfterSignIn()` calls (e.g., a shell re-rendering or StrictMode double-effect) result in exactly **one** `mergeCart` API call. The second call joins the in-flight first rather than issuing a duplicate merge, so the server never sees the same cart key twice and the shopper is not shown a spurious "stays on this device" warning.

## Key elements

- **`describe('a sign-in')` / `it('sends the guest cart once…')`** – the single test case. Adds a guest item, gates `mergeCart` via `gate()`, fires `seedAfterSignIn()` twice synchronously, then resolves the gate and asserts `mergeCart` was called exactly once.
- **`gate<Answer<typeof mergeCart>>()`** – creates a controllable Promise pair so the test can interleave the two `seedAfterSignIn()` calls *before* the merge resolves.
- **`answered(value)`** – wraps a plain value in the shape the API layer expects, letting the mock resolve with a realistic payload.
- **`aCart(lines).summary`** – fixture builder (from `cart-fixtures.ts`) that produces a cart object and its summary in one step.
- **`trackStores()` → `{ fresh, disposeAll }`** – factory that creates a Pinia store and registers it for cleanup; `disposeAll()` runs in `afterEach`.
- **`vi.mock('@api', …)`** – full mock of the cart API surface (`getCart`, `mergeCart`, `addCartItem`, etc.) so no network code executes.
- **`wireModulesIntoCore()`** – injects the module's dependencies into the application DI core for the test context.

## Relationships

- **`cart-fixtures.ts`** – supplies `aCart`, the builder used to shape the mock `mergeCart` response and the `getCartSummary` resolved value.
- **`track-stores.ts`** – supplies `trackStores()`, which wraps `createPinia`/store creation with a dispose registry used in `afterEach`.
- **`async-answers.ts`** – supplies `gate` and `answered`, the utilities for deterministically sequencing async mock resolutions.
- **`wire-modules.ts`** – supplies `wireModulesIntoCore()`, which registers the cart module in the DI container so the store under test resolves its dependencies.

## Notes

- The two `seedAfterSignIn()` calls are fired **before** `merge.resolve(…)` is invoked; `Promise.allSettled([first, second])` then waits for both. This ordering is the whole point of the test: it proves the second call attaches to the first's in-flight promise rather than starting a new merge.
- `vi.resetAllMocks()` runs in `beforeEach`, so each test gets a clean call-count slate; the `mergeCart` mock is re-gated per test via the local `gate()` call.
- `localStorage.clear()` in `beforeEach` ensures no persisted cart state leaks between tests.

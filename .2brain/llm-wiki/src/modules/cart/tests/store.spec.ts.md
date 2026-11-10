---
source: src/modules/cart/tests/store.spec.ts
sha256: 05e201af488174a130c9068f036bcff646ff6eab471e41eda2aadac4910c2fd6
signature: 289def49afb11851353e0ad169125108c6fc0178ef7eff6d03b8a8f685f4505f
generated_at: 2026-11-10T04:12:04.539975+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store.spec.ts

## Purpose

Vitest unit tests for `useCartStore`, verifying that every store action stores the API payload verbatim, that derived getters (`badgeQuantity`, `cartItems`, `cartSummary`, `cartShipping`) behave correctly in both the unfetched and post-fetch states, and that error semantics (401 vs. 500 on summary, rejection envelopes on checkout) match the contract described in the module's header comment.

## Key elements

- **`RESPONSES`** — module-level object holding every canned API response, each wrapped in `contractBody` or `contractResponse` so a fixture that drifts from its generated schema fails the whole file at import time.
- **`CART` / `EMPTY_CART` / `ORDER`** — the canonical fixture payloads (one line, two units, EUR) and their zero-state counterpart.
- **`cartTotalling(totalPrice)`** — builds a `GetCartResponse` answer with a parameterised total, used by tests that assert on a specific `totalPrice`.
- **`apiFailure(status)` / `apiFailure409()`** — produce the API's rejection envelope via `aProblem` (not an `Error`), matching what `onResponseReject` emits in production.
- **`signInAs(id?)`** — sets `useSessionStore().viewer` directly and returns `nextTick()`, so watcher-driven side-effects settle before assertions run.
- **`lastIdempotencyKey()`** — inspects the most recent `apiCheckout` mock call to read the `Idempotency-Key` header the store sent.
- **`vi.mock('@api', …)`** — replaces every cart/catalogue API function with a `vi.fn` that resolves to the corresponding `RESPONSES` entry; `getProductById` is parameterised by product id.
- **`describe` blocks** — one per store action (`fetchSummary`, `fetchCart`, `addCartItem`, `updateCartItem`, `removeCartItem`, `clearCart`, `setShippingMethod`, checkout/reorder) plus an initial-state block and a `before anything is fetched` block.

## Relationships

- **`src/modules/cart/store.ts`** — the system under test; every `describe` block exercises one action or getter exported from this store.
- **`tests/support/unit/orval-fixture-schema.ts`** — provides `contractBody` and `contractResponse`, which validate each fixture against its Orval-generated response schema at module scope.
- **`tests/support/unit/fixtures.ts`** — provides `anOrder` (used to build `ORDER`) and `aProblem` (used by `apiFailure`/`apiFailure409`) to keep error-envelope shape consistent with other test files.
- **`tests/support/unit/async-answers.ts`** — exports the `Answer<T>` type used in `contractBody`/`contractResponse` generics and the `answered` helper for composing async mock return values.

## Notes

- All fixtures are schema-validated **once at module load**, not per test. A broken schema or a drifted fixture causes the entire spec file to fail on import — a deliberate fail-fast choice documented in the `RESPONSES` JSDoc.
- `apiFailure` deliberately rejects with a plain object (not `Error`), annotated with an `eslint-disable` comment: this mirrors the real rejection contract where `onResponseReject` passes through the API's problem envelope built by `aProblem`.
- The header comment documents two non-obvious API design decisions the tests intentionally lock in: `clearCart` is bodyless `DELETE /cart/items` (distinct from `DELETE /cart/items/:id`), and `updateCartItem` replaces the *entire* local cart from the recalculated response rather than patching a single line.
- `beforeEach` resets Pinia (`setActivePinia(createPinia())`) and clears all mocks, so each test starts from a pristine store with no residual state.

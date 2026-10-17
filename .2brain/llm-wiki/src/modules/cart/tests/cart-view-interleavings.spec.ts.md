---
source: src/modules/cart/tests/cart-view-interleavings.spec.ts
sha256: b8e2ce4222f6c3af0940b36ac73a5174b5888981baf8214f0ad6fe957178e24e
generated_at: 2026-10-17T00:38:11.628390+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-view-interleavings.spec.ts

## Purpose

Integration-style tests for the cart page running against the **real** Pinia store, focused on *event interleavings*: a shipping radio seeded from a server response, a quantity step that must settle before checkout is dispatched, and a lost checkout answer that is retried with an identical idempotency key and body. Explicitly complementary to `cart-view.spec.ts`, which stubs store methods and asserts what each refusal *renders*; this file asserts what the page and store *do to each other*.

## Key elements

- **`calledTimes(api, times)`** — `vi.waitFor`-based helper that resolves once a mocked API function has been called exactly `times` times.
- **`sent()`** — Reads `apiCheckout` mock calls and returns `[Idempotency-Key, JSON body]` pairs in call order, used to assert idempotent retry.
- **`describe('the shipping radio')`** — Three cases: server-seeded selection renders on open; a pick made after the initial read persists and the total includes its cost; a 409 refusal rolls the radio back to `undefined`.
- **`describe('a quantity step and the order that follows it')`** — Uses `gate<Answer<…>>()` to hold a quantity-update promise open, proving checkout is *not* dispatched until the step resolves; a 503 on the step blocks checkout entirely.
- **`describe('an order whose answer was lost')`** — First checkout call rejects with `lostAnswer()`; second click retries. Asserts both requests carry the same `Idempotency-Key` and body, and that the successful retry navigates to the order page with an empty cart.
- **Module-level `wireModulesIntoCore()`** — Injects test fixtures into the module registry before any test runs.
- **`vi.mock('@api', …)`** — Replaces `getCart`, `updateCartItemById`, `setCartShippingMethod`, `checkout` with `vi.fn()` while preserving other exports via `importOriginal`.
- **`beforeEach`** — Clears `sessionStorage`, resets mocks, sets a default `setCartShippingMethod` implementation, creates a fresh Pinia, stubs the session viewer via `asStub`, loads locale, and pushes the router to `/en/cart`.
- **`afterEach`** — Calls `vi.restoreAllMocks()` to undo `router.push` and product-read spies.

## Relationships

- **`tests/support/stub.ts`** — `asStub<SessionViewer>` wraps the viewer object in the test stub envelope.
- **`tests/support/unit/cart-fixtures.ts`** — Supplies all cart-shape builders: `aCart`, `answered`, `lostAnswer`, `gate`, and the `Answer<T>` type used in the deferred-promise pattern.
- **`tests/support/unit/fixtures.ts`** — Provides `anOrder` for constructing the checkout response fixture.
- **`tests/support/unit/mount-cart-page.ts`** — Provides `mountCartPage` (mounts the component and returns a test-helper object with `selectedShipping()`, `pickShipping()`, `cart`, `wrapper`) and the shared `router` instance.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore`, called once at module scope to register test doubles in the DI/module registry before imports resolve.

## Notes

- The split with `cart-view.spec.ts` is deliberate and documented in the file header: that file owns *rendering* of refusals (stubbed store); this file owns *behavioral coupling* between page actions and store state (real store). Avoid duplicating refusal-render assertions here.
- `gate<Answer<typeof updateCartItemById>>()` is a deferred-promise idiom: `step.promise` is returned as the API's response, and `step.resolve(…)` is called later to release it. The type parameter must match the API function's return type.
- `sent()` inspects the **second** argument of `apiCheckout` as an axios-style `{ headers }` config; if the API layer changes its argument shape, this helper breaks silently.
- The default `setCartShippingMethod` mock in `beforeEach` returns `answered(aCart([['p1', 2]], shippingMethodId))` — tests that need a different response use `mockRejectedValueOnce` or `mockResolvedValueOnce`, which override that default for a single call.
- `vi.restoreAllMocks()` in `afterEach` is necessary because several tests install `vi.spyOn(router, 'push')`; without it the spy leaks into subsequent tests.

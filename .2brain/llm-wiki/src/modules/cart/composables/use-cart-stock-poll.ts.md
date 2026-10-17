---
source: src/modules/cart/composables/use-cart-stock-poll.ts
sha256: 5e76c3135ec4da6a2c64d7d1e8bae0cb05452ab119ae54c180f2e89e1df2e2f1
generated_at: 2026-10-17T00:34:34.012220+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/composables/use-cart-stock-poll.ts

## Purpose

Registers a timed re-read of `GET /cart` while the cart page is open, keeping each line's `availability` flag in sync with shelf stock. It is fully opt-in: if the poll interval resolves to `undefined`, no timer or listener is created at all. Its lifetime is tied to the calling component's scope (the cart page / checkout).

## Key elements

- **`useCartStockPoll()`** (exported) — the sole entry point. Resolves the poll interval from runtime config / env, then wires up the watch, visibility listener, and interval timer. Returns immediately when the interval is undefined.
- **`isTabVisible()`** (module-private) — one-liner reading `document.visibilityState`.
- **`stillOwner`** (computed) — true only while the signed-in user matches the one who opened the page.
- **`ended`** (ref) — one-way latch set when the owner leaves; once true the poll never resumes for the scope's life.
- **`tick()`** (closure) — calls `cartStore.pollCart()`, swallowing errors into a `debug` log; the next interval tick retries.
- **`stop()`** (closure) — clears `setInterval` and resets the handle.

## Relationships

- **`src/modules/cart/store.ts`** — calls `pollCart()` on each tick; the store owns the race-condition / in-flight-write semantics for that call.
- **`src/modules/cart/domain/index.ts` → `stock-poll.ts`** — provides `stockPollIntervalMs`, which parses the seconds value into milliseconds (or `undefined`).
- **`src/modules/cart/views/Cart.vue`** — invokes `useCartStockPoll()` inside `<setup>`, making the composable's scope equal to the page's lifetime.
- **`src/infrastructure/utils/logger.ts`** — imports `debug` to log poll failures without surfacing them to the user.
- **`src/modules/cart/tests/use-cart-stock-poll.spec.ts`** — unit-tests the composable's gate logic, latching behavior, and interval lifecycle.

## Notes

- The "owner latch" is intentional and asymmetric: if the signed-in user changes (sign-out, account switch), polling stops permanently for that page instance. Switching back to the original user does **not** resume it.
- `immediate: true` on the main watch fires a `tick()` on setup, but because the page has already read the cart, that first read is a no-op in practice. The one meaningful immediate read is after a tab becomes visible again.
- The interval is resolved once at setup from `runtimeValue` / `import.meta.env`; it does not react to mid-session config changes.
- Failures are deliberately silent (debug-log only) — the design assumption is that the next tick self-heals.

---
source: src/modules/cart/tests/cart-line-card.spec.ts
sha256: 9108ac3a3df9efd0c40b8653fcb2fea692cbcbe039d31e3e855ae5133a9b237a
signature: 1215f40f77dcf1a860686fd2ef970e90de19f07da28cc86f6f78b39e671eb452
generated_at: 2026-11-10T04:01:34.700054+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-line-card.spec.ts

## Purpose

Vitest unit tests for `CartLineCard.vue`. The spec locks in the component's contract: data-test hook naming, per-flag button disabling, event emission (step delta + remove), conditional price rendering, currency-aware price formatting, and the badges slot.

## Key elements

- **`mountCard(props?, badges?)`** — local helper that mounts `CartLineCard` with sensible defaults (`title`, `quantity: 2`, `unitPrice: '10.00'`, `currency: 'EUR'`, both steppers enabled, `testPrefix: 'cart'`) and accepts a props-override object plus an optional badges slot string.
- **`beforeAll(() => loadLocale('en'))`** — ensures the English locale is active so formatting assertions are deterministic.
- **"builds every test hook from the prefix"** — asserts that `item`, `decrease`, `increase`, `remove`, `line-price` hooks all appear with the given `testPrefix`.
- **"disables each stepper from its own flag"** — verifies `canDecrease`/`canIncrease` independently control the `disabled` attribute on each button.
- **"emits the step with its delta, and remove"** — clicks decrease → increase → remove in sequence and checks emitted `step` payloads (`[-1]`, `[1]`) and one `remove` event.
- **"prints the priced line only once a price is known"** — with `unitPrice` set the hook exists and contains `×`; with `unitPrice: undefined` the hook is absent.
- **`it.each` currency pricing** — parameterised over EUR (2 dp), JPY (0 dp), KWD (3 dp) to confirm the rendered total text matches `unitPrice × quantity` at the correct precision and grouping.
- **"renders the badges slot beside the quantity"** — injects a badge span via the slot and confirms it sits inside a `role="status"` container.

## Relationships

- **`src/modules/cart/components/CartLineCard.vue`** — the sole SUT under test; imported directly and mounted via `@vue/test-utils`.
- **`@/ui/vuetify`** — registered as a global plugin so Vuetify components inside the card resolve.
- **`@/i18n`** — provides the `i18n` plugin and `loadLocale` used in `beforeAll`.

## Notes

- Price assertions split the rendered text on `=` and check the second half, implying the component renders a `… = <total>` suffix.
- JPY and KWD cases guard against a naive `toFixed(2)` implementation; KWD uses a dot as the decimal separator while a comma groups thousands in the en locale.
- The `mountCard` helper always passes a `badges` slot only when the argument is non-empty, so tests that don't care about badges get an empty slot rather than an undefined one.

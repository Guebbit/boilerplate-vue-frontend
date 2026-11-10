---
source: src/modules/cart/components/CartLineCard.vue
sha256: acd8b8238cc13f85b5f62c00cc15fac5aa2bd81f504043ef7120d94b48002500
signature: 50e0dd00673a6be357c96582fa8efcbc9bbb7a8a78e95ef90b63fa05ba75312b
generated_at: 2026-11-10T03:53:13.905376+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/components/CartLineCard.vue

## Purpose

A presentational card that renders a single cart line (title, quantity, optional price breakdown, quantity steppers, and a Remove button). It is intentionally dumb: all business rules (whether a step is allowed, what the line is worth) arrive as props, and every user action is forwarded as an emit. This lets `GuestCart` and `SignedInCart` share one component and differ only in the rules they pass down.

## Key elements

- **Props** — `title`, `quantity`, `unitPrice?`, `currency`, `canDecrease`, `canIncrease`, `removeDisabled?`, `testPrefix` (`'cart' | 'guest-cart'`). The component never computes or mutates any of these.
- **Slot `badges`** — an optional named slot for availability/legal chips rendered inside the `role="status"` paragraph next to the quantity.
- **Emits** — `step` (payload: `-1 | 1`) and `remove` (no payload). The parent owns the actual mutation.
- **Price line** — conditionally rendered only when `unitPrice` is defined; uses `formatCurrency` and `multiplyDecimal` from `@/infrastructure/utils`.
- **Test hooks** — `data-test` attributes follow the pattern `${testPrefix}-item | -decrease | -increase | -remove | -line-price`, so both carts get distinct selectors without extra props.
- **Accessibility** — quantity lives in a `role="status"` paragraph (announced on change by screen readers); stepper and Remove buttons carry `aria-label`s that include the product title via i18n.

## Relationships

- **`GuestCart.vue` / `SignedInCart.vue`** — Both render `CartLineCard` per line, passing their respective rules for `canDecrease`/`canIncrease`/`removeDisabled` and handling the `step`/`remove` events. `testPrefix` distinguishes the two contexts in tests.
- **`cart-line-card.spec.ts`** — Unit tests target the test hooks (`data-test` selectors), prop-driven disabled states, and the emitted payloads.

## Notes

- `unitPrice` is typed `string | undefined` (not `number`); the component does no arithmetic beyond the single `multiplyDecimal` call for display. A `null`/absent price means "product read hasn't answered yet," and the price line is simply hidden.
- The `role="status"` wrapper around quantity + badges is deliberate: it gives every row a live region for screen-reader announcements of quantity changes without needing a per-row `aria-live` attribute elsewhere.
- The component imports `useI18n` but exposes no i18n-related props; all translation keys are internal (`cart-page.*`).
- `testPrefix` is a union of exactly two literals, not a free string, to keep the selector namespace closed.

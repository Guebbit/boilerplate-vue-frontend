---
source: src/modules/orders/composables/use-order-hero.ts
sha256: 5ebc0cbb64337c56dabe6aea888138557049e6835110ad9e320b0eaffcc26aaf
signature: cd6d3de4a4a619910b9205860e4ec5787a70328922eb9b6e561201491a2f756f
generated_at: 2026-11-10T04:58:34.115906+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/composables/use-order-hero.ts

## Purpose

Centralizes the derivation of the three "hero" labels (heading, subheading, status) displayed at the top of every order-detail page. Each consuming page only supplies its own fallback title key; the composable handles all fallback and formatting logic so the views stay thin.

## Key elements

- **`useOrderHero(currentOrder, targetId, pageTitleKey)`** — the sole export. Accepts a reactive order ref, a getter for the routed order id, and an i18n key for the page's own title. Returns three computed refs:
  - **`heroTitle`** — resolved as `order.id → targetId() → t(pageTitleKey)`.
  - **`heroDescription`** — `formatText(notes || email)`, so the customer email appears as a secondary subheading when notes are absent.
  - **`orderStatus`** — translates the order status via the dynamic key `orders-form.status-${status}`; returns `EMPTY_VALUE` when no status is set.

## Relationships

- **`src/modules/orders/views/OrderEdit.vue`** — imports `useOrderHero` to render the hero block on the order-edit screen, passing its own `pageTitleKey`.
- **`src/modules/orders/views/OrderTarget.vue`** — imports `useOrderHero` for the order-target screen with its own title key.

## Notes

- `targetId` is typed as a **getter function** (`() => string | undefined`), not a plain value. Callers must pass a function that reads the current route param so the computed re-evaluates when navigation changes.
- `heroDescription` falls back to the **customer email** when `notes` is falsy — it is not simply "notes or empty."
- `orderStatus` builds its i18n key by string interpolation (`orders-form.status-${status}`); adding a new status value requires a matching translation key under the `orders-form` namespace.

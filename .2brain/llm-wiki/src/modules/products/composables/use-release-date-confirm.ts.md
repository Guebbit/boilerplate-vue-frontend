---
source: src/modules/products/composables/use-release-date-confirm.ts
sha256: 6384d93a67d35b84ee33f20d5811fc90f0f654828474ff4c8c2035c12992ab35
signature: 76b1abe9f61bba7f442edea1ac533bf0dc0ba378f389c4d1bd886b44dca16356
generated_at: 2026-11-10T05:19:57.882882+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/composables/use-release-date-confirm.ts

## Purpose

Composable that guards the save of a changed release date (preorder) or restock date (backorder) on the product edit form. Before persisting, it asks the backend how many fulfillment orders would be emailed about the move, then surfaces that count in a confirm dialog. It is strictly informational — the user can always proceed; the composable never blocks the save.

## Key elements

- **`ReleaseDateImpact`** (interface) — Shape of the preview response; the only field is `notify: number` (orders that would receive an email).
- **`useReleaseDateConfirm(heldDate, kind)`** (exported composable) — Factory that wires up i18n, session, and dialog stores and returns the single public method `confirmReleaseDateMove`. `kind` is `'release'` (default) or `'restock'` and selects which API endpoint is called.
- **`confirmReleaseDateMove(productId, current)`** (returned method) — Returns `Promise<boolean>`. Resolves `true` (proceed) immediately if the date is unchanged, the user lacks `display Order` permission, or the preview call fails. Otherwise shows a warning-coloured confirm dialog with the notify count and resolves per the user's choice.
- **`messageOf(impact)`** (internal) — Builds the i18n string for the dialog body from the notify count.

## Relationships

- **`src/modules/products/release-date.ts`** — Imports `isReleaseDateChanged` to short-circuit the check when the date value is effectively the same as the held record.
- **`src/modules/products/tests/use-release-date-confirm.spec.ts`** — Unit tests for this composable.
- **`src/modules/products/views/ProductEdit.vue`** — Consumer that calls `useReleaseDateConfirm` with the form's bound date and kind, then awaits `confirmReleaseDateMove` before issuing the save request.

## Notes

- The composable calls the generated `@api` client directly (`previewReleaseDateImpact` / `previewRestockDateImpact`) rather than routing through the sibling `delivery` module. This mirrors how the products store accesses locales: the API client is treated as shared infrastructure.
- A cleared (empty) date input is sent as `undefined`, not an empty string — the backend contract reads an absent field as "clear the date."
- The `.catch(() => true)` on the preview promise means any transport or 4xx/5xx error silently allows the save to continue. The preview is a courtesy, not a gate.
- The `session.can('display', 'Order')` check is a pre-flight to avoid generating forbidden-call log entries on every save for users who cannot see orders.

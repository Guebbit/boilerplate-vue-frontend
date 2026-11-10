---
source: src/modules/cart/components/MergeReportAlert.vue
sha256: 6e30ef82352c0401e4142d69ea2b9f236d1d6cb4916142e881db01bbccc1b907
signature: 3ac7fd973dd15fce3a47ce78656b1466c19ee628c10a4dd8d002b294cd228729
generated_at: 2026-11-10T03:53:54.195258+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/components/MergeReportAlert.vue

## Purpose

Renders an inline, closable alert on the signed-in cart page that lists the specific lines affected by a guest-to-account cart merge (quantity changes, stock caps, removed products, failed additions). It is screen-scoped (not a toast or global notification) and disappears when the shopper dismisses it. Renders nothing while the store's `mergeReport` is empty.

## Key elements

- **`REASON_KEYS`** – Static `Record<MergeLineReason, string>` mapping each merge-line reason (`summed`, `capped`, `cart_full`, `removed`) to its i18n key, kept as literals so a translation audit can verify every key.
- **`titleOf(productId)`** – Resolves a product's localized title via `useProductLines().productOf`; falls back to a generic "unknown product" label when the product is no longer in the catalogue.
- **`watch(mergeReport, …)`** – Fires (immediately, then on every replacement) to call `loadProducts` for the new line set so product data is available. Failures are swallowed silently; the line simply shows the generic label.
- **Template `v-alert`** – A single `v-alert` (Vuetify) with `role="status"` (polite, not the default assertive `alert`) so screen readers announce the whole list once. Each `<li>` carries `data-reason`, `data-kind`, and `data-test` attributes for e2e selectors.
- **`mergeReportKind`** – Imported from `../domain`; classifies a line as `'short'`, `'off-sale'`, etc., driving the conditional chips and advice text shown per line.

## Relationships

- **`src/modules/cart/store.ts`** – Source of the reactive `mergeReport` array (via `storeToRefs`) and the `dismissMergeReport()` action wired to the alert's close button.
- **`src/modules/cart/domain/index.ts`** – Provides `mergeReportKind(line)`, the pure classifier used both for the `data-kind` attribute and the conditional chip logic.
- **`src/modules/cart/components/SignedInCart.vue`** – The parent page that mounts this component on the cart view; the alert lives only within that screen.
- **`src/modules/cart/tests/merge-report-alert.spec.ts`** – Unit tests exercising the component's rendering, dismissal, and per-reason output.

## Notes

- **Accessibility:** `role="status"` is set explicitly to override Vuetify's default `role="alert"`. The warning chips are plain text (no `role`) so they stay inside the single polite live region rather than creating a second announcement.
- **No stock count is ever shown** for short lines — the server does not expose available quantity, so the UI only says "lower before checkout."
- **`loadProducts` is component-scoped**, not the cart page's read, because products that failed to add are absent from the cart and the cart's own fetch would not cover them.
- **`immediate: true`** on the `watch` handles the case where a merge report already exists when the page mounts (e.g., the user navigates back).
- **`data-test` attributes** (`cart-merge-report`, `cart-merge-report-line`, `cart-merge-report-short`) are the stable selectors used by the spec file.

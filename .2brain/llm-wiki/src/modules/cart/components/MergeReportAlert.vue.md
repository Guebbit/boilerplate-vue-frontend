---
source: src/modules/cart/components/MergeReportAlert.vue
sha256: 406aba93c4bbda7c41bd21b5b1e985d1b219224c8cea0939e6b95a2c609eb3f3
generated_at: 2026-10-17T00:33:54.281101+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/components/MergeReportAlert.vue

## Purpose

Renders an inline, closable alert on the cart page that appears after a guest cart has been merged into the account's cart. It lists each affected line—summed quantities, stock-capped lines, removed products, and add failures—so the shopper can verify quantities before checkout. It is screen-local (not a toast or bell notification) and disappears when the shopper dismisses it.

## Key elements

- **`REASON_KEYS`** — Maps each `MergeLineReason` (`summed`, `capped`, `removed`) to a literal i18n key so translation-tooling can enumerate every key statically.
- **`titleOf(productId)`** — Resolves a product's display title via `useProductLines().productOf`; falls back to a generic i18n label when the product is absent (removed from catalogue or fetch not yet resolved).
- **`watch(mergeReport, …)`** — Fires (with `immediate: true`) whenever a new report replaces the old one; calls `loadProducts` to fetch data for lines not already in the cart. The `.catch(() => undefined)` swallows failed reads so those lines simply show the generic label.
- **Template (`v-alert`)** — Conditionally rendered when `mergeReport.length > 0`. Uses `role="status"` (polite live region) rather than Vuetify's default `role="alert"`. Each line is an `<li>` with `data-reason` / `data-kind` attributes; lines classified as `'short'` or `'off-sale'` by `mergeReportKind` get an extra `v-chip` marker and advice text.

## Relationships

- **`src/modules/cart/domain/index.ts`** — Provides `mergeReportKind(line)`, which classifies a merge line as `'short'`, `'off-sale'`, or neither; drives which chip/advice block renders.
- **`src/modules/cart/store.ts`** — Source of `mergeReport` (reactive via `storeToRefs`) and the `dismissMergeReport()` action wired to the alert's close button.
- **`src/modules/cart/views/Cart.vue`** — Parent page that mounts this component; the alert lives on the cart screen only.
- **`src/modules/cart/tests/merge-report-alert.spec.ts`** — Unit/integration tests targeting this component's rendering and dismiss behaviour.

## Notes

- **Accessibility:** The entire alert is a single `role="status"` live region so a screen reader announces the merge once, not per line. The "short" / "off-sale" markers are text + chip, never colour alone.
- **Product reads are component-local:** Products that failed to be added are *not* in the cart, so the cart page's own product read doesn't cover them. This component calls `useProductLines().loadProducts` independently.
- **`immediate: true`** on the watch ensures a report that already exists when the page first mounts still triggers the product fetch.
- **Never shows stock counts.** The server does not report how many units remain, so the alert only says "shorten before checkout" without a number.
- **`data-test` attributes** (`cart-merge-report`, `cart-merge-report-line`, `cart-merge-report-short`, `cart-merge-report-off-sale`) are the stable hooks used by the spec file and E2E tests.

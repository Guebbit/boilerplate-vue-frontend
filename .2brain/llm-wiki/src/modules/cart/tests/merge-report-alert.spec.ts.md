---
source: src/modules/cart/tests/merge-report-alert.spec.ts
sha256: 9ca39fb548fe7bf2e45403286f298b3bc2a477ef80730076db7ff0200c5fde23
generated_at: 2026-10-17T00:41:30.998218+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/merge-report-alert.spec.ts

## Purpose

Isolated component test for `MergeReportAlert.vue`. Verifies the alert's display logic (which lines appear, their wording, the "short" vs "gone" vs "changed" classification), its i18n output, its dismissal behavior, and its assistive-technology contract (single polite live region, axe audit). The products lookup is exercised through the real composable with the network layer stubbed against a small in-memory catalogue.

## Key elements

- **`mountAlert(report)`** – Mounts `MergeReportAlert` with Vuetify + i18n plugins, sets `cart.mergeReport`, and spies on `useProductsStore().fetchProductsByIds` to hydrate from the `catalogue` map. Returns `{ cart, read }`.
- **`aLine(partial)`** – Shorthand to build a `MergeReportLine` with `requested: 2, resulting: 2, availability: 'in_stock'` defaults.
- **`lineTexts()`** – Collects the whitespace-collapsed text of every `[data-test=cart-merge-report-line]` element.
- **`catalogue`** – Module-level `Record<string, Product>` that the fetch stub consults; swapped per-test for i18n / missing-product cases.
- **`describe('what it shows')`** – The bulk of assertions: empty-report invisibility, per-line wording, reason phrasing (`summed` / `capped` / `removed`), short-line marking, the no-stock-digit invariant, combined reason + short, gone-product handling, i18n (en/it), fallback label, fetch-failure resilience, and reactive re-read on report replacement.
- **`describe('closing it')`** – Clicking the dismiss button empties `cart.mergeReport` and removes the alert from the DOM.
- **`describe('for assistive technology')`** – Asserts exactly one `role="status"` live region (no nested `role`/`aria-live`), a titled alert, a named close button, and runs `axe-core` for accessibility violations.

## Relationships

- **`MergeReportAlert.vue`** – The component under test; imported and mounted directly.
- **`store.ts`** (`useCartStore`) – Used to set and assert `mergeReport` state.
- **`domain/index.ts` / `domain/merge-report.ts`** – Source of the `MergeReportLine` type that shapes every fixture line.
- **`fixtures.ts`** (`aProduct`) – Factory for the small product catalogue entries.
- **`wire-modules.ts`** (`wireModulesIntoCore`) – Called once at module scope to register the cart and products modules with the core DI container before any test runs.

## Notes

- The file imports `@/modules/products` (`useProductsStore`) and `@/i18n` (`loadLocale`, `i18n`) — both live outside the `cart` module. Tests that switch locale set `i18n.global.locale.value` directly and restore it in the same `it` block.
- The "no stock number" assertion (`match(/\d+/g)` must equal only the two shopper-visible quantities) is a product-level invariant, not a formatting detail.
- `axe-core` is imported but the truncated file suggests the audit call appears in the a11y suite; if the file is extended, keep the single-live-region assertion alongside it.
- `wireModulesIntoCore()` is called at top level (not in `beforeEach`), so it runs once per test-file load.

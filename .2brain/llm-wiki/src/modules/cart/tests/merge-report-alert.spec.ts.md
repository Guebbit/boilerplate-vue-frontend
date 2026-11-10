---
source: src/modules/cart/tests/merge-report-alert.spec.ts
sha256: bff5dac1dbeac9d90464b0e114b77c76f8245dafd9e37b7e2bedf9653e287506
signature: 821c45779d3eef762fbac18ea4bf4095c70dc6e9c9f39f398ef120ca30006016
generated_at: 2026-11-10T04:08:01.723238+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/merge-report-alert.spec.ts

## Purpose

Isolated Vitest suite for the `MergeReportAlert` component. Verifies what the alert renders for each merge-report line kind (changed, short, gone), that it speaks the reader's locale, that it exposes exactly one polite live region, and that dismissing it empties the store's report. Product lookups exercise the real composable over the real products store, with only the network read layer stubbed to answer from a small in-memory catalogue.

## Key elements

- **`mountAlert(report)`** — Mounts `MergeReportAlert` with a seeded cart store and a stubbed product-read that seeds from the `catalogue` record. Returns `{ cart, read }` after the first async read settles.
- **`aLine(partial)`** — Factory returning a `MergeReportLine` with defaults (`requested: 2, resulting: 2, availability: 'in_stock'`), merged with the caller's overrides.
- **`lineTexts()`** — Collects whitespace-collapsed text from every `[data-test=cart-merge-report-line]` element.
- **`catalogue`** — Module-level `Record<string, Product>` the stubbed read consults; mutated per-test (e.g., replaced for the Italian-title case).
- **Three `describe` blocks** — *"what it shows"* (13 tests covering display, i18n, fallback label, reactivity, read-failure), *"closing it"* (dismiss clears store + removes DOM), *"for assistive technology"* (single `role="status"` live region, labelled dismiss button).

## Relationships

- **`src/modules/cart/components/MergeReportAlert.vue`** — the component under test; mounted via `@vue/test-utils`.
- **`src/modules/cart/store.ts` (`useCartStore`)** — provides the reactive `mergeReport` array the component reads; tests mutate it directly to drive re-render and dismiss assertions.
- **`src/modules/cart/domain/merge-report.ts` / `src/modules/cart/domain/index.ts`** — source of the `MergeReportLine` type and its `reason` / `availability` fields used by `aLine`.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` called at module scope so the Vuetify/i18n plugin chain resolves correctly.
- **`tests/support/unit/fixtures.ts`** — `aProduct` factory used to build the two-item catalogue.
- **`tests/support/unit/axe.ts`** — `axeViolations` imported for accessibility assertions (used in the truncated tail of the file).
- **`src/modules/cart/tests/cart-view.spec.ts`** — sibling spec in the same `tests/` directory; no direct import relationship, but shares the same `store.ts` and domain contracts.

## Notes

- The stubbed read does **not** reject by default; the "read fails" test sets up its own `mockRejectedValue` outside `mountAlert`, so the component must tolerate a failed lookup and fall back to a generic "A product" label.
- The "gone" product (`id: 'gone'`) is deliberately absent from `catalogue` to exercise the fallback path while still appearing in the read call.
- i18n tests mutate `i18n.global.locale` and restore it to `'en'` inline; there is no global `afterEach` reset.
- The `catalogue` variable is **not** reset in `beforeEach` for every test — the Italian-title test reassigns it mid-suite and does not restore it, relying on test ordering.
- `attachTo: document.body` is passed to every mount so that the axe/live-region queries can inspect a connected DOM node.

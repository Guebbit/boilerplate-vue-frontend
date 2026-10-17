---
source: src/modules/cart/domain/merge-report.ts
sha256: 401f8568e835dc1467bac88f71340738493fe0bc07322e99f5258155eb038f0c
generated_at: 2026-10-17T00:36:10.501423+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/merge-report.ts

## Purpose

Pure domain logic that decides which lines from a `POST /cart/merge` response are "news" worth surfacing to the shopper, and classifies each as a kind of alert. It deliberately contains no store access and no markup—just filtering and classification over server-answered lines.

## Key elements

- **`MergeReportLine`** (interface) — The report-facing shape: `productId`, `requested`, `resulting`, optional `reason`, and `availability` (a name, never a stock count).
- **`MergeReportKind`** (type) — `'gone' | 'off-sale' | 'short' | 'changed'`. A priority-ordered union of the four possible alert sentences.
- **`changedMergeLines`** (function) — Filters an array of `MergeLineResult` down to lines where `reason` is set *or* `availability` is neither `'in_stock'` nor `'preorder'`, then maps them into `MergeReportLine[]`, preserving server order.
- **`mergeReportKind`** (function) — Given a `MergeReportLine`, returns the appropriate `MergeReportKind`: `'gone'` for `reason === 'removed'`, `'off-sale'` for `availability === 'unavailable'`, `'short'` for `'insufficient_stock'`/`'out_of_stock'`, otherwise `'changed'`.
- **`isNews`** (internal, not exported) — The single-predicate used by `changedMergeLines`; checks `reason !== undefined` or availability outside `in_stock`/`preorder`.

## Relationships

- **`src/modules/cart/domain/index.ts`** — Barrel file that re-exports `MergeReportLine`, `MergeReportKind`, `changedMergeLines`, and `mergeReportKind` to consumers outside the `domain/` folder.
- **`src/modules/cart/store.ts`** — Imports `changedMergeLines` and `mergeReportKind` to turn raw merge responses into report data held in cart state.
- **`src/modules/cart/tests/merge-report.spec.ts`** — Unit-tests `changedMergeLines` and `mergeReportKind` against representative `MergeLineResult` fixtures.
- **`src/modules/cart/tests/merge-report-alert.spec.ts`** — Exercises the interaction between the kind classification and the alert-copy layer that consumes `MergeReportKind`.
- **`src/modules/cart/tests/cart-view.spec.ts`** — Integrates the report lines into the rendered cart view, asserting which lines appear as alerts.

## Notes

- **Preorder is treated as "buyable."** A clean merge that lands a preorder line with the requested quantity produces no report line. This is the only availability value (besides `in_stock`) that suppresses news.
- **`reason` takes precedence over `availability` in `mergeReportKind`.** A line with `reason: 'removed'` is `'gone'` regardless of its `availability` field; check `reason` first.
- **`isNews` is module-private.** Tests must exercise it through `changedMergeLines`; it cannot be imported directly.
- **No stock numbers.** The module enforces by documentation and type (`LineAvailability` is a string union of names) that a numeric "how many are left" never leaks into the report.

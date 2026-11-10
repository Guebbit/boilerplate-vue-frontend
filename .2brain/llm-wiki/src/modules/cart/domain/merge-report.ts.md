---
source: src/modules/cart/domain/merge-report.ts
sha256: 36ad1695f4b0c9f6ee9f40a774d7d2385fbf643a0f49251b0c7933cd8389bc94
signature: 052e0ec3c9e292ca931d2bf13d88eb946aa3dc0210f68fe2ecdfc6f428b7262a
generated_at: 2026-11-10T03:57:48.910113+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/merge-report.ts

## Purpose

Pure domain logic that decides which lines in a `POST /cart/merge` response are worth surfacing to the shopper and classifies what kind of news each one is. It deliberately excludes stock counts (the server sends a name, never a number) and carries no store or markup dependencies.

## Key elements

- **`MergeReportLine`** (interface) — One reportable line: `productId`, `requested`, `resulting`, optional `reason`, and `availability`.
- **`MergeReportKind`** (type) — `'gone' | 'off-sale' | 'short' | 'changed'`; the severity vocabulary for a report line.
- **`changedMergeLines(lines)`** — Filters a `MergeLineResult[]` down to lines that carry a `reason` or whose `availability` is neither `in_stock` nor `preorder`, then maps them to `MergeReportLine[]` (server order preserved).
- **`mergeReportKind(line)`** — Classifies a single `MergeReportLine` into a `MergeReportKind`: `removed`/`cart_full` → `gone`; `unavailable` → `off-sale`; `insufficient_stock`/`out_of_stock` → `short`; everything else → `changed`.
- **`isNews`** (private) — The predicate behind `changedMergeLines`; a line is "news" if it has a reason or its availability is not `in_stock`/`preorder`.

## Relationships

- **`src/modules/cart/domain/index.ts`** — Barrel file; re-exports the public symbols from this module so consumers import from the domain entry point.
- **`src/modules/cart/store.ts`** — Consumes `changedMergeLines` and `mergeReportKind` to build the user-facing merge-alert state after a merge request.
- **`src/modules/cart/tests/merge-report.spec.ts`** — Unit tests for `changedMergeLines` and `mergeReportKind` against representative `MergeLineResult` fixtures.
- **`src/modules/cart/tests/merge-report-alert.spec.ts`** — Tests the alert rendering path that depends on this module's output.
- **`src/modules/cart/tests/cart-view.spec.ts`** — Integration-level view test that exercises merge-report lines in the full cart view.

## Notes

- **`preorder` is treated as buyable.** A clean merge of a preorder line produces no news; only `in_stock` and `preorder` are "quiet" availabilities.
- **`cart_full` maps to `gone`, not `short`.** The product could not be added at all (no line left in a full cart), so there is no stock question to ask.
- **`isNews` is not exported.** Callers should use `changedMergeLines`; the predicate exists only as an implementation detail.
- **No stock quantities appear in this domain.** `availability` is always a name (`in_stock`, `insufficient_stock`, `out_of_stock`, `unavailable`, `removed`, `preorder`); the numeric "how many left" is intentionally absent.

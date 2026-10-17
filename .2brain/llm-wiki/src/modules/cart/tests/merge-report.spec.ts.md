---
source: src/modules/cart/tests/merge-report.spec.ts
sha256: 45dc28b28f846b9ec8c94ee425e0b911717aa8ea7fb077ef538a99dda1494f37
generated_at: 2026-10-17T00:41:46.117287+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/merge-report.spec.ts

## Purpose
Vitest spec that pins down the two public helpers the cart merge-report flow exposes to the UI layer: *which* merge-result lines are worth surfacing to a shopper (`changedMergeLines`) and *what label* each surfaced line gets (`mergeReportKind`). It exists so that changes to the filtering/classification rules in the domain layer are caught before they alter what the shopper sees.

## Key elements
- **`aLine` (local helper)** – Builds a `MergeLineResult` with safe defaults (`requested: 1`, `resulting: 1`, `availability: 'in_stock'`) and lets each test override only the fields under scrutiny.
- **`describe('changedMergeLines')`** – Five cases:
  - Verifies the filter keeps lines that have a `reason`, `insufficient_stock`, `unavailable`, or `out_of_stock` availability, while dropping lines that landed exactly as asked with `in_stock` *or* `preorder`.
  - Asserts that numeric fields (`requested`, `resulting`) and the `availability` flag are passed through verbatim.
  - Confirms a line that is `insufficient_stock` but landed as asked is still surfaced, yet carries no synthetic `reason`.
  - Empty-array input → empty output.
  - All-lines-OK input → empty output.
- **`describe('mergeReportKind')`** – A `it.each` table of nine flag combinations mapping a single `MergeLineResult` to one of four string kinds: `'gone'`, `'short'`, `'off-sale'`, `'changed'`.

## Relationships
- **`src/modules/cart/domain/index.ts`** – Re-export facade; this spec imports `changedMergeLines` and `mergeReportKind` through `../domain`.
- **`src/modules/cart/domain/merge-report.ts`** – The module that actually implements both functions; this spec is its behavioural contract.
- **`@types` (`MergeLineResult`)** – The shape every fixture in this file conforms to; no local interface is defined.

## Notes
- `preorder` availability is *excluded* from the "changed" set (see p8 in the first test). If that behaviour is later considered a shopper-visible state, both the implementation and this test must change together.
- `mergeReportKind` is a pure classifier on a single line; it does **not** filter. Callers are expected to run `changedMergeLines` first, then label each surviving line with `mergeReportKind`.
- The module-level docblock explicitly states the numeric fields are quantities, not stock counts—useful context when reading the "carries the numbers … untouched" assertion.

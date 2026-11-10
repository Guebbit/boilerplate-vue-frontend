---
source: src/modules/cart/tests/merge-report.spec.ts
sha256: 89c72a40f72f6c889d84f200de6dcfcf19d5d1d9c0de9266fd335c2f674da7b3
signature: ac4ab349be976c50d7d6ffdc04e288260b163987aa0ffdb2c6fd3de58d42583b
generated_at: 2026-11-10T04:08:13.476707+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/merge-report.spec.ts

## Purpose

Vitest spec that pins down two pieces of merge-report domain logic: which lines of a merge answer are "changed" (i.e. visible to the shopper) via `changedMergeLines`, and what severity label (`gone` / `short` / `off-sale` / `changed`) each kept line receives via `mergeReportKind`.

## Key elements

- **`aLine` (local helper)** – Builds a `MergeLineResult` with sensible defaults (`requested: 1`, `resulting: 1`, `availability: 'in_stock'`) and merges in caller overrides. Keeps test cases concise by expressing only the deviation from "landed as asked, fits stock."
- **`describe('changedMergeLines')`** – Five tests covering:
  - Filtering criteria: a line is kept when it has a `reason`, is `insufficient_stock`/`unavailable`/`out_of_stock`, or has `resulting: 0`; `preorder` and clean in-stock lines are dropped.
  - Order preservation (kept lines appear in input order).
  - Pass-through: all fields of a kept line are returned unmodified.
  - A line that is `insufficient_stock` but landed exactly as requested is *not* marked changed (no `reason` assigned).
  - Empty-array input yields empty output.
- **`describe('mergeReportKind')`** – A single `it.each` table (10 rows) that maps a combination of `reason` + `availability` to the expected kind string.

## Relationships

- **`src/modules/cart/domain/index.ts`** – Re-exports `changedMergeLines` and `mergeReportKind`; this spec imports both from that barrel.
- **`src/modules/cart/domain/merge-report.ts`** – Houses the actual implementations of `changedMergeLines` and `mergeReportKind` that these tests exercise.

## Notes

- **Kind priority (observed from test expectations):** `gone` > `off-sale` > `short` > `changed`. A line can carry both a `reason` and a non-in-stock `availability`; the availability flag wins over a mere `reason` (e.g. `summed` + `insufficient_stock` → `short`, not `changed`).
- **`insufficient_stock` alone (no reason) is "short," not "changed."** The `changedMergeLines` filter still includes it, but `mergeReportKind` classifies it one step above `changed`.
- **`preorder` availability is treated as "in stock"** for filtering purposes (not a change) but is *not* covered by the `mergeReportKind` table—treat it as a known gap if adding new availability values.
- **`resulting: 0`** is the sentinel for "could not be added" (reason `removed` or `cart_full`); it classifies as `gone`.

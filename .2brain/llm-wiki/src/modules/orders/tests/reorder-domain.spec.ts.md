---
source: src/modules/orders/tests/reorder-domain.spec.ts
sha256: 8d70d7bdfcad3a719f74b37a547b012efb4ecd388967cd9fc5e84596bc6c27e1
signature: 0008ba4c8c24547b30fb2ec7013336944e0dd59d7fbc2120dbfb2bbc80bad856
generated_at: 2026-11-10T05:04:21.884529+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/reorder-domain.spec.ts

## Purpose

Vitest spec for the `reorderOutcome` domain function. It verifies that reorder results are correctly bucketed into `gone` (removed) and `capped` (summed) lists, and that product names fall back to IDs when a title is missing.

## Key elements

- **`result(productId, reason?)`** — Local helper that builds a minimal `MergeLineResult` with `requested: 1`, `resulting: 1`, `availability: 'in_stock'`. The `reason` field is spread conditionally (`...(reason ? { reason } : {})`) so it is simply absent from the object when no reason is given.
- **`describe('reorderOutcome')`** — Three test cases:
  - *names nothing when every line landed, a sum included* — expects both `gone` and `capped` to be empty arrays when no line is truly removed or capped.
  - *sorts removed and capped lines apart, in the order the answer came* — verifies that `'removed'` reasons populate `gone` and `'capped'` reasons populate `capped`, each preserving the order they appeared in the result array.
  - *falls back to the id when the frozen line has no title* — confirms that an empty-string `title` causes the product `id` to be used in the output list.

## Relationships

- **`src/modules/orders/domain/index.ts`** — Source of the `reorderOutcome` function under test (imported via the relative `../domain` path).
- **`@types`** — Provides the `MergeLineResult` type used by the `result` helper and as the return type of `reorderOutcome`.

## Notes

- The `result` helper uses a conditional spread (`...(reason ? { reason } : {})`) so that `toEqual` comparisons work without a `reason` key present in the expected object.
- The reason strings tested (`'removed'`, `'capped'`, `'summed'`) are the canonical values the domain function uses to classify outcomes; the spec does not test any other reason values.
- The "summed" case in the first test is intentionally included in the result array but does **not** appear in either `gone` or `capped` — it represents a line that was merged into another, not removed or capped.

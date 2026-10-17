---
source: src/modules/orders/domain/export-refusal.ts
sha256: 1f19ec54fa0f982d817796a34a7645327bdf260b6ee0f54b925d20c198ec2173
generated_at: 2026-10-17T01:15:11.008357+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/domain/export-refusal.ts

## Purpose

Classifies the two user-facing failure modes of `GET /orders/export` so the view layer can render distinct, copy-specific messages instead of a generic error. It is a pure, side-effect-free helper that inspects the reject envelope produced by the HTTP layer and returns a discriminated label (or `undefined` for failures the generic message already covers).

## Key elements

- **`ExportRefusal`** (type) — Discriminated union of the two refusal kinds: `'too-large'` and `'rate-limited'`.
- **`exportRefusalOf(error: unknown)`** (function) — Reads `status` and the first entry of `errors[]` from the rejection object. Returns:
  - `'rate-limited'` when `status === 429`.
  - `'too-large'` when `status === 422` **and** the first error's `code` is `'ORDER_EXPORT_TOO_LARGE'`.
  - `undefined` for any other shape or status.

## Relationships

- **`src/modules/orders/domain/index.ts`** — Barrel re-exports `ExportRefusal` and `exportRefusalOf` so consumers import from the domain namespace rather than reaching into individual files.
- **`src/modules/orders/views/OrdersList.vue`** — Calls `exportRefusalOf` on the rejection value to decide which refusal-specific message (or the fallback) to display in the UI.
- **`src/modules/orders/tests/timeline-domain.spec.ts`** — Unit-tests the classification logic against synthetic reject envelopes (429, 422 + code, 422 without the code, non-object inputs, etc.).

## Notes

- The function is intentionally defensive: every property access goes through a type guard before use, so it is safe to pass `undefined`, a string, or an arbitrarily shaped object without throwing.
- `undefined` return is the "no special handling" signal — callers should fall through to their generic error path rather than treating it as a falsy refusal.
- The `422 + ORDER_EXPORT_TOO_LARGE` check requires **both** the status code and the specific error code; a 422 for any other validation failure will correctly return `undefined`.

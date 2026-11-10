---
source: src/modules/orders/domain/export-refusal.ts
sha256: 1f19ec54fa0f982d817796a34a7645327bdf260b6ee0f54b925d20c198ec2173
signature: ef4847abc445141c30881f4818d04d446aa3a81c733ea62624102ac276c5de55
generated_at: 2026-11-10T04:58:42.735134+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/domain/export-refusal.ts

## Purpose

Classifies the two specific failure modes of `GET /orders/export` (oversized filter result, rate-limit exceeded) so the UI can show a targeted message for each, as opposed to a generic error. Pure and side-effect free — it inspects the reject envelope produced by the HTTP layer and returns a token the caller maps to copy.

## Key elements

- **`ExportRefusal`** (type) — union `'too-large' | 'rate-limited'`; the only two refusals with dedicated user-facing copy.
- **`exportRefusalOf(error: unknown): ExportRefusal | undefined`** — inspects `status` and the first entry of `errors[]`:
  - `429` → `'rate-limited'`
  - `422` + first error `code === 'ORDER_EXPORT_TOO_LARGE'` → `'too-large'`
  - anything else → `undefined` (caller falls back to the generic failure message)

## Relationships

- **`src/modules/orders/domain/index.ts`** — barrel file that re-exports `ExportRefusal` and `exportRefusalOf` for consumers importing from the domain path.
- **`src/modules/orders/tests/timeline-domain.spec.ts`** — unit tests that exercise `exportRefusalOf` with various reject envelopes (429, 422 + code, unrelated errors, non-object inputs).
- **`src/modules/orders/views/OrdersList.vue`** — the view that calls `exportRefusalOf` after an export promise rejects and branches on the returned token to pick the specific error string.

## Notes

- The function deliberately returns `undefined` for every status/code combination it does not own; callers must treat that as "use the generic message." It never throws.
- Only the **first** element of `errors[]` is inspected. A 422 with the correct code in a later slot will not match.
- The check order matters: 429 is tested before the 422/code branch, so a hypothetical 422-with-code that also carries a 429 (unlikely but possible in a malformed envelope) would classify as `'rate-limited'`.

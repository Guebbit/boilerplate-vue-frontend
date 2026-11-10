---
source: src/modules/payments/refund-notice.ts
sha256: 7b27a3d06d19c85fb05f72f849498689ac476ce4c882ad827782a6a8d5ddc5f0
signature: a70dc7e96315a1b9761f98d7015b89a9f0a84728b3bc291151b378fc12f80033
generated_at: 2026-11-10T05:12:28.001194+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/refund-notice.ts

## Purpose

Single source of truth for the operator-facing toast shown after a refund request. Centralizes the "what does this refund outcome mean" logic so the payment drawer, order page, and return page all render the same wording and severity without each re-deriving it.

## Key elements

- **`RefundNotice`** (interface) — the output shape: `text` (already-translated string) and `type` (`EToastType.SUCCESS` or `EToastType.WARNING`).
- **`refundNotice(t, refund, settleByHand, doneKey)`** (exported function) — pure, synchronous mapper that picks the toast:
  - `refund.status === 'pending'` → SUCCESS, "recorded" copy.
  - `refund` absent or non-failed (i.e. succeeded) → SUCCESS, using the caller-supplied `doneKey` (varies per screen).
  - `refund.status === 'failed'` → WARNING, composed from the translated `failureReason` and a next-step hint (settle-by-hand vs. auto-retry) determined by whether `settleByHand` includes the refund's `id`.
- **`Translate`** (type) — minimal i18n signature `(key, params?) => string` so callers can pass any compatible function.

## Relationships

- **`use-order-refund.ts`** — the composable that fires the refund request and then calls `refundNotice` to produce the toast for the operator.
- **`PaymentDrawer.vue`** — one of the three calling screens; passes its own `doneKey` and the `settleByHand` actions it re-reads after the request.
- **`refund-notice.spec.ts`** — unit tests covering the pending / succeeded / failed paths and the settle-by-hand vs. retry branching.

## Notes

- The function is **pure** (no I/O, no async). All decisions are driven by the inputs; there is no hidden state.
- Failure-reason translation uses the key pattern `payments-list-page.failure-reason-${reason}`, which couples this module's i18n keys to the *payments-list-page* namespace. Adding a new failure reason means adding a key in that namespace, not here.
- `settleByHand` must be **re-read after the request** (the doc comment calls this out); passing a stale list will misreport the next-step hint.
- When `refund` is `undefined` (server returned 201 but no record), the function falls into the non-failed branch and uses `doneKey`. Callers should ensure `doneKey` is appropriate for that case.

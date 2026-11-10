---
source: src/modules/payments/tests/refund-notice.spec.ts
sha256: b712a860cea2b760697c18062a2f969742c1a58047fc0fb0cf6ac9340c0255e0
signature: b712a860cea2b760697c18062a2f969742c1a58047fc0fb0cf6ac9340c0255e0
generated_at: 2026-11-10T05:16:32.214616+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/refund-notice.spec.ts

## Purpose
Vitest spec that verifies the operator-facing toast message (`text` + `EToastType`) produced by `refundNotice` for each refund outcome: succeeded, pending (hand-paid), failed-with-reason, and failed-without-reason. It pins down which next-action hint ("Mark returned" vs. "retried automatically") appears based on whether the server listed the record as settleable.

## Key elements
- **`wireModulesIntoCore()`** (module-scope, one-time) — wires i18n modules into the core so the `translate` function from `@/i18n` is available to the function under test.
- **`beforeEach(() => loadLocale('en'))`** — resets the active locale to English before each case.
- **`describe('refundNotice')`** — four `it` blocks:
  - *succeeded* → expects `{ text: 'Refund requested', type: EToastType.SUCCESS }`.
  - *pending (hand-paid)* → expects text to contain "Mark returned" and type `SUCCESS`.
  - *failed, reason `'declined'`* → expects `WARNING`, "The bank declined the refund", and "press Mark returned" when the record id is in the settleable list; "retried automatically" when it is not.
  - *failed, no `failureReason`* → expects text to contain "no usable reason given".

## Relationships
- **`src/modules/payments/refund-notice.ts`** — the module under test; the spec imports and exercises its single export `refundNotice(translate, record, settleableIds, localeKey)`.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore`, which registers the i18n plugin so that `translate` resolves real locale strings during the test run.

## Notes
- The fourth argument to `refundNotice` is a locale-key string (e.g. `'payments-list-page.refund-done'`); some cases pass the sentinel `'x'` because the assertion targets the translated text, not the key.
- The settleable-ids array (3rd arg) is the server-provided list of records the operator can act on; the spec asserts that the "Mark returned" hint appears **only** when the record id is present in that list, reinforcing that the client never invents a next step.
- `wireModulesIntoCore()` runs once at import time (module scope), not per-test; a fresh locale load is what resets state between cases.

---
source: tests/e2e/specs/journeys/op33-money-doors-ask-a-fresh-session.cy.ts
sha256: aa7fc5e7d0564e65ec9c66811fbcfc79f24199111a57e8f033836e317870e6de
signature: a3a65ae6898e92cf5baf1927ce3f5e7ab9f7847989bbee2a6266be0bf9e38fa8
generated_at: 2026-11-10T07:16:51.377317+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op33-money-doors-ask-a-fresh-session.cy.ts

## Purpose

End-to-end journey test (OP33) verifying that the shop's "money door" operations—order export, staff-initiated cancellation of paid orders, offline payment recording, and remainder cancellation—trigger a re-authentication dialog once the session outlives the sensitive (900 s) or critical (300 s) window, while a customer cancelling their own order is never challenged regardless of session age. The test is demo-only and relies on advancing the demo backend's clock to simulate passage of time.

## Key elements

- **`PAST_SENSITIVE_MS`** (1 000 000 ms) – travel distance past the 900 s sensitive window; used for the order-export step.
- **`PAST_CRITICAL_MS`** (400 000 ms) – travel distance past the 300 s critical window but within the 600 s access-token lifetime; used for all cancellation / payment steps.
- **`BANK_REFERENCE`** – the reference string the moderator types when recording an offline transfer.
- **`OrderLike` / `CancellationLike`** – minimal typed slices for assertions on order status and return/cancellation records.
- **`answerAs(role)`** – locates the visible re-auth dialog, types the role's password via `cy.accountOf`, submits, and asserts the dialog is gone.
- **`describe('OP33 …')` → single `it`** – one test that walks six sub-steps in sequence:
  1. Manager export asks (401 → re-auth → 200 CSV replay).
  2. Manager cancelling someone's paid order asks.
  3. Customer cancelling their own order does **not** ask.
  4. Moderator recording an offline payment asks.
  5. Moderator cancelling the remainder of a part-shipped order asks.
  6. Manager cancelling their **own** newly-placed order asks (role-based, not owner-based).

## Relationships

- **`tests/support/e2e/steps.ts`** – provides `checkoutAs` (used in step 6 to place a manager's own order) and `eventually` (used in steps 2, 3, 4, 5, 6 to poll API state until the expected status appears).

## Notes

- **Demo-only:** `cy.skipUnlessDemo()` guards the entire test; it will be skipped in non-demo environments.
- **Time travel, not real waits:** session aging is simulated with `cy.travel(ms)`, not `cy.wait`. The test never sleeps in real time.
- **Replay pattern (export):** the first intercepted response is the 401 refusal; after `answerAs`, the *second* response to the same route alias must be 200 with `text/csv`. Both are asserted via separate `cy.wait('@exportOrders')` calls.
- **Role vs. owner:** the re-auth guard keys on the signed-in *role* (manager/moderator), not on whether the actor owns the order. A manager cancelling their own order still triggers the dialog; a customer never does, even past the critical window.
- **Manager has no stored address:** step 6 explicitly creates a billing address via the API before checkout, because staff accounts lack one by default.

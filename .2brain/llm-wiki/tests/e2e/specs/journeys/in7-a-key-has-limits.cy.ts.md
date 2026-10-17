---
source: tests/e2e/specs/journeys/in7-a-key-has-limits.cy.ts
sha256: 8877ccc7d282d435de5020fe6ddfb7c7673e6a60ecef357453e1853395a06491
generated_at: 2026-10-17T02:17:56.723559+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/in7-a-key-has-limits.cy.ts

## Purpose

E2E journey test verifying that an API key is bounded by the permissions of the admin who minted it: it can perform only the single write it was granted, cannot read that write back, cannot touch session-only routes (`/account`, `/api-keys`), and becomes unusable once its expiry passes.

## Key elements

- **`describe('IN7 · A key has limits')`** — single-suite test; `beforeEach` visits `/en`, calls `cy.restore()`, and re-visits to reset state.
- **`it('is refused a permission its minter lacks, writes only what it was given, and expires')`** — one long test covering the full story:
  - Attempts to mint a key with `read:ObservabilitySnapshot` (a permission no shop-role admin holds); asserts the form rejects it (`secret-reveal` absent).
  - Mints a key with `create:WebhookSubscription`, extracts the secret, then uses it to POST a webhook subscription (expects 201).
  - Asserts the key gets 403 on `GET /webhooks/subscriptions`, 401 on `GET /account` and `POST /api-keys`.
  - Verifies the admin's UI shows the subscription and the key row as used + active.
  - If not in `liveProfile`, advances the backend clock 2 h via `cy.travel`, asserts the key is refused (401), then fakes the browser clock with `cy.clock` and asserts the UI shows "Expired".
- **`HOUR_MS`** — 3 600 000 ms; used for both the key's TTL and the clock-jump offset.
- **`NOT_THE_ADMINS` / `GIVEN`** — the out-of-scope permission and the single granted permission, respectively.
- **`KEY_NAME`** — timestamp-suffixed to avoid collisions across runs on a shared backend.
- **`subscribed`** — module-level `let`, set from `seededSubscription().url` to build a valid webhook target on the demo receiver's origin.

## Relationships

- **`tests/support/e2e/harness.ts`** — provides `requestWithKey(secret, method, path, body)` used for every key-authenticated API call in the test (the 201 write, the 403 read-back, the 401 session-route probes, and the post-expiry refusal).
- **`tests/support/e2e/integrator.ts`** — provides `datetimeLocalIn(ms)` to fill the form's expiry field and `seededSubscription()` to obtain a pre-seeded webhook URL on the demo receiver, which the test then appends a unique path to.

## Notes

- The expiry steps are gated behind `cy.env('liveProfile')`; they run only on the demo backend because `cy.travel` moves the backend clock, which live cannot do.
- The UI "Expired" badge reads the **browser** clock. `cy.travel` does not affect it, so the test wraps the final page load in `cy.clock(Date.now() + 2*HOUR_MS, ['Date'])` to make the browser agree.
- `subscribed` is a module-scoped mutable `let`, not a per-test local; it is set inside the first `then` callback before the write step.
- The test requires the `account`, `api-keys`, and `webhooks` modules (per the `requires-module` comment) to be present in the running app.

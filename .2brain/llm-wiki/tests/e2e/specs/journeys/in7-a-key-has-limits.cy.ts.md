---
source: tests/e2e/specs/journeys/in7-a-key-has-limits.cy.ts
sha256: 5ad6f27b512e599803c18b3a043b1394603f4a34c02ffe9c3385786b0c2ad1e4
signature: 5ad6f27b512e599803c18b3a043b1394603f4a34c02ffe9c3385786b0c2ad1e4
generated_at: 2026-11-10T07:09:55.125831+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/in7-a-key-has-limits.cy.ts

## Purpose

End-to-end journey test (IN7) verifying the full lifecycle of API-key limits: a key cannot hold permissions its minter lacks, it can perform only the single write it was granted (not even read it back), it cannot touch session-only routes, and it stops working once its expiry passes. The expiry assertions run only on the demo backend because they rely on `cy.travel` to advance the server clock.

## Key elements

- **`requestWithKey`** (imported from harness) — issues authenticated API requests bearing the minted key's secret, used for every "key acts" assertion.
- **`datetimeLocalIn`** (imported from integrator) — produces the `<input type="datetime-local">` string for the expiry field one hour out.
- **`seededSubscription`** (imported from integrator) — resolves the demo receiver's origin so the test can build a valid webhook subscription URL.
- **`HOUR_MS`** — the key's lifetime; the clock jumps `2 × HOUR_MS` to trigger expiry.
- **`NOT_THE_ADMINS`** (`read:ObservabilitySnapshot`) — a platform-level permission no shop role carries, used to prove the mint is refused.
- **`GIVEN`** (`create:WebhookSubscription`) — the single write permission the valid key receives.
- **`KEY_NAME`** — timestamp-suffixed identifier so parallel runs on one backend don't collide.
- **`subscribed`** — module-level mutable holding the concrete webhook URL derived from the seed; set once inside the test before the write step.
- **Single `it` block** — walks through: refused mint → valid mint with one write → successful POST → denied GET / session routes → admin UI confirms usage → (demo only) `cy.travel` past expiry → 401 on write → `cy.clock` + reload shows "Expired" in the list.

## Relationships

- **`tests/support/e2e/harness.ts`** — provides `requestWithKey`, which the test calls with the key's secret, an HTTP method, a route path, and an optional body to assert status codes (201, 403, 401) on API routes without a browser session.
- **`tests/support/e2e/integrator.ts`** — provides `datetimeLocalIn` (formats the expiry input value from a millisecond offset) and `seededSubscription` (resolves the demo webhook receiver's URL so the test can build an address the SSRF guard permits).

## Notes

- The file declares `requires-module: account, api-keys, webhooks`; the test will not pass if any of those backend modules are absent.
- Expiry steps are gated on `liveProfile !== true`; in live the story ends at the session-only-route assertions.
- After `cy.travel(2 * HOUR_MS)` the admin's 30-minute staff session has lapsed, so the test must call `cy.switchUser('admin')` before reloading the key list.
- The "Expired" chip reads the **browser** clock, which `cy.travel` does not affect; the test therefore installs `cy.clock(Date.now() + 2 * HOUR_MS, ['Date'])` and reloads the page to get the UI to reflect expiry.
- `subscribed` is a module-scoped `let`, not a closure variable—this is intentional so the write step and the "late" write step reference the same base URL without re-reading the seed.

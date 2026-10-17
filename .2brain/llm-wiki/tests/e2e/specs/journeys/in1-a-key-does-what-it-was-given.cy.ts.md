---
source: tests/e2e/specs/journeys/in1-a-key-does-what-it-was-given.cy.ts
sha256: 2c42ac9e2abb535f3a9f2ea4ec3d2061ecff54219f551c34b9f5c57fb91d3c5c
generated_at: 2026-10-17T02:17:05.553132+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/in1-a-key-does-what-it-was-given.cy.ts

## Purpose

End-to-end test (journey **IN1**) that verifies an API key can perform exactly the scope it was minted with and nothing more. It walks through the full lifecycle: admin creates a key with a single `read:WebhookSubscription` permission and a one-day expiry, the secret is revealed once and hidden thereafter, the key successfully reads, is refused a write, and is rejected entirely once revoked.

## Key elements

- **`GIVEN`** – the single permission granted to the test key (`read:WebhookSubscription`). Chosen deliberately over `display:Product` because product reads are guest-scoped and would not prove the key was recognized.
- **`DAY_MS`** – 24 h in milliseconds; sets the key's expiry to "tomorrow".
- **`KEY_NAME`** – `in1-reader-<epoch-ms>`; makes each run's key row unique so parallel or repeated runs on one backend never collide.
- **`A_WRITE`** – a `POST /webhooks/subscriptions` body the key is *not* permitted to create; used to assert a 403.
- **`describe / it` block** – one test case with five logical steps (mint → secret-shown-once → read-works / write-refused → last-used updated → revoked-and-dead). Uses `requestAsGuest`/`requestWithKey` for API-level assertions and `cy` DOM commands for the admin UI.

## Relationships

- **`tests/support/e2e/harness.ts`** – supplies `requestAsGuest` (unauthenticated API call, expects 401) and `requestWithKey` (attaches the secret as a bearer, asserts the key's scoped response).
- **`tests/support/e2e/integrator.ts`** – supplies `datetimeLocalIn(ms)`, which returns a `datetime-local`-formatted string offset from now; used to fill the key-expiry input field.
- **`tests/support/e2e/steps.ts`** – supplies `eventually(pollFn, predicate)`, a retry loop that waits until an async state (here, `lastUsedAt` appearing in the admin key list) becomes observable.

## Notes

- The file header declares `requires-module: api-keys, webhooks`; both feature modules must be enabled on the backend or the test will fail at the form-creation step.
- The permission choice is load-bearing: `display:Product` would pass even for a guest (the endpoint scopes by session, and a key has none), so it cannot distinguish "key recognized" from "guest fallback." `read:WebhookSubscription` has no guest path, making a 200 a true positive for key recognition.
- `eventually` is used because the `lastUsedAt` stamp is written asynchronously by the API layer after the first authenticated request; a single `cy.apiAs` poll would race.
- The test asserts the secret is **absent** from the DOM both immediately after the reveal step and after a page reload, guarding against accidental persistence in the key list.

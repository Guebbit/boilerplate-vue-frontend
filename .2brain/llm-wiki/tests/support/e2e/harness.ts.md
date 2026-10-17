---
source: tests/support/e2e/harness.ts
sha256: 430b75ee590b1e082cb49f59c2df249fa8f72d401d6453c53fe44829fc410f95
generated_at: 2026-10-17T02:25:32.302427+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/harness.ts

## Purpose

Typed wrapper functions over `cy.task` calls that give E2E specs a clean, compiler-checked interface to the Node-side harness (second-device login, API-key calls, guest calls, payment-webhook posting, and webhook capture/verification). The actual logic lives in `scripts/e2e/`; this file only names what each task returns so a spec can chain on a concrete type.

## Key elements

- **Type re-exports** – `Device`, `DeviceResponse`, `SessionMode`, `PaymentWebhookEvent`, `SinkRequest`, `ReceivedWebhook` (all from `scripts/e2e/*`) so spec files import from one place.
- **`skipUnlessSessionMode(context, mode)`** – Skips the current test unless `E2E_SESSION_MODE` matches the given mode.
- **`loginDeviceWith(email, password)`** – Server-side login returning a `Device`; for accounts the seed does not know.
- **`loginDevice(role?)`** – Resolves a seeded role via `cy.accountOf` then delegates to `loginDeviceWith`.
- **`refreshDevice(device)`** – `POST /account/refresh` (jwt) or `GET /account` (cookie); non-2xx is a valid answer.
- **`requestAsDevice(device, method, path, body?)`** – One bearer-token API call from Node; non-2xx is a valid answer.
- **`postPaymentWebhook(event, timestamp?)`** – Signs a payment-provider event and POSTs it to `/payments/webhook`; returns the HTTP status.
- **`webhookSink`** – Object with `.clear()` and `.requests()` for the demo-hosted sink (must be cleared before triggering a delivery).
- **`totpCodeFor(secret, stepsFromNow?)`** – Computes the TOTP code for a base32 secret; step is monotonically increasing (backend rejects reuse).
- **`requestWithKey(credential, method, path, body?)`** – Bearer call with an `sk_…` API key; internally builds a fake `Device` and delegates to `requestAsDevice`.
- **`requestAsGuest(method, path)`** – Unauthenticated call; returns only the HTTP status.
- **`forgetWebhooks()`** – Clears captured webhooks on the demo sink; no-op on live (webhook-tester keeps session history).
- **`webhooksReceived(subscriptionUrl)`** – Returns `ReceivedWebhook[]` for a subscription, branching on `liveProfile` (live: `webhook-tester` task; demo: filter sink by pathname).
- **`signatureVerifies(received, secret)`** – Validates a webhook signature against a `whsec_…` secret (any entry in a `v1,` list matching suffices).

## Relationships

- **`scripts/e2e/device-session.ts`** – Source of `Device`, `DeviceResponse`, `SessionMode` types and the `deviceLogin` / `deviceRefresh` / `deviceRequest` tasks.
- **`scripts/e2e/payment-webhook.ts`** – Source of `PaymentWebhookEvent` type and the `postPaymentWebhook` task.
- **`scripts/e2e/webhook-sink.ts`** – Source of `SinkRequest` type and the `webhookSinkClear` / `webhookSinkRequests` tasks (demo profile only).
- **`scripts/e2e/webhook-tester.ts`** – Source of `ReceivedWebhook` type and the `webhookTesterRequests` task (live profile).
- **`./scenario`** (sibling) – Provides `E2ERole` used by `loginDevice`.
- **All listed spec files** (`*.cy.ts` journeys, `auth.cy.ts`, `profile.cy.ts`, `harness.cy.ts`) – Import these wrappers as their primary interface to the harness; none of them call `cy.task` directly.

## Notes

- All exports are **plain functions**, not custom Cypress commands. They return `Cypress.Chainable<T>` with an explicit type parameter, so specs get full autocompletion on the resolved value.
- **Non-2xx is an answer, not a failure.** `refreshDevice`, `requestAsDevice`, `requestWithKey`, and `requestAsGuest` never reject on 4xx/5xx; journeys assert on the returned status.
- **TOTP step monotonicity.** The backend accepts each step exactly once. Enrolment confirms at step 0; subsequent authenticator confirmations must increment.
- **`skipUnlessSessionMode` requires a regular `function` keyword** in the spec (not an arrow) because it uses Mocha's `this` as the `context` parameter.
- **`webhooksReceived` and `forgetWebhooks` branch on the `liveProfile` env var.** On live, the sink is bypassed entirely and `webhook-tester` is queried by subscription URL; on demo, the sink is cleared and filtered by pathname.
- **`requestWithKey` fabricates a `Device`** (`mode: 'jwt'`, empty `cookie`) and delegates to `requestAsDevice` — no separate task is needed.

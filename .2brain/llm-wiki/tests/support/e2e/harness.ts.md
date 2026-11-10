---
source: tests/support/e2e/harness.ts
sha256: 515f759c1d1eef6fdc00c36807d9fe0aede20cd5c8d5f8db97e1871bbf13c4ca
signature: ca9dbd37518794b4b43bd741e5048f1353fd474eced8f0d8fb02909d5a1ed143
generated_at: 2026-11-10T07:30:43.627264+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/harness.ts

## Purpose

Typed helper functions that let E2E specs drive the Node-side test harness — a second browser device, unauthenticated or API-key calls, payment-webhook delivery, webhook capture, TOTP generation, and simulated multi-tab sessions. Each function wraps a `cy.task` call (registered in `cypress.config.ts`) and returns a `Cypress.Chainable` with a concrete return type so specs stay fully typed without learning the task names.

## Key elements

- **`skipUnlessSessionMode(context, mode)`** – Skips the current test via Mocha `context.skip()` unless `cy.env('sessionMode')` matches the given `SessionMode`. Requires the spec to be a regular `function` so `this` is the Mocha context.
- **`loginDevice(role)` / `loginDeviceWith(email, password, totpSecret?)`** – Perform a server-side login that returns a `Device` object (token + cookie) without touching the page's own session cookie. `loginDevice` resolves credentials from the seeded role via `cy.accountOf`.
- **`refreshDevice(device)`** – Calls the device's refresh endpoint (`POST /account/refresh` in JWT mode, `GET /account` in cookie mode). A 401 is a valid assertion target, not a test failure.
- **`requestAsDevice(device, method, path, body?)`** – Single API call using the device's bearer token. Non-2xx statuses are returned, not thrown.
- **`requestWithKey(credential, method, path, body?)`** – API-key (`sk_…`) call from Node, so no browser cookie is attached. Internally delegates to `requestAsDevice` with a synthetic device.
- **`requestAsGuest(method, path)`** – Credential-less call; returns the HTTP status number.
- **`postPaymentWebhook(event, timestamp?)`** – Signs a `PaymentWebhookEvent` and POSTs it to `/payments/webhook/fake`. Returns the backend's HTTP status.
- **`webhookSink.clear()` / `.requests()`** – Demo-profile-only sink controls: reset captured requests and list them with `signatureValid` already computed.
- **`forgetWebhooks()`** – Clears the demo sink or is a no-op on the live `webhook-tester` (which keeps per-session history).
- **`webhooksReceived(subscriptionUrl)`** – Returns captured webhooks for one subscription. Branches on `cy.env('liveProfile')`: live reads from `webhook-tester` by session key; demo filters the sink by URL pathname.
- **`signatureVerifies(received, secret)`** – Checks whether any `v1,` entry in the signature header matches the given `whsec_…` secret (supports rotation rings).
- **`totpCodeFor(secret, stepsFromNow?)`** – Generates the TOTP code for a base32 secret at the given 30-second step offset. The backend accepts each step only once, so enrolment confirms at step 0 and subsequent codes must advance.
- **`otherTab.post(message)` / `.signIn(role)`** – Simulates a second browser tab via `BroadcastChannel('session')`. `signIn` performs a real `POST /account/login` (cookies land in the shared jar) then posts a `{ type: 'login' }` message so the app re-reads the session without a reload.
- **`failRefundsOf(orderId, reason)`** – Demo-only: steers all refunds for an order to fail with the given provider code, or passes them through when `reason` is `null`. Asserts a 204.
- **Type re-exports** – `Device`, `DeviceResponse`, `SessionMode`, `PaymentWebhookDispute`, `PaymentWebhookEvent`, `SinkRequest`, `ReceivedWebhook` are re-exported so specs import them from this single module.

## Relationships

- **`scripts/e2e/device-session.ts`** – Provides the `deviceLogin`, `deviceRefresh`, `deviceRequest` task implementations and the `Device`/`DeviceResponse`/`SessionMode` types.
- **`scripts/e2e/payment-webhook.ts`** – Provides the `postPaymentWebhook` task logic and the `PaymentWebhookEvent`/`PaymentWebhookDispute` types.
- **`scripts/e2e/webhook-sink.ts`** – Provides the demo sink (`webhookSinkClear`, `webhookSinkRequests`) and the `SinkRequest` type.
- **`scripts/e2e/webhook-tester.ts`** – Provides the live receiver (`webhookTesterRequests`, `webhookSignatureValid`) and the `ReceivedWebhook` type.
- **`tests/e2e/specs/harness.cy.ts`** – Exercises the harness helpers directly as a smoke test of the task wiring.
- **`src/modules/account/tests/e2e/auth.cy.ts`**, **`src/modules/account/tests/e2e/profile.cy.ts`** – Account-module E2E specs that import these helpers (e.g. `loginDevice`, `otherTab`) to drive multi-device and multi-tab scenarios.
- **`tests/e2e/specs/journeys/ac2-authenticator-app.cy.ts`**, **`ac4-my-laptop-was-stolen.cy.ts`**, **`ac12-my-privacy-choices-stick.cy.ts`**, **`ac13-my-password-start-to-finish.cy.ts`**, **`ac14-my-details-and-my-picture.cy.ts`**, **`ac17-copied-session-cookie.cy.ts`**, **`ac21-it-was-not-me.cy.ts`**, **`ac25-what-i-agreed-to.cy.ts`** – Journey specs that import the helpers (`loginDevice`, `requestAsDevice`, `webhooksReceived`, `skipUnlessSessionMode`, `failRefundsOf`, etc.) to script their respective end-to-end flows.

## Notes

- All helpers are **plain functions returning `Cypress.Chainable<T>`**, not registered `cy` commands. Call them as `harness.loginDevice('user').then(…)`, not `cy.loginDevice(…)`.
- A non-2xx HTTP response from `refreshDevice`, `requestAsDevice`, `requestWithKey`, or `requestAsGuest` is a **valid answer** the spec asserts against — it does not throw.
- `webhookSink` is **demo-profile only**; guard with `cy.skipUnlessDemo()`. The `forgetWebhooks` / `webhooksReceived` helpers branch on `cy.env('liveProfile')` to transparently switch between the sink and the `webhook-tester`.
- `otherTab` creates a **second** `BroadcastChannel` instance on the same `'session'` name. A `BroadcastChannel` never receives its own posts, so the app's instance (module-private) hears the message but the helper's instance does not.
- `requestWithKey` reuses `requestAsDevice` under the hood by constructing a synthetic `{ mode: 'jwt', token: credential, cookie: '' }` device.
- TOTP is **step-sensitive**: the backend rejects a repeated step, so consecutive codes must use increasing `stepsFromNow` values.

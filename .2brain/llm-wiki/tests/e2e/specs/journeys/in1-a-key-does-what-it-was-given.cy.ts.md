---
source: tests/e2e/specs/journeys/in1-a-key-does-what-it-was-given.cy.ts
sha256: 6e013f1e4f9ca09436cdf3bb1013d58c99f5542131fcb8fca69e349e4c3c91b8
signature: 724504d78d99d43988710bf861d5723f3c342b2f58ae5f1cb442c611d47d1c9f
generated_at: 2026-11-10T07:08:34.536030+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/in1-a-key-does-what-it-was-given.cy.ts

## Purpose

E2E journey test (IN1) that verifies an API key's permission boundary end-to-end: the admin mints a read-only key (`read:WebhookSubscription`) with a one-day expiry, the secret is shown once and then never appears again, the key successfully reads but is refused a write it was not granted, and after revocation the key authenticates nothing. Also covers the notification mail (secret never leaked) and the "logout everywhere" action that bulk-revokes admin-minted keys.

## Key elements

- **`GIVEN`** — the single permission string `'read:WebhookSubscription'`; deliberately chosen because a guest *cannot* make this read, so a 200 proves the key was recognised.
- **`DAY_MS`** — one day in milliseconds; used as the key's expiry window.
- **`KEY_NAME`** — timestamp-suffixed name (`in1-reader-${Date.now()}`) so concurrent runs on one backend never collide.
- **`A_WRITE`** — a minimal webhook-subscription payload the key is *not* allowed to create (tests the 403 path).
- **`describe` / `it` block** — a single test that walks through: mint → secret shown once → guest denied → key read (200) → key write (403) → last-used updated → revoke → key read (401) → mint second key → logout-everywhere → second key read (401) → mail sent.

## Relationships

- **`tests/support/e2e/harness.ts`** — imports `requestAsGuest` (unauthenticated API call, expects 401) and `requestWithKey` (authenticated-with-secret call, expects 200/403/401 depending on step).
- **`tests/support/e2e/integrator.ts`** — imports `datetimeLocalIn` to compute a future `datetime-local` value for the expiry input field.
- **`tests/support/e2e/steps.ts`** — imports `eventually` to poll the admin API until `lastUsedAt` is set on the key row.
- **`scripts/e2e/mail-filters.ts`** — imports `byTemplate` to match incoming mail by a template identifier (used for both the mint and revoke notification checks).
- **`scripts/e2e/mail-message.ts`** — imports `mailMentions` to assert the mail references the key name and to assert it does *not* contain the secret.

## Notes

- **Requires modules** `api-keys` and `webhooks` (declared in the `requires-module` comment).
- The permission choice is deliberate: `display:Product` would prove nothing because `GET /products/:id` is session-scoped and a key has no session; `read:WebhookSubscription` is a read only a keyed request can make.
- Status codes are semantically distinct: **401** = no valid key (guest or revoked), **403** = valid key but missing the required write permission.
- `beforeEach` runs `cy.visit → cy.restore → cy.visit` to guarantee a clean session before each test.
- The "secret shown once" assertion includes a full page reload to confirm the secret is not persisted in DOM or local state.
- After revocation the row's `[data-test=row-revoke]` button is removed from the DOM (no second revoke possible).

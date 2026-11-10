---
source: src/modules/webhooks/tests/schemas.spec.ts
sha256: 749bbe5faa469b2a04f9d5a0bc10f65d85b32c89da6d04e20715d3d810a5e30f
signature: 0380ea55b6706cf7d2f711628ad780c108099c21d612cf0cda0a58fb5134e199
generated_at: 2026-11-10T06:15:35.431362+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/schemas.spec.ts

## Purpose

Vitest spec that validates the **structural rules** (not i18n messages) of the webhook subscription create and edit Zod schemas. It pins down what payloads are accepted or rejected so that schema changes are caught immediately.

## Key elements

- **`validSubscription`** — module-level constant holding the minimal valid `{ url, eventTypes }` payload; every test mutates one field from this baseline.
- **`describe('webhookCreateSchema')`** — covers: minimal valid payload, optional `description`, URL format rejection (`it.each` for `not-a-url`, `ftp://`, `''`), HTTPS-only enforcement, non-empty `eventTypes` requirement, and multiple event types.
- **`describe('webhookEditSchema')`** — confirms the edit schema accepts the create fields and asserts that `enabled` is **not** part of the edit shape (toggling a subscription on/off is not considered an edit).
- **`describe('webhookCreateSchema description bound')`** — verifies that a `description` exceeding `createWebhookSubscriptionBodyDescriptionMax` (imported from `@api/schemas`) is rejected.

## Relationships

- **`src/modules/webhooks/schemas.ts`** — the system under test; the spec imports `webhookCreateSchema` and `webhookEditSchema` directly and exercises their `.safeParse` behavior and `.shape` keys.

## Notes

- The file header comment explicitly separates this spec from `schemas-i18n.spec.ts`: this file tests **rules** (shape, format, bounds); the sibling file tests **messages** (error text). Don't conflate them when adding assertions.
- `createWebhookSubscriptionBodyDescriptionMax` comes from the `@api/schemas` package, so the max-length bound is a **shared API contract**, not a local constant. Changing the contract there will break this test.
- The `webhookEditSchema` "no `enabled`" assertion inspects `schema.shape` keys directly rather than attempting a parse — it is a structural check, not a behavioral one.

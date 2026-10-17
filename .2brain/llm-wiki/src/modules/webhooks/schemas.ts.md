---
source: src/modules/webhooks/schemas.ts
sha256: efe1de2c8c07486eb1d79c40557329476b66890f148a3b723dd766d456eb5afb
generated_at: 2026-10-17T01:50:57.327726+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/schemas.ts

## Purpose

Defines Zod validation schemas for the webhook subscription create/edit forms. Error messages are i18n thunks resolved at parse time, and the HTTPS scheme check reuses a contract-generated regex from `@api/schemas` rather than a hand-rolled refine.

## Key elements

- **`webhookUrlSchema`** (internal) — `z.url()` + `.regex(createWebhookSubscriptionBodyUrlRegExp)`; enforces syntactic validity and the `https://` scheme requirement.
- **`webhookEventTypesSchema`** (internal) — `z.array(z.string()).min(1)`; requires at least one event type.
- **`webhookCreateSchema`** (exported) — object schema: `url`, optional `description`, `eventTypes`. No `enabled` field (subscriptions are always created enabled).
- **`webhookEditSchema`** (exported) — `webhookCreateSchema.extend({ enabled: z.boolean() })`; same fields plus a toggle.

## Relationships

- **`src/modules/webhooks/tests/schemas.spec.ts`** — unit-tests the validation rules and pass/fail cases for both exported schemas.
- **`src/modules/webhooks/tests/schemas-i18n.spec.ts`** — verifies that error-message thunks resolve through `translate()` to the expected i18n keys.
- **`src/modules/webhooks/views/WebhookCreate.vue`** — consumes `webhookCreateSchema` to validate the create form before dispatch.
- **`src/modules/webhooks/views/WebhookEdit.vue`** — consumes `webhookEditSchema` to validate the edit form.

## Notes

- Error messages are **thunks** (`() => translate(...)`), so the locale is read at parse time. This means the active locale at the moment of validation determines the message, not the locale at module-load time.
- The HTTPS regex comes from the **generated contract** (`createWebhookSubscriptionBodyUrlRegExp`). There is intentionally no `.refine()` for the scheme; if the contract's pattern changes, the regex import follows automatically.
- `eventTypes`' `.min(1)` is written inline because the generated contract exposes no named constant for that bound.
- `webhookEditSchema` is derived via `.extend()`, so adding a field to `webhookCreateSchema` automatically propagates to the edit schema.

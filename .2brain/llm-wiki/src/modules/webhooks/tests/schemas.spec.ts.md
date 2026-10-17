---
source: src/modules/webhooks/tests/schemas.spec.ts
sha256: 17aa043b441ecda6de6db94e17a67e9689b87e42a2c257103e6700b1222132ad
generated_at: 2026-10-17T01:51:51.714888+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/schemas.spec.ts

## Purpose

Vitest spec that validates the *rules* (allowed/disallowed values) of the webhook create and edit Zod schemas. It deliberately excludes i18n message assertions, which live in a companion `schemas-i18n.spec.ts`.

## Key elements

- **`validSubscription`** – minimal passing fixture (`url` + `eventTypes`) spread into each test so only one field is mutated at a time.
- **`describe('webhookCreateSchema')`** – asserts the create schema:
  - accepts a minimal valid payload and an optional `description`;
  - rejects non-URL, `ftp://`, empty-string, and **`http://`** URLs (HTTPS-only rule);
  - rejects an empty `eventTypes` array;
  - accepts multiple event types.
- **`describe('webhookEditSchema')`** – asserts the edit schema:
  - accepts create fields **plus** `enabled: boolean`;
  - *requires* `enabled` (unlike create), so the same `validSubscription` fixture now fails.

## Relationships

- Imports `webhookCreateSchema` and `webhookEditSchema` from **`src/modules/webhooks/schemas.ts`**. All assertions in this file are `.safeParse(...)` calls against those two exports; no other runtime dependency.

## Notes

- The module docstring explicitly carves out i18n message testing to `schemas-i18n.spec.ts`—don't add message-content assertions here.
- `http://` is a syntactically valid URL but is rejected; the rule is HTTPS-only, not just "valid URL."
- `webhookEditSchema` enforces `enabled` as **required**, not optional—this asymmetry with the create schema is intentional and is the whole point of the last two tests.

---
source: src/modules/webhooks/tests/e2e/roles.cy.ts
sha256: 8b60d09ae4f226eeed0cc5c693b76257425cb3b231595c9467f5e5ccf4393b21
signature: 8b60d09ae4f226eeed0cc5c693b76257425cb3b231595c9467f5e5ccf4393b21
generated_at: 2026-11-10T06:14:32.851763+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/e2e/roles.cy.ts

## Purpose

Declares the list of webhook pages (subscriptions, subscription create, deliveries) that must be verified for correct role-based access. It is the "case list" that feeds the shared `sweepRoles` helper; keeping it co-located with the webhooks module means deleting the module also removes its sweep.

## Key elements

- **`sweepRoles('webhooks', [...])` call** — registers three page entries under the `"webhooks"` scope so the helper can walk every persona against each route.
- **`subscriptions` entry** — route `/en/webhooks/subscriptions`, requires `['read', 'WebhookSubscription']`, includes a `menuHref` and `pageRoot` (`#webhooks-list-page`).
- **`subscription create` entry** — route `/en/webhooks/subscriptions/create`, requires `['create', 'WebhookSubscription']`, `pageRoot` is `#webhook-create-page`.
- **`deliveries` entry** — route `/en/webhooks/deliveries`, requires `['read', 'WebhookSubscription']`, includes a `menuHref` and `pageRoot` (`#webhook-deliveries-page`).

## Relationships

- **`tests/support/e2e/role-sweep.ts`** — exports `sweepRoles`, the single function this file imports. The helper owns the iteration logic over personas and assertions; this file only supplies the page/permission data.

## Notes

- `menuHref` is optional per entry (absent on the "subscription create" page) — the helper likely skips the nav-menu assertion when it is not provided.
- The `can` array encodes a `[verb, resource]` permission pair; both list pages use `read` while the create page uses `create` on the same `WebhookSubscription` resource.
- The file is a `@module` (no named exports); it has side effects (registers the sweep) and is discovered by Cypress via its `.cy.ts` extension.

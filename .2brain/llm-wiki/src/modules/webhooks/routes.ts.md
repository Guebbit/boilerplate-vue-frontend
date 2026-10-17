---
source: src/modules/webhooks/routes.ts
sha256: feff0bcc6016c68bcbde5c7b04be5117af97a4e2d410702e5e71121efe870dc5
generated_at: 2026-10-17T01:50:48.926350+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/routes.ts

## Purpose

Defines the route table for the webhooks module. Each entry pairs a URL path with a lazy-loaded Vue view and a `meta` object (access level, resource permission, i18n title) that the app's router guard evaluates before rendering the view. This file exists so that navigation, authorization, and page-title display for all webhook screens are declared in one place.

## Key elements

- **Default export** — An array of five `RouteRecordRaw` objects (`satisfies RouteRecordRaw[]`), the sole public export of this module.
- **Routes** (all require `access: 'auth'`):
  - `WebhooksList` — `webhooks/subscriptions` → `WebhooksList.vue`, permission `read WebhookSubscription`
  - `WebhookCreate` — `webhooks/subscriptions/create` → `WebhookCreate.vue`, permission `create WebhookSubscription`
  - `WebhookTarget` — `webhooks/subscriptions/:id` → `WebhookTarget.vue`, permission `read WebhookSubscription`, `props: true`
  - `WebhookEdit` — `webhooks/subscriptions/:id/edit` → `WebhookEdit.vue`, permission `update WebhookSubscription`, `props: true`
  - `WebhookDeliveries` — `webhooks/deliveries` → `WebhookDeliveries.vue`, permission `read WebhookSubscription`
- **`meta.can`** — Two-element tuple `[action, resource]` checked by the router guard; distinguishes read vs. create vs. update on `WebhookSubscription`.
- **`meta.title`** — i18n key used to set the page title; pattern `webhook(s)-{name}-page.page-title`.

## Relationships

- **`src/modules/webhooks/module.ts`** — Imports this default export to register the five routes under the app's module-based routing tree.
- **`src/modules/webhooks/tests/routes.spec.ts`** — Consumes the default export to assert route paths, names, meta permissions, and lazy-load targets.

## Notes

- Route order matters: `subscriptions/create` is declared **before** `subscriptions/:id` so the literal segment is not swallowed by the parameterized path.
- `props: true` is set only on the two `:id` routes; the list/create/deliveries routes do not receive route params as props.
- All views are loaded via dynamic `import()` — they are not bundled into the initial chunk.
- The `can` tuple is the single authorization gate; there is no `role` field in `meta`. A read-only role can reach `WebhooksList` and `WebhookDeliveries` but will be blocked from `WebhookCreate`/`WebhookEdit`.

---
source: src/modules/webhooks/routes.ts
sha256: feff0bcc6016c68bcbde5c7b04be5117af97a4e2d410702e5e71121efe870dc5
signature: feff0bcc6016c68bcbde5c7b04be5117af97a4e2d410702e5e71121efe870dc5
generated_at: 2026-11-10T06:13:09.188958+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/routes.ts

## Purpose

Declares the Vue Router route table for the webhooks module. Each record pairs a URL path with a lazy-loaded view component and a `meta` permission rule, allowing the global router guard to enforce fine-grained access (read vs. create vs. update) on a per-route basis.

## Key elements

- **`default` (exported array, `RouteRecordRaw[]`)** — Five route records:
  - `WebhooksList` (`webhooks/subscriptions`) — list view; requires `read WebhookSubscription`.
  - `WebhookCreate` (`webhooks/subscriptions/create`) — new-subscription form; requires `create WebhookSubscription`.
  - `WebhookTarget` (`webhooks/subscriptions/:id`) — detail view; requires `read`; passes the route param as a component prop (`props: true`).
  - `WebhookEdit` (`webhooks/subscriptions/:id/edit`) — edit form; requires `update`; also uses `props: true`.
  - `WebhookDeliveries` (`webhooks/deliveries`) — delivery log; requires `read`.
- **`meta.can`** — Two-element `[verb, resource]` tuple consumed by the router guard to check permissions before the view is rendered.
- **`meta.title`** — i18n key (e.g. `webhooks-list-page.page-title`) used by the app shell for page-title rendering.
- **`meta.access: 'auth'`** — Flags every route as requiring an authenticated session (checked before the `can` rule).
- **`component: () => import('./views/*.vue')`** — All five views are lazy-loaded code-split chunks.

## Relationships

- **`src/modules/webhooks/module.ts`** — Imports this file's default export and registers the routes with the app-level module/router registry. This file is purely declarative; `module.ts` is the integration point.
- **`src/modules/webhooks/tests/routes.spec.ts`** — Unit-tests the route table (paths, names, meta rules, component references) to guard against permission or path regressions.

## Notes

- The `can` tuples use the exact resource name `WebhookSubscription` even on the deliveries route. A read-only role can reach both `WebhooksList` and `WebhookDeliveries` but is blocked from `WebhookCreate` / `WebhookEdit`.
- Only the two detail-level routes (`WebhookTarget`, `WebhookEdit`) set `props: true`; the list and create routes do not need route params passed as props.
- The array is annotated with `satisfies RouteRecordRaw[]` (not a type alias), so the inferred literal types of each record are preserved for tooling while still being assignable to the router's expected shape.

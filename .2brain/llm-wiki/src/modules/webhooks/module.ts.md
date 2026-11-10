---
source: src/modules/webhooks/module.ts
sha256: ddb05b5b4b71f27ed6d4b0b5189924244c125f1291b66f50c21c6d907f38c149
signature: ddb05b5b4b71f27ed6d4b0b5189924244c125f1291b66f50c21c6d907f38c149
generated_at: 2026-11-10T06:12:54.231948+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/module.ts

## Purpose

Module manifest that registers the webhooks feature into the app's module registry. It wires together the route table, two admin-section navigation entries, lazy-loaded response schemas, and locale dictionaries (en/it) behind a single `AppModule`-shaped export.

## Key elements

- **Default export (`AppModule`)** — the registry object: `name: 'webhooks'`, `loadingKeys: ['webhooks']`, `routes`, `navigation`, `responseSchemas`, `locales`.
- **`navigation[0]` (`WebhooksList`)** — nav entry for subscription management (create / rotate / remove). Order 48, icon `Webhook`. Carries a live `badge` that delegates to `useAutoDisabledBadge()`, surfacing the count of subscriptions auto-disabled by the failure guard.
- **`navigation[1]` (`WebhookDeliveries`)** — nav entry for the delivery log (read / replay). Order 49, icon `History`.
- **`responseSchemas`** — lazy factory importing `./response-schemas` and re-exporting `webhooksResponseSchemas`.
- **`locales`** — lazy factory for `en.json` and `it.json`, each passed through the kernel's `dictionary` helper.

## Relationships

- **`src/modules/webhooks/routes.ts`** — imported directly; supplies the `routes` value placed on the module object.
- **`src/modules/webhooks/composables/use-auto-disabled-badge.ts`** — imported directly; its `useAutoDisabledBadge()` composable is called as the nav badge factory for `WebhooksList`.
- **`src/modules/webhooks/tests/auto-disabled-badge.spec.ts`** — unit-tests the composable this file consumes; no import relationship from this file.
- **`src/modules/tasks/module.ts`** — no import. The doc comment cites the tasks module's public-form / admin-page split as a *convention analogy* for why webhooks also uses two nav entries.
- **`src/modules/users/module.ts`** — no import or reference visible in this file.

## Notes

- The file explicitly states it "depends on nothing" in the domain sense: it never imports the backend modules that *publish* events (orders, payments, returns, delivery). Those publish on the backend's own domain-event bus; this module only manages the subscription records and the delivery log.
- `badge` is a function returning the composable's result, not a static number — it will be re-evaluated wherever the registry calls it.
- The two nav entries are deliberately split (subscriptions vs. delivery log) following the same two-page pattern used by the `tasks` module; don't merge them into one entry without revisiting that convention.
- Context map lives in `docs/modules/webhooks.md` § "The map".

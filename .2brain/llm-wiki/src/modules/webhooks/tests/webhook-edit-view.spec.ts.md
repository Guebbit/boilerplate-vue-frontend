---
source: src/modules/webhooks/tests/webhook-edit-view.spec.ts
sha256: 628c7c2eaa344e4d39f8b9669fb30ea700fab07ad835b9b441b12d4c43b60ecc
generated_at: 2026-10-02T15:57:12.030816+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/webhook-edit-view.spec.ts

## Purpose

Verifies the `description`-field contract on the WebhookEdit page: clearing the field must produce `null` in the update payload (per the "empty string is invalid, `null` clears" rule), and leaving it untouched must omit the key entirely. Mounts the real Vue component against a real memory-history router and Pinia store rather than a shallow stub.

## Key elements

- **`V_SELECT_STUB`** – Minimal stand-in for Vuetify's `VSelect`; emits a fixed `['order.paid']` on change (same pattern as `webhook-create-view.spec.ts`).
- **`SUBSCRIPTION`** – Fixture `WebhookSubscription` record (`sub-1`) carrying a non-empty `description: 'Orders feed'` for the "clear it" test.
- **`router`** – Memory-history router whose child routes come from `collectModuleRoutes(enabledModules)`, giving the page a real route-param (`:id`) resolution.
- **`mountPage()`** – Seeds the store cache via `store.addSubscriptionRecord`, spies on `updateSubscription` and `fetchEventCatalogue`, mounts `WebhookEdit` with the router/vuetify/i18n plugins and stubs, returns `{ wrapper, update }`.
- **Two `it` blocks** – One asserts a cleared description yields `{ description: null }`; the other asserts an untouched form yields `{}`.

## Relationships

- **`tests/support/unit/wire-modules.ts`** (`wireModulesIntoCore`) – Called once at module top-level so the kernel registry is populated before `collectModuleRoutes(enabledModules)` can resolve the webhooks module's routes.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** (`contractRequest`) – Validates the spied `updateSubscription` payload against the `UpdateWebhookSubscriptionBody` API schema, then asserts the resulting object shape.

## Notes

- There is no `GET …/subscriptions/{id}` endpoint; the page hydrates from the store's cache. The test seeds that cache by hand (`addSubscriptionRecord`), mirroring what a prior list load would leave behind.
- `contractRequest` is used instead of a plain `toEqual` so the assertion is anchored to the generated API contract, not a hand-written expected object.
- `beforeEach` resets `document.body` and pushes the real URL (`/en/webhooks/subscriptions/sub-1/edit`) before waiting on `router.isReady()`, ensuring the route param is populated before the component reads it.

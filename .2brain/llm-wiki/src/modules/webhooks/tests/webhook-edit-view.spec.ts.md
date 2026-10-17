---
source: src/modules/webhooks/tests/webhook-edit-view.spec.ts
sha256: 385b4b18e6871558fda2023b1519c5dc79b8eadf3bfd347698088bc054e10743
generated_at: 2026-10-17T01:52:37.438368+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/webhook-edit-view.spec.ts

## Purpose

Integration-style unit test for the `WebhookEdit.vue` page. It verifies the PATCH body the form emits: a cleared `description` must serialize to `null` (not `""`), and an untouched field must be omitted entirely. Hydration is seeded directly into the Pinia store cache because the API has no per-ID `GET` endpoint for this page.

## Key elements

- **`router`** — a real `vue-router` instance using `createMemoryHistory`, with routes collected via `collectModuleRoutes(enabledModules)`. Pushed to `/en/webhooks/subscriptions/sub-1/edit` before each test.
- **`V_SELECT_STUB`** — minimal Vuetify `v-select` replacement that always emits `['order.paid']`, avoiding Vuetify rendering in tests.
- **`SUBSCRIPTION`** — the single fixture record (`id: 'sub-1'`, `description: 'Orders feed'`) used by every test.
- **`mountPage()`** — seeds the store cache with `SUBSCRIPTION`, spies on `updateSubscription` and `fetchEventCatalogue`, then mounts `WebhookEdit` with Pinia, i18n, Vuetify, and the memory router.
- **`describe('WebhookEdit')`** — two cases:
  - *"sends null for a description the visitor cleared, never the empty string"* — sets the description input to `''`, submits, asserts the PATCH body equals `{ description: null }`.
  - *"leaves the description out when the field was left alone"* — submits without touching the field, asserts the PATCH body equals `{}`.
- Both assertions pipe the payload through **`contractRequest(schemas.UpdateWebhookSubscriptionBody, …)`** to validate shape against the OpenAPI-generated schema.

## Relationships

- **`src/modules/webhooks/views/WebhookEdit.vue`** — the component under test; mounted directly with its real template and form logic.
- **`src/modules/webhooks/store.ts`** — provides `useWebhooksStore`; tests spy on `updateSubscription` and `fetchEventCatalogue`, and seed `addSubscriptionRecord` to simulate a prior list-fetch cache.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope so that `collectModuleRoutes` can resolve the webhooks module's route registration.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `contractRequest`, which strips unknown keys and validates the object against the `UpdateWebhookSubscriptionBody` schema before the `.toEqual` assertion.

## Notes

- The file doc-comment references "subscription-edit" and `subscriptions/{id}`; the actual route path is `/en/webhooks/subscriptions/:id/edit`. The naming reflects a shared "subscription" domain concept across webhook endpoints.
- There is intentionally **no mock of the router** — the test exercises real route resolution (`/en/webhooks/subscriptions/sub-1/edit`) so that parameter extraction (`id` prop) is covered.
- `loadLocale('en')` must resolve before `router.push` in `beforeEach`; the `.then` chain guards against i18n timing issues.
- The test file sits in `src/modules/webhooks/tests/` rather than a top-level `tests/` tree, co-locating with the feature it covers.

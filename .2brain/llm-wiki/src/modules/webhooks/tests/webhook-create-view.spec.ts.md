---
source: src/modules/webhooks/tests/webhook-create-view.spec.ts
sha256: b56c2dd8726bb2f5867aaba76b688d0b62ab23e4cce90a60cbe50b2bd6715485
generated_at: 2026-10-17T01:52:18.618218+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/webhook-create-view.spec.ts

## Purpose
Integration-level Vitest suite that mounts the real `WebhookCreate` page against a real memory-history router and a real Pinia store (with HTTP calls spied). It verifies: client-side validation before submit, the exact payload shape sent to the store, the one-time secret reveal flow (including the confirm-saved gate), post-create navigation, and inline error handling on API rejection.

## Key elements
- **`router`** — A `createMemoryHistory` router whose children come from `collectModuleRoutes(enabledModules)`, so `Done` navigation is exercised against real module routes.
- **`V_SELECT_STUB`** — Replaces Vuetify's `VSelect` with a plain `<select multiple>` that emits a fixed `['order.paid']` value, avoiding Vuetify's teleported-menu complexity.
- **`CREATED`** — A `WebhookSubscriptionCreated`-typed fixture (subscription + `secret`) used as the mock store response; compilation fails if the generated contract adds required fields.
- **`mountPage()`** — Creates a fresh Pinia store, spies on `fetchEventCatalogue` and `createSubscription` *before* mounting (the view destructures them in `setup`), then mounts `WebhookCreate` with router, vuetify, i18n, and the `VSelect` stub. Returns `{ wrapper, create }`.
- **`fillAndSubmit(wrapper, url)`** — Chains `setValue` on URL and description inputs, triggers the `<select>` change, submits the form, and flushes promises.
- **Five test cases** covering: invalid URL rejection (no store call, `.v-messages` shown); valid submit (exact payload, secret visible, still on create route); empty-description omission (validated via `contractRequest` against the generated schema); post-create navigation (confirm-saved → `Done` → `/en/webhooks/subscriptions/sub-1`); and API error (inline error element, no navigation).

## Relationships
- **`src/modules/webhooks/views/WebhookCreate.vue`** — The component under test; mounted directly.
- **`src/modules/webhooks/store.ts`** — `useWebhooksStore` is instantiated and its `fetchEventCatalogue` / `createSubscription` methods are spied to isolate the HTTP layer.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope so the kernel registry knows which modules are enabled for `collectModuleRoutes`.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — `contractRequest(schemas.CreateWebhookSubscriptionBody, body)` validates that the actual payload conforms to the generated API schema (used in the "omits description" test).

## Notes
- Spies must be attached **before** `mount` because the view destructures store actions in its `setup` block; spying after mount would not intercept calls.
- The secret-reveal modal and its confirm input are **teleported to `<body>`** (Vuetify behavior), so assertions use `document.body.querySelector` rather than `wrapper.find`.
- The `Done` button remains disabled until the "confirm saved" checkbox is checked — the test explicitly clicks it before proceeding.
- Empty description must be **absent from the payload entirely** (neither `""` nor `null`), because the generated `CreateWebhookSubscriptionBody` type does not permit a nullable description.
- `attachTo: document.body` is required so teleported elements (Vuetify modal, select dropdown) are reachable in the DOM.

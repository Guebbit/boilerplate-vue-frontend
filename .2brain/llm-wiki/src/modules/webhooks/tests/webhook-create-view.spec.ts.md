---
source: src/modules/webhooks/tests/webhook-create-view.spec.ts
sha256: 1612b63260bab2d3dca38c3b2bf35fb8eae428438649a5e72dee304ab0e3a979
signature: a778b4118598723efdfaa85a2f0ed9888279abc3512eb04aabc112a0df62dcb6
generated_at: 2026-11-10T06:16:21.992435+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/webhook-create-view.spec.ts

## Purpose

Vitest suite that mounts the real `WebhookCreate.vue` page against a real memory-history router to verify: client-side URL validation, the exact payload shape sent on submit, the one-time secret reveal (shown once, gated behind a "saved" confirmation), and that `Done` navigates to the newly created subscription. Store methods are spied; the HTTP layer below them is covered by its own suite.

## Key elements

- **`mountPage()`** — Creates a fresh Pinia store, spies on `fetchEventCatalog` and `createSubscription` *before* mount (the view destructures them at setup), then mounts `WebhookCreate` with router, vuetify, and i18n plugins plus a `VSelect` stub. Returns `{ wrapper, create }`.
- **`fillAndSubmit(wrapper, url)`** — Chain-helpers that set the URL input, description input, trigger the `<select>` change (emitting `['order.paid']`), and submit the form, ending with `flushPromises`.
- **`CREATED`** — Typed fixture (`WebhookSubscriptionCreated`) for the API's create response, including the one-time `secret` field and `secretIds`.
- **`V_SELECT_STUB`** — Replaces Vuetify's `VSelect` with a plain `<select multiple>` whose change handler always emits `['order.paid']`; isolates the page from Vuetify's teleported-menu internals.
- **`router`** — `createMemoryHistory` router whose routes come from `collectModuleRoutes(enabledModules)`, so `Done` navigation is exercised for real.
- **Five `it` cases** — (1) invalid URL blocked, (2) valid submit reveals secret in place, (3) cleared description omitted from body, (4) `Done` navigates to `/en/webhooks/subscriptions/sub-1` after confirm, (5) API 500 shown inline without leaving the page.

## Relationships

- **`src/modules/webhooks/store.ts`** — `useWebhooksStore().fetchEventCatalog` and `.createSubscription` are spied; no HTTP is actually issued.
- **`src/modules/webhooks/views/WebhookCreate.vue`** — the component under test; imported and mounted directly.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to register module routes before the router is constructed.
- **`tests/support/unit/orval-fixture-schema.ts`** — `contractRequest` validates the submitted body against the generated `CreateWebhookSubscriptionBody` schema (used in the "omits description" case).
- **`tests/support/unit/fixtures.ts`** — `aProblem(500, …)` supplies a well-formed RFC-7807 error object for the rejection case.

## Notes

- Spies must be installed **before** `mount()`; the view destructures store actions during `setup()`, so post-mount spying would be a no-op.
- The secret-reveal modal is teleported to `<body>` by Vuetify; assertions therefore query `document.body.querySelector(…)` rather than `wrapper.find(…)`.
- The "omits description" test asserts the key is **absent** from the serialized body, not set to `null` or `''`, because the generated schema marks `description` as non-nullable.
- `beforeEach` resets `document.body.innerHTML` and pushes the router to the create route before every case to avoid cross-test route state.

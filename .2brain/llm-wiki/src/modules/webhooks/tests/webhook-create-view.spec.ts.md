---
source: src/modules/webhooks/tests/webhook-create-view.spec.ts
sha256: 319e0600cb87933e4a8fbeee765a34ff30e4a577b38ce891a5acf4aa690da37f
generated_at: 2026-10-02T15:56:29.179982+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/webhook-create-view.spec.ts

## Purpose

Component test suite for the `WebhookCreate` view. It verifies the form's client-side validation (rejecting non-URL values), the exact payload passed to the store on submit, the one-time secret-reveal modal flow before the visitor leaves the page, navigation to the new subscription detail on "Done", and in-place error display when the store rejects. Store actions are spied directly on the Pinia store; the HTTP layer beneath them has its own dedicated suite.

## Key elements

- **`V_SELECT_STUB`** – Minimal `<select multiple>` replacement for Vuetify's `VSelect`; emits `update:modelValue` with a fixed event list, isolating the page under test from Vuetify's teleported-menu behaviour.
- **`CREATED`** – Typed fixture (`WebhookSubscriptionCreated`) standing in for the API's create response, including the `secret` field. Typing it against the generated contract means any new required field breaks compilation here.
- **`mountPage()`** – Spies `fetchEventCatalogue` and `createSubscription` on the store *before* mounting (the view destructures actions at `setup`), then mounts `WebhookCreate` with the real router, Vuetify, i18n, and stubs. Returns the wrapper and the create spy.
- **`fillAndSubmit(wrapper, url)`** – Chains `setValue` on the URL and description inputs, triggers the select change, submits the form, and flushes promises.
- **Router** – Real `createMemoryHistory` router seeded with `collectModuleRoutes(enabledModules)` so `Done` navigates through the actual route table rather than a mock.
- **`describe('WebhookCreate')`** – Five cases: invalid-URL rejection; exact-payload + secret-still-on-page; empty-description omission (validated via `contractRequest`); secret-acknowledge → navigate to detail; API rejection → inline error, no navigation.

## Relationships

- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module top-level, registering enabled modules into the app's kernel so `collectModuleRoutes` and the router reflect the real module graph.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – `contractRequest` is used in the "omits description" test to assert the outgoing body conforms to the generated `CreateWebhookSubscriptionBody` schema, catching accidental inclusion of disallowed fields.

## Notes

- **Spies before mount.** `WebhookCreate` destructures store actions inside `setup()`, so `vi.spyOn` must run before `mount()`. Setting them up in `beforeEach` after mount would be a no-op.
- **Teleported DOM.** The secret-reveal modal is rendered into `<body>` by Vuetify, so assertions in the "acknowledge secret" and "secret shown" tests query `document.body.querySelector` rather than the `wrapper` scope.
- **Description is non-nullable, not nullable.** The generated schema rejects both `''` and `null` for `description`; the test therefore asserts the key is *absent* from the JSON body, not set to empty/null.
- **`VSelect` stub hard-codes `['order.paid']`.** The suite does not test Vuetify's multi-select UX; the stub emits that single value so the page's payload assertion stays deterministic.

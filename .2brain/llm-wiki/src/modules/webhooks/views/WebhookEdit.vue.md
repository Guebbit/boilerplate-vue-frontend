---
source: src/modules/webhooks/views/WebhookEdit.vue
sha256: f775e5747028e9e53e7fe272cbe18b2f9bddb5f19d267b70d39c278c776176cd
generated_at: 2026-10-02T15:58:50.103813+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/views/WebhookEdit.vue

## Purpose

Edit form page for a webhook subscription. It hydrates a URL / description / event-types / enabled form from the webhooks store (keyed by the route `id` param) and persists changes via `updateSubscription`. Deliberately scoped to plain field edits — secret-ring and destructive actions are kept on the separate detail page, mirroring the split used in the `users` module.

## Key elements

- **`WebhookEditForm` interface** — local shape for the form model (`url`, `description`, `eventTypes`, `enabled`).
- **`useStructureFormValidation<WebhookEditForm>`** — toolkit composable providing `form`, `formErrors`, `showFormErrors`, `isSubmitting`, `handleSubmit`, `activateAutoHydrate`, and `applyServerErrors`. Configured with `webhookEditSchema`, a Vuetify invalid-field selector, and a locale-reactive revalidation trigger.
- **`activateAutoHydrate(computed…)`** — pulls `currentSubscription` fields into the form the moment the store record resolves, avoiding a manual copy step.
- **`submitForm`** — validates, then calls `toRequestBody('UpdateWebhookSubscriptionBody', …)` (which converts a cleared `description` `''` → `null` to avoid a 422), dispatches `updateSubscription`, and reports success or maps server errors back onto the form / blocking-error slot.
- **`useBlockingError()`** — local `formError` / `reportFormError` / `clearFormError` triple that renders an inline alert when the save API call fails with an unmapped error.
- **`watchSubscription(() => id)`** — re-fetches / selects the subscription whenever the route id changes.
- **`fetchEventCatalogue()`** — called in `onMounted` to populate the `v-select` multiselect items.
- **Template** — Vuetify `v-text-field` (url, description), `v-select` (eventTypes chips), `v-switch` (enabled), wrapped in `ItemDetailLayout` / `CardDetail` / `ItemDetailHero`; aside card shows id, created-at, updated-at via `ItemDetailField`.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — no direct import in this file; any logging interaction is indirect (e.g., via the store or toolkit composable internals).
- **`src/modules/account/views/TwoFactorChallenge.vue`** — no direct import or reference; the connection is likely at the routing/layout level (shared `ItemDetailLayout` shell) rather than a code dependency.

## Notes

- `toRequestBody` is critical: an empty-string `description` (Vuetify's "cleared" value) would be rejected by the API as a 422; this helper normalises it to `null` before the request body is built.
- `revalidateOn: locale` means switching the UI language re-runs the schema, so error messages stay in sync without a manual re-trigger.
- The `id` prop is optional at the type level; `submitForm` short-circuits (no-op) when it is falsy, and the submit button is additionally disabled while `loadingSubscriptions` is true.
- The page name is registered as `WebhookEditPage` (classic `export default` alongside `<script setup>`).

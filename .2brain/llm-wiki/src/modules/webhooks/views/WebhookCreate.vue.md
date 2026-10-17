---
source: src/modules/webhooks/views/WebhookCreate.vue
sha256: a7389d809e8827a4e1fb24e4f11b9b7b6699476270be222ed9b6328f921162bb
generated_at: 2026-10-17T01:53:00.194854+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/views/WebhookCreate.vue

## Purpose

The "create webhook subscription" page. It renders a form (URL, optional description, event-type multiselect), validates it against `webhookCreateSchema`, and on success intercepts the flow to show a one-time API secret via `SecretRevealModal` before the visitor is ever sent to the new subscription's detail page.

## Key elements

- **`WebhookCreatePage`** — component name (declared in the separate `<script>` block because `<script setup>` cannot set `name`; needed for `<KeepAlive>` / devtools).
- **`submitForm()`** — runs `useStructureFormValidation`'s `handleSubmit`, builds the request body via `toRequestBody('CreateWebhookSubscriptionBody', …)`, calls `createSubscription`, then stashes `created.id` and `created.secret` in local refs to trigger the reveal modal.
- **`handleSecretDone()`** — fires a success toast, clears the local secret, and navigates to `WebhookTarget` (fire-and-forget so a `NavigationFailure` doesn't surface as an error).
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) — owns form state, Zod-style validation against `webhookCreateSchema`, server-error mapping, and submit lifecycle.
- **`useBlockingError`** (local composable) — dedicated inline error state for a failed create; intentionally separate from the toast queue.
- **`useReturnFocus`** — restores focus to the trigger element once the reveal modal closes.
- **`revealedSecret` / `createdSubscriptionId`** — component-local `ref`s; the secret is *never* written to the Pinia store.
- **Template** — `FormCard` wrapper, three Vuetify inputs (`v-text-field` × 2, `v-select` for event types), `InlineErrorAlert` for the blocking error, and a `v-dialog` + `SecretRevealModal` overlay.

## Relationships

- **`src/modules/webhooks/schemas.ts`** — provides `webhookCreateSchema`, the validation schema passed to `useStructureFormValidation`.
- **`src/modules/webhooks/store.ts`** — provides `createSubscription` (the API call), `fetchEventCatalogue`, and reactive `eventCatalogue` / `loadingEventCatalogue` refs used by the event-type multiselect. The store deliberately does **not** cache the returned secret.
- **`src/modules/webhooks/tests/webhook-create-view.spec.ts`** — unit/integration spec that exercises this view (form validation, submit flow, secret-reveal behavior).

## Notes

- The one-time secret lives **only** in this component's `ref`s between the API response and the user dismissing the modal. The store's `createSubscription` strips it before caching — do not "conveniently" store it.
- `formElement` is passed as a **getter** (`() => card.value?.formElement`) because `FormCard` is still mounting when the composable reads its options; an eager value would be `undefined`.
- `revalidateOn: locale` re-runs validation (and re-renders error messages) whenever the active locale changes.
- `handleSecretDone` uses `void router.push(…)` so a route-transition failure (e.g. double-navigation) cannot be misinterpreted as a create failure.
- `toRequestBody` with a non-nullable type (`'CreateWebhookSubscriptionBody'`) means empty optional fields (e.g. `description`) are omitted from the payload rather than sent as `null`.

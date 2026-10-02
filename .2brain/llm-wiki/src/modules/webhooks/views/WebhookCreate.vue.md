---
source: src/modules/webhooks/views/WebhookCreate.vue
sha256: 16cd58e6ab6a44c5ca680ef127d17173f1cce51b3e4b79c4b25be43dca939347
generated_at: 2026-10-02T15:57:47.606194+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/views/WebhookCreate.vue

## Purpose

The Webhook subscription creation page. It presents a form (URL, description, event-type multiselect) built on `useStructureFormValidation`, submits a new subscription via the webhooks store, and—uniquely—intercepts the one-time API secret in component-local state to display it in a reveal modal before the visitor is ever navigated to the new subscription's detail page. The store never caches the secret.

## Key elements

- **`form` / `formErrors` / `handleSubmit` / `applyServerErrors`** — destructured from `useStructureFormValidation`, typed against `webhookCreateSchema`; drives all validation and the submit pipeline.
- **`submitForm()`** — orchestrates the full create flow: clears any prior blocking error, serializes via `toRequestBody`, calls `createSubscription`, then either captures `created.secret` into `revealedSecret` (success) or funnels the failure through `applyServerErrors` → `reportSubmitError` (in-place `InlineErrorAlert`).
- **`revealedSecret` / `createdSubscriptionId`** — component-local refs that hold the one-time secret and the new subscription ID long enough for the reveal modal; never written to the store.
- **`handleSecretDone()`** — dismisses the modal, fires a success toast, and navigates to `WebhookTarget` (fire-and-forget `router.push` so a `NavigationFailure` can't turn a completed create into an error).
- **`useReturnFocus`** — restores keyboard focus to the trigger element when the modal closes.
- **`useBlockingError`** — provides `submitError` / `reportSubmitError` / `clearSubmitError` for the single dedicated in-place error banner (as opposed to a toast).
- **`eventCatalogue` / `loadingEventCatalogue`** — pulled from `useWebhooksStore` via `storeToRefs`; populates the event-type multiselect; fetched in `onMounted`.
- **`FormCard` (template ref `card`)** — wraps the `<form>`; accessed lazily through a `formElement` getter so the element exists by the time a failed submit needs to focus/scroll.

## Relationships

No direct import or reference to the listed graph neighbors (`logger.ts`, `TwoFactorChallenge.vue`) is present in this file's visible code. The only cross-module interaction is with `@/modules/webhooks/store` (`useWebhooksStore`) and `@/modules/webhooks/schemas.ts` (`webhookCreateSchema`).

## Notes

- The secret is **never** persisted to the Pinia store; it lives only in `revealedSecret` for the modal's lifetime and is then discarded.
- `formElement` is passed as a **getter** (`() => card.value?.formElement`) rather than a static ref because the `FormCard` may still be mounting when the composable is configured; the getter defers resolution to submit time.
- `revalidateOn: locale` re-runs validation (and re-renders error messages) when the UI language changes.
- The submit navigation is intentionally `void router.push(…)` (fire-and-forget) so that a `NavigationFailure` (e.g., a concurrent route change) does not reject the promise chain and surface as an error toast after a successful create.
- `toRequestBody('CreateWebhookSubscriptionBody', …)` is used with the non-nullable create variant: an empty `description` is omitted rather than sent as `null`.

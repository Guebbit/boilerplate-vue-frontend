---
source: src/modules/webhooks/views/WebhookCreate.vue
sha256: e6fea366df921a8764594ab9534e95c9edb983ac40774714a3758db03ff03f88
signature: e6fea366df921a8764594ab9534e95c9edb983ac40774714a3758db03ff03f88
generated_at: 2026-11-10T06:17:16.511470+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/views/WebhookCreate.vue

## Purpose

Vue SFC that renders the "create webhook subscription" form (URL, optional description, multi-select event types). On successful submission it captures the one-time secret returned by the API, displays it via `SecretRevealModal`, and only then navigates the user to the new subscription's detail page.

## Key elements

- **`submitForm()`** – Clears any prior blocking error, validates the form via `useStructureFormValidation`, serialises the body with `toRequestBody`, calls `createSubscription`, and on success stores `createdSubscriptionId` + `revealedSecret` in local refs. On failure, maps server errors to fields or reports a blocking error.
- **`handleSecretDone()`** – Called when the user dismisses the `SecretRevealModal`. Marks the form saved (lifting the leave-guard), fires a success toast, and navigates to `WebhookTarget` via `routerLinkI18n`.
- **`revealedSecret` / `createdSubscriptionId`** – Local `ref`s that hold the one-time secret and new ID *only* for the duration of the reveal-modal flow. They are never persisted to the store.
- **`useLeaveGuard`** – Warns the user before navigating away with an unsaved (dirty) form; `markSaved()` suppresses the guard after a successful create.
- **`useBlockingError`** – Provides a single in-form error slot (`InlineErrorAlert`) so a failed create is visible in context rather than buried in a toast queue.
- **`onMounted` → `fetchEventCatalog()`** – Populates the event-type multiselect options; resolves into the composable's error state on failure.
- **`card` (template ref to `FormCard`)** – Exposed as a *getter* (`formElement: () => card.value?.formElement`) so the form element is resolved lazily at submit time, not during mount.

## Relationships

- **`src/modules/webhooks/schemas.ts`** – Imports `webhookCreateSchema` (Zod schema) used by `useStructureFormValidation` to validate the three form fields.
- **`src/modules/webhooks/store.ts`** – Imports `useWebhooksStore`; calls `createSubscription` and `fetchEventCatalog`, and reads reactive `eventCatalog` / `loadingEventCatalog` via `storeToRefs`. The store intentionally does **not** cache the returned secret.
- **`src/modules/webhooks/tests/webhook-create-view.spec.ts`** – Unit/E2E test suite for this component.

## Notes

- A bare `<script>` block exists solely to set `name: 'WebhookCreatePage'` (needed for `<KeepAlive>` / DevTools) because `<script setup>` cannot declare a name.
- The secret is deliberately kept in component-local state and is **never** written back into the Pinia store; the store's `createSubscription` action omits it from its cache by design.
- `handleSecretDone` navigates with a fire-and-forget `void router.push(…)` so a `NavigationFailure` does not retroactively turn a completed create into an error toast; actual navigation errors surface through the app-level `router.onError` handler.
- The form's `formElement` is wired through a getter rather than a direct ref to avoid a timing race where `FormCard` has not yet mounted its inner `<form>` at composable-initialisation time.

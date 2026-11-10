---
source: src/modules/webhooks/views/WebhookEdit.vue
sha256: 388e224444502fe1a118920ca8c1c496309ae63b8520b8efe77130313092f848
signature: 388e224444502fe1a118920ca8c1c496309ae63b8520b8efe77130313092f848
generated_at: 2026-11-10T06:17:45.143541+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/views/WebhookEdit.vue

## Purpose

Webhook subscription edit page. Loads the target record by route `id` and presents a three-field form (URL, description, event types) for updating it. Deliberately excludes irreversible or audited actions (secret-ring rotation, enable/disable) that belong on the detail page, following the same edit/detail split used by the `users` module.

## Key elements

- **Named component block (`<script>`)** — Declares `name: 'WebhookEditPage'` so the SFC has a stable identifier in devtools and `<KeepAlive>`; necessary because `<script setup>` cannot set it.
- **`WebhookEditForm` interface** — The local shape (`url`, `description`, `eventTypes`) passed to the shared form-validation composable.
- **`useStructureFormValidation<WebhookEditForm>`** — Provides `form`, `formErrors`, `isDirty`, `isSubmitting`, `resetForm`, `handleSubmit`, `activateAutoHydrate`, `applyServerErrors`. Validation schema comes from `webhookEditSchema`.
- **`activateAutoHydrate`** — Binds the fetched `currentSubscription` back into the form once it resolves; gated behind `holdWhileSubmitting` to avoid clobbering mid-save.
- **`useLeaveGuard(isDirty, …)`** — Prompts before navigation when the form is dirty; `markSaved()` suppresses the prompt after a successful save.
- **`useStaleRecord` / `useBlockingError`** — Handle 412 (record changed server-side) with a "Reload latest" action; other API errors surface as an inline blocking alert on the form.
- **`submitForm`** — Validates, converts the payload via `toRequestBody` (mapping empty-string `description` → `null`), calls `updateSubscription`, then toasts success or routes the error into the stale / blocking-error handlers.
- **`watchSubscription`** (from store) — Triggers a fetch whenever the route `id` changes; a 404/403 is handled by `useMissingRecord` redirecting to the Error page.
- **`asideFields`** — Computed `DetailFieldRow[]` for the right-hand summary card (id, created-at, updated-at with `lucide` icons).
- **Template** — `ItemDetailLayout` → `ItemDetailHero` (title falls back: URL → route id → i18n page title) → `CardDetail` with the `<form>` → `RecordAsideCard` → action buttons linking to `WebhookTarget` detail page.

## Relationships

- **`src/modules/webhooks/schemas.ts`** — Imports `webhookEditSchema` (Zod schema) which drives client-side validation and the `toRequestBody` type narrowing.
- **`src/modules/webhooks/store.ts`** — Calls `watchSubscription`, `fetchSubscription`, `updateSubscription`, `fetchEventCatalog`; reads `currentSubscription`, `eventCatalog`, and loading flags via `storeToRefs`.
- **`src/modules/webhooks/tests/webhook-edit-view.spec.ts`** — Unit/spec tests for this component (mounts it, asserts form rendering, submit flow, stale-record UI).

## Notes

- The two `<script>` blocks are intentional: the non-setup block exists *solely* to set the component `name`. Do not merge them.
- `toRequestBody` is critical: Vuetify renders a cleared text field as `''`, but the API contract expects `null` for "no description." Sending `''` produces a 422.
- The `eventTypes` select uses the *name* string as both `item-title` and `item-value`; the catalogue is fetched once on mount and cached in the store.
- 412 handling is layered: `useStaleRecord` intercepts the error *before* `applyServerErrors` runs, so a stale response never appears as a generic server error.
- The form is fieldset-disabled while `loadingSubscriptions` is true, preventing edits during the initial fetch.

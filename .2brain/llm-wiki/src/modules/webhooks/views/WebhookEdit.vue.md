---
source: src/modules/webhooks/views/WebhookEdit.vue
sha256: f1047a4d44245af2933cef536b36a48127952dee2b645a4024fe78d79452b068
generated_at: 2026-10-17T01:53:25.116063+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/views/WebhookEdit.vue

## Purpose

Single-file Vue 3 component (named `WebhookEditPage`) that renders the edit form for a webhook subscription. It hydrates the form from the webhooks store cache, validates via a Zod schema, and persists changes to `url`, `description`, `eventTypes`, and `enabled`. Deliberately excludes destructive/secret-ring actions (delete, token rotation), which live on the target/detail page.

## Key elements

- **`WebhookEditForm` interface** — shape of the form data model (`url`, `description`, `eventTypes`, `enabled`).
- **`useStructureFormValidation<WebhookEditForm>`** — shared composable that wires validation (`webhookEditSchema`), error display, submit flow, and locale revalidation.
- **`activateAutoHydrate(computed)`** — populates the form from `currentSubscription` once the store resolves the record.
- **`submitForm()`** — validates, converts the payload with `toRequestBody` (maps cleared `''` → `null`), calls `updateSubscription`, toasts on success, and routes unmapped errors into a form-level blocking alert.
- **`useBlockingError()`** — local reactive error state (`formError`) shown via `InlineErrorAlert`; separate from any page-level or secret-ring error.
- **`watchSubscription(() => id)`** — selects the store's active subscription whenever the route `id` prop changes.
- **`fetchEventCatalogue()`** — called in `onMounted` to populate the `eventTypes` multi-select.
- **Template** — `ItemDetailLayout` shell with a Vuetify form (text fields, multi-select chips, switch) in the main column and read-only metadata (id, createdAt, updatedAt) in the aside.

## Relationships

- **`src/modules/webhooks/store.ts`** — primary data source. The component calls `watchSubscription` to hydrate, `fetchEventCatalogue` for the event list, and `updateSubscription` on save. Reactive refs (`currentSubscription`, `eventCatalogue`, `loading*`) are pulled via `storeToRefs`.
- **`src/modules/webhooks/schemas.ts`** — provides `webhookEditSchema` (Zod) used as the validation contract for the form composable.
- **`src/modules/webhooks/tests/webhook-edit-view.spec.ts`** — the dedicated unit/integration test suite for this view.

## Notes

- **`toRequestBody` is required**: Vuetify clears a text field to `''`, but the API contract expects `null` for "no description." Skipping the conversion yields a 422.
- **Component name block**: The separate `<script>` block exists solely to set `name: 'WebhookEditPage'` for `<KeepAlive>` / devtools, since `<script setup>` cannot declare a component name.
- **No `logger.ts` or `TwoFactorChallenge.vue` interaction**: Despite appearing in the dependency graph, neither is imported or referenced in this file; they are likely connected transitively via the store or router.
- **Route param `id` is optional** in `defineProps`; `submitForm` is a no-op when it is falsy, and the "Go to details" action button is hidden.

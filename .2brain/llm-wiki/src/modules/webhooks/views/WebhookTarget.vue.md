---
source: src/modules/webhooks/views/WebhookTarget.vue
sha256: eb86a41988ccce939fd32b90a593818abfadaff4accc567843beb2965dfc7b7c
generated_at: 2026-10-17T01:53:41.524955+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/views/WebhookTarget.vue

## Purpose

Read-only detail page for a single webhook subscription. It hydrates the subscription from the Pinia store's cache (keyed by the route `id` prop), renders its metadata (URL, event types, status, failure count), and exposes the secret-ring management actions (rotate, remove) plus a page-level delete. There is no dedicated `GET` endpoint for a single subscription; all data comes from the store.

## Key elements

- **Named component block** (`WebhookTargetPage`) — separate `<script>` (non-setup) that supplies a stable `name` for DevTools and `<KeepAlive>`, which `<script setup>` cannot declare.
- **`watchSubscription(() => id)`** — store action called with a getter; hydrates `currentSubscription` from cache whenever the route `id` changes.
- **`heroTitle` / `heroDescription` / `subscriptionStatus`** — computed properties that format the subscription's URL, description, and enabled/disabled flag for the hero and stats cards.
- **`revealedSecret: ref<string>`** — transient local ref holding a freshly rotated secret solely so the `SecretRevealModal` can display it once. Never persisted to the store.
- **`busy: ref<boolean>`** — disables all secret-ring buttons while any rotate/remove call is in flight.
- **`handleRotateSecret()`** — calls `store.rotateSecret(id)`, stores `newSecret` in `revealedSecret`, opens the modal.
- **`handleRemoveSecret(secretId)`** — shows a Vuetify confirm dialog, then calls `store.removeSecret(id, secretId)`.
- **`handleDelete()`** — shows a confirm dialog, calls `store.deleteSubscription(id)`, then navigates to the `WebhooksList` route.
- **Three `useBlockingError()` instances** — one each for rotate, remove, and delete, giving every destructive action its own inline error surface (`InlineErrorAlert`) rather than a shared toast.
- **`useReturnFocus`** — restores keyboard focus to the control that opened the secret-reveal modal when it closes.

## Relationships

- **`src/modules/webhooks/store.ts`** — primary data source. Consumes `watchSubscription`, `rotateSecret`, `removeSecret`, `deleteSubscription` actions and the `currentSubscription` ref. All page data flows through this store; the component performs no direct HTTP calls.
- **`src/infrastructure/utils/logger.ts`** — indirect dependency pulled in transitively through `useBlockingError` (and/or `useNotificationsStore`), providing structured logging for the error-reporting paths used by the three `report*` callbacks.

## Notes

- **No server-side fetch per ID.** The page relies entirely on the store's cache being warm (typically populated by the list page). If the user deep-links directly with a cold cache, `currentSubscription` stays `undefined` and the template shows a loading placeholder.
- **Rotated secret is component-local only.** The store's `rotateSecret` returns `newSecret` in the response but never writes it back into its own cache; this component is the sole holder, and it is cleared when the modal is dismissed.
- **Distinct error channels.** Rotate errors appear inline on the rotate button; remove errors appear above the secrets table; delete errors appear near the delete button. They are intentionally separate `useBlockingError` instances so a failure is surfaced at the control the user just clicked.
- **`id` prop is optional.** All handlers guard with `if (!id) return;` rather than asserting, since the prop type is `id?: string`.

---
source: src/modules/webhooks/views/WebhookTarget.vue
sha256: 33e907a323454a760c50899c779bb335ae2bf70bc989749c606b5ba031a119bb
generated_at: 2026-10-02T15:59:24.997210+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/views/WebhookTarget.vue

## Purpose

Read-only webhook subscription detail page. It hydrates the current subscription from the webhooks store's in-memory cache (there is no dedicated `GET …/subscriptions/{id}` endpoint) and exposes the secret-ring management actions (rotate, remove) plus subscription deletion.

## Key elements

- **`watchSubscription(() => id)`** — Re-subscribes the store's `currentSubscription` reactive whenever the route `id` prop changes; the page never fetches directly.
- **`heroTitle` / `heroDescription` / `subscriptionStatus`** (computed) — Derive the hero heading, subheading, and status chip from `currentSubscription` with i18n fallbacks.
- **`revealedSecret` (ref)** — Holds the one-time secret returned by `rotateSecret`; rendered in a `SecretRevealModal` and cleared on dismiss. Never persisted to the store cache.
- **`useReturnFocus`** — Restores focus to the triggering control after the reveal modal closes.
- **`busy` (ref)** — Shared in-flight guard that disables all secret-ring buttons while any mutation settles.
- **`handleRotateSecret`** — Calls `rotateSecret(id)`; on success sets `revealedSecret`, on failure reports to a dedicated `useBlockingError` instance.
- **`handleRemoveSecret(secretId)`** — Confirms via `useDialogStore`, then calls `removeSecret(id, secretId)`; errors surface in a shared `InlineErrorAlert` above the secrets table.
- **`handleDelete`** — Confirms, calls `deleteSubscription(id)`, shows a toast, and navigates to `WebhooksList`.
- **Three independent `useBlockingError` instances** — One per action (rotate / remove / delete) so each error is rendered in place next to its own control rather than lost in a toast queue.
- **Template sections** — Hero (`ItemDetailHero`), stat cards (`CardMaterialStat` × 3), detail fields (`ItemDetailField`), secrets table with per-row remove buttons, and a page-level delete button.

## Relationships

- **`useWebhooksStore`** (`@/modules/webhooks/store`) — Source of `currentSubscription`, `watchSubscription`, `rotateSecret`, `removeSecret`, `deleteSubscription`.
- **`useNotificationsStore`** (`@guebbit/vue-toolkit`) — Toast messages on success.
- **`useDialogStore`** (`@/ui/dialog.ts`) — Confirm-before-mutate prompts.
- **`useBlockingError`** (`@/infrastructure/utils/use-blocking-error.ts`) — Per-action inline error state.
- **`SecretRevealModal`**, **`ItemDetailLayout`**, **`ItemDetailHero`**, **`CardDetail`**, **`CardMaterialStat`**, **`ItemDetailField`**, **`InlineErrorAlert`** — UI composition layer.
- **`formatters.ts`** — `formatText`, `formatDateTime`, `formatFlag`, `EMPTY_VALUE`.
- **`use-return-focus.ts`** — Accessibility focus management.

## Notes

- **No direct GET call.** The page relies entirely on `watchSubscription` to pull data from the store cache; a fresh page load without prior list-view data will show a loading state until the store is populated.
- **`revealedSecret` is intentionally local.** The store's `rotateSecret` returns the new secret in the response but does not cache it; this component is the sole holder and discards it on modal dismiss.
- **Three separate `useBlockingError` instances** are a deliberate pattern: each mutation's failure is anchored to its own UI region (button, table, page footer) so the user sees context even if toasts are missed.
- **`busy` guards all three actions simultaneously**, preventing concurrent mutations on the same subscription.
- The `id` prop is optional (`id?: string`); every handler early-returns when it is absent.

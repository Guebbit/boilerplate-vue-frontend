---
source: src/modules/webhooks/composables/use-auto-disabled-badge.ts
sha256: 332e72b70626fb5931d5434d784081f93994432363f71bf6e20302f558ee0575
signature: ff6255f1cf1ead5137143a2321de1459cc512f58c87fcf8ba4ac0a714ce6c7c5
generated_at: 2026-11-10T06:12:31.507566+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/composables/use-auto-disabled-badge.ts

## Purpose

Provides the reactive badge count shown on the Webhooks nav entry in the app shell. The count represents webhook subscriptions that the failure guard auto-disabled — subscriptions that only a human operator can re-enable. The composable wires the badge store to the shared badge-refresh lifecycle and exposes a single `Ref<number | undefined>` for the nav entry to display.

## Key elements

- **`useAutoDisabledBadge`** (exported) — the sole export. Called once from the nav entry's `badge` accessor. Returns `Ref<number | undefined>`: the auto-disabled count, or `undefined` while nothing is loaded / there is nothing to show.
- **`readerId`** (internal `computed`) — resolves to `session.viewer.id` only when the session has `can('read', 'WebhookSubscription')`; otherwise `undefined`, which suppresses the badge.
- **`useBadgeRefresh`** — registers the store's `loadAutoDisabledTotal` (load) and a clear callback (reset to `undefined`) into the shared badge-refresh pipeline so the count stays current across the app.
- **`storeToRefs(store)`** — extracts `autoDisabledTotal` as a reactive ref bound to the Pinia store, preserving reactivity across component instances.

## Relationships

- **`src/modules/webhooks/badge-store.ts`** — provides `useWebhooksBadgeStore`, the Pinia store whose `autoDisabledTotal` state and `loadAutoDisabledTotal` action this composable reads and invokes.
- **`src/modules/webhooks/module.ts`** — module root that owns this composable; the nav entry (configured or registered at the module level) calls `useAutoDisabledBadge` to obtain the badge ref.

## Notes

- The return type is `number | undefined`, not `number | 0`. Consumers must treat `undefined` as "no badge," not zero.
- `readerId` gates the entire refresh cycle: if the viewer lacks `WebhookSubscription` read permission, the badge never loads and stays `undefined`.
- The JSDoc explicitly warns to call the composable **once**, from the `badge` accessor. Calling it multiple times would register duplicate refresh hooks.

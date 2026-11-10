---
source: src/modules/notifications/store.ts
sha256: 052d01dd9eee8c16be45ca88939d311e93240e41f84a828ff79f3c5177a70c3b
signature: ba7c17de94ff90dfc9a216b60a1c36aa5640239821d7c6cedb721526aab7a3e7
generated_at: 2026-11-10T04:48:57.521914+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/store.ts

## Purpose

Pinia store (setup-style) that bridges the server's notification inbox to the `@guebbit/vue-toolkit` message store. It owns the translation between a server `Notification` row and a toolkit `IToastMessage` (toast + persistent bell entry), every write the bell makes, and the concurrency guard that keeps in-flight reads from undoing newer mutations. It holds no list of its own; `items` is a computed view over the toolkit's `persistentMessages`.

## Key elements

- **`useNotificationsInboxStore`** – the exported store. Exposes `items`, `unreadCount`, `hasWork`, `sync`, and internal helpers.
- **`TOAST_MS` / `NO_AUTO_HIDE`** – 8 000 ms toast lifetime; `-1` means "bell-only, never auto-hide."
- **`INBOX_SOURCE` (`'inbox'`)** – stamp in `message.meta.source` that distinguishes this store's rows from other features' persistent messages.
- **`InboxMeta`** – shape kept in `meta`: the original `Notification` row plus the source stamp.
- **`ReadGuard`** – mutable set of ids pushed / deleted / `deletedAll` / `readAt` while a `GET` is in flight; used by `applyRead` so stale responses don't resurrect removed rows.
- **`TOAST_TYPE`** – maps `NotificationSeverity` → `EToastType` (`info` → `PRIMARY` because the toolkit lacks an `info` variant).
- **`notificationOf`** – safely extracts the server row from a toolkit message's `meta`.
- **`sentenceOf` / `targetOf`** – resolve display text and navigation target via the kernel notice registry (`noticeOf`).
- **`preferredLocales`** – ordered locale list (current, then fallback) for product-name translation.
- **`deleteOnServer`** – `DELETE` that treats 404 as success (already gone is the desired end-state).
- **`project(notification, announce)`** – upserts a row into the toolkit store; first-sighting during a refetch is hidden immediately (bell-only).
- **`applyRead(rows, guard)`** – reconciles the toolkit store with a server response, skipping rows the guard says were deleted/pushed meanwhile.
- **`sync()`** – full inbox read; uses `readTickets` (request-ticket barrier) to cancel stale responses; reports failures as toasts.
- **Computed state:** `inbox` (message + row pairs), `items` (`InboxItem[]` for the panel), `unreadCount` (bell badge), `hasWork` (staff-audience split).

## Relationships

- **`src/i18n/index.ts`** – imports `i18n` and `translate`; `preferredLocales` reads the active/fallback locale, `sentenceOf` calls `translate` for the "unknown" fallback key.
- **`src/infrastructure/utils/formatters.ts`** – imports `formatDate` and `formatDay`, passed into each notice's `describe()` callback so modules can format dates consistently.
- **`src/modules/notifications/components/NotificationsBell.vue`** – the bell component that renders `items`, `unreadCount`, and `hasWork`, and triggers `sync` / dismissal actions on this store.
- **`src/modules/notifications/composables/use-inbox-lifecycle.ts`** – orchestrates login / stream-reopen calls to `sync` and stream-frame handling that pushes new rows through `project`.
- **`src/modules/notifications/types.ts`** – source of the `InboxItem` interface that `items` is typed as.
- **`src/modules/notifications/tests/store.spec.ts`** – unit-tests the store's computed state, `project`, `applyRead`, and `sync` behaviour.

## Notes

- The store never owns a list; all rows live in the toolkit's `persistentMessages`. Filtering them back out depends on the `INBOX_SOURCE` stamp — any code that adds a persistent message *without* that stamp is invisible to this store.
- `project` with `announce: false` calls `hideMessage` immediately after `addMessage`, so a refetch never re-surfaces a toast the user already closed.
- The `ReadGuard` + `readTickets` pair is the concurrency model: `take()` on the ticket invalidates all earlier in-flight responses, and the guard's sets prevent a stale response from reviving rows deleted *after* it was issued.
- `info` severity deliberately maps to `EToastType.PRIMARY`, not `INFO`, because the toolkit's toast renderer has no `info` style; the shell renders `primary` as the neutral variant.
- `deleteOnServer` swallows 404 via `rethrowUnlessAbsent(error, 404)` — a 404 means another tab or the server cap already removed the row, which is the state the caller wanted.

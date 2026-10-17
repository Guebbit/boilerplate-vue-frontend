---
source: src/modules/notifications/store.ts
sha256: 8df3fe73e7224ea242e742c7fed26e23719d9a78aa31eb06e343609d04592b4a
generated_at: 2026-10-17T01:09:23.627871+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/store.ts

## Purpose
Pinia store that projects the server's notification inbox into the vue-toolkit's persistent message store. It owns the translation between a server `Notification` row and a toolkit message, the read/write reconciliation logic, and every mutation the bell triggers. It holds no list of its own — `items` is a computed view over the toolkit's `persistentMessages`.

## Key elements
- **`useInboxStore`** — the Pinia store (`defineStore('inbox', …)`). Exposes `items`, `unreadCount`, and the mutation verbs below.
- **`project(notification, announce)`** — adds a new toolkit message or updates an existing one in place. First sighting during a refetch is hidden immediately (bell-only); a fresh arrival gets an 8 s toast.
- **`sync()`** — `GET /notifications`, then `applyRead`. Uses `readTickets` to cancel stale answers. Reports failures as danger toasts.
- **`applyRead(rows, guard)`** — reconciles the toolkit store with the server's snapshot, respecting the `ReadGuard` (pushed / deleted / deletedAll / readAt) so concurrent mutations win over the stale read.
- **`receiveCreated(payload)`** — handles a WebSocket/SSE frame: notes the push in every in-flight guard and projects the notification with `announce = true`.
- **`reset()`** — kills in-flight reads via `readTickets.reset()`, removes all inbox messages silently (session end / logout).
- **`noteForReads(change)`** — broadcasts a mutation (delete, delete-all, read-all) to every `ReadGuard` in flight.
- **`deleteOnServer(id)`** — `DELETE` one notification; a 404 is swallowed via `rethrowUnlessAbsent` (already gone is not an error).
- **`notificationOf(message)`** — extracts the `Notification` from a toolkit message's `meta`, guarded by the `INBOX_SOURCE` stamp.
- **`preferredLocales()`** — returns `[current, fallback]` deduped, used for re-translating product names on language switch.
- **`TOAST_TYPE`** — maps server severity (`info`, `success`, `warning`, `error`) to toolkit `EToastType` (`PRIMARY`, `SUCCESS`, `WARNING`, `DANGER`).
- **`ReadGuard`** — interface tracking `pushed`, `deleted`, `deletedAll`, `readAt` so a late read answer cannot undo a concurrent write.
- **`InboxMeta`** — the shape stored in `message.meta`: `{ source: 'inbox', notification }`.

## Relationships
- **`./domain` (→ `domain/index.ts` → `domain/describe.ts`)** — imports `describeNotification` (builds the human-readable message text) and `notificationOrderId` (ordering key for `items`).
- **`./types`** — imports the `InboxItem` shape that `items` returns to the UI.
- **`NotificationsBell.vue`** — primary consumer of `items`, `unreadCount`, and the write verbs (`dismissMessage`, `removeMessage`, `hideMessage` via the toolkit).
- **`use-inbox-lifecycle.ts`** — calls `sync()` on login / stream-reopen, wires `receiveCreated` to the live stream, and calls `reset()` on logout.
- **`tests/store.spec.ts`** — unit-tests the store's projections, guards, and edge cases.
- **`tests/use-inbox-lifecycle.spec.ts` / `tests/notifications-bell.spec.ts`** — exercise the store indirectly through the lifecycle composable and the bell component.
- **`@/infrastructure/utils/errors.ts`** — `notifyErrorMessages` and `rethrowUnlessAbsent` for error surfacing and 404 tolerance.
- **`@/infrastructure/utils/request-ticket.ts`** — `createRequestTickets` for cancelling stale reads on user change.

## Notes
- **`INBOX_SOURCE` tag** — without it, a persistent message added by another feature could be mistaken for a notification. Always check `meta.source === 'inbox'` before reading `meta.notification`.
- **`NO_AUTO_HIDE = -1`** — toolkit convention meaning "never auto-hide"; used for bell-only messages.
- **`info → PRIMARY`** — the toolkit has no `info` variant; the shell renders `PRIMARY` as the neutral alert. Don't "fix" this to `INFO`.
- **Race-condition design** — `ReadGuard` + `readTickets` together ensure that a `GET` landing after a delete/delete-all/read-all never resurrects rows or un-reads them. Mutations call `noteForReads` *before* the server call so the guard is populated even if the server call is slow.
- **`404 on delete = success`** — another tab or the server's cap may have removed the row already; `rethrowUnlessAbsent(error, 404)` encodes that.
- **Data-flow diagram** — see `docs/modules/notifications.md` for the full picture of read, stream, and write paths.

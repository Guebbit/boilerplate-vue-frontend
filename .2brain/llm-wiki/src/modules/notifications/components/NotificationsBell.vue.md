---
source: src/modules/notifications/components/NotificationsBell.vue
sha256: 493c0420b81c420f11f0a7bd4df7153c347de0f631725b76b4c22b7fb761d5d1
signature: ae890395b9fbd9d60911c75ac6a5e7e37193519650b54d82c239140cbe1b55ef
generated_at: 2026-11-10T04:47:50.049118+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/components/NotificationsBell.vue

## Purpose

The app-bar bell and its dropdown panel, contributed to the shell's `app-bar` slot. It displays an unread badge, opens a panel that marks notifications read on the server and lists them newest-first (each with a delete button and a "Clear all" action), splits into "Mine"/"Work" tabs when the user holds staff notices, and serves as the mount point that kicks off the inbox lifecycle (fetch + live stream). Renders nothing for guests.

## Key elements

- **`mayRead`** — result of `useInboxLifecycle()`; gates rendering (`v-if="mayRead"`) and starts inbox fetch/stream while mounted.
- **`inbox`** (`useNotificationsInboxStore`) — Pinia store supplying `items`, `unreadCount`, `hasWork`, and the mutations `markAllRead()` / `dismissAll(audience?)`.
- **`freshIds`** (`ref<ReadonlySet<string>>`) — snapshot of unread ids captured at the moment the panel opens, so a "New" chip can still be shown after `markAllRead()` clears the flags.
- **`tab` / `shownItems`** — computed pair that filters the list by audience (`own` vs `staff`) when tabs are active; falls back to all items when `hasWork` is false.
- **`workCount`** — count of unread *or* freshly-read work notices for the Work tab badge (includes `freshIds` so the count doesn't drop to zero the instant the panel opens).
- **`clearAll`** — calls `inbox.dismissAll()` with the current tab's audience (or `undefined` for the whole inbox).
- **`targetLink`** (`useNotificationLink()`) — resolves a notification's `target` to a router path, or returns nothing if the build/reader has no route for it.
- **`onToggle(isOpen)`** — on open: captures `freshIds`, resets `chosenTab` to `'mine'`, fires `inbox.markAllRead()`.
- **`focusPanel`** — on `after-enter`, moves keyboard focus into the `v-card` if it isn't already the active element.
- **Template** — `v-menu` (activator: `v-badge` + `v-btn` with `Bell` icon) wrapping a `v-card[role="dialog"]` containing optional `v-tabs`, a scrollable `v-list` of items, per-item delete button, and an optional target `router-link`.

## Relationships

- **`use-inbox-lifecycle.ts`** — Called at setup; returns the `mayRead` boolean and internally starts the inbox fetch and WebSocket/SSE stream for the session.
- **`use-notification-link.ts`** — Provides `targetLink(target)`, which maps a notification's target descriptor to a route string or `null`.
- **`store.ts`** — `useNotificationsInboxStore` is the single source of truth for the list, unread count, `hasWork` flag, and the `markAllRead` / `dismissAll` mutations this component triggers.
- **`notifications-bell.spec.ts`** — Unit tests exercising the badge, panel toggle, tab filtering, fresh-chip logic, and clear-all behaviour.

## Notes

- `freshIds` is critical: without it, calling `markAllRead()` on open would zero every `unread` flag before the first render, making the "New" chip and `workCount` impossible.
- The panel uses `role="dialog"` (not `role="menu"`) because it contains interactive buttons and readable content, which the menu role forbids.
- `close-on-content-click` is explicitly `false` so that clicking "Clear all" or a per-item delete does not dismiss the panel.
- `chosenTab` always resets to `'mine'` on open; the Work tab's badge (`workCount`) is the signal that work is waiting.
- `item.type` is a Vuetify theme color name; the dot swatch is rendered via `bg-${item.type}` (dynamic class, hence the Tailwind restriction eslint-disable in the template).
- The component is mounted for the lifetime of the shell, so `useInboxLifecycle`'s side-effects (fetch, stream) live and die with it—no separate effect-management is needed elsewhere.

---
source: src/modules/notifications/components/NotificationsBell.vue
sha256: 1142c2f498d9c3084d01406a739b585bf284fa05147b30b86e1efee692f2f2fb
generated_at: 2026-10-17T01:08:09.145065+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/components/NotificationsBell.vue

## Purpose

The app-bar notification bell, contributed to the shell's `app-bar` slot via the module manifest. It renders an unread-count badge, opens a dialog panel listing notifications (newest first) with per-item delete and "Clear all", and bootstraps the inbox lifecycle (initial fetch + live stream) for signed-in users. Renders nothing for guests.

## Key elements

- **`useInboxLifecycle()`** — called once in `<script setup>`; starts the inbox fetch and live stream, returns `mayRead` which gates the entire component (`v-if`).
- **`useInboxStore()`** — Pinia store consumed via `storeToRefs`; exposes reactive `items` (list) and `unreadCount` (badge), plus write actions `markAllRead()`, `dismissAll()`, `dismiss(id)`.
- **`freshIds`** — `ReadonlySet<string>` snapshot of unread IDs taken the instant the panel opens. Used to render a "new" chip on items that were unread at open time, since `markAllRead()` immediately clears the unread flag.
- **`onToggle(isOpen)`** — on open: captures `freshIds`, then fires `inbox.markAllRead()`. On close: no-op.
- **`orderLink(orderId)`** — resolves an `OrderTarget` route via `linkIfRouted`; returns `undefined` when the item has no order or this build ships no `orders` module. Avoids a hard import dependency.
- **`focusPanel()`** — on `@after-enter`, programmatically focuses the panel card (`tabindex="-1"`) so keyboard users land inside the dialog rather than back on the bell.
- **`bellLabel`** (computed) — i18n-accessible name for the bell button that includes the unread count.

## Relationships

- **`../composables/use-inbox-lifecycle.ts`** — imported and invoked at setup; provides the `mayRead` gate and starts the inbox (fetch + WebSocket/live stream) for the session's duration.
- **`../store.ts`** — provides `useInboxStore`; the component reads `items`/`unreadCount` reactively and calls `markAllRead`, `dismissAll`, `dismiss` as user actions.
- **`../tests/notifications-bell.spec.ts`** — unit/component tests targeting this file's rendering, badge behavior, panel toggle, and accessibility attributes.

## Notes

- `close-on-content-click` is explicitly **false** on the `v-menu` so that clicking internal buttons (delete, clear-all) does not dismiss the panel.
- The panel uses `role="dialog"` (not `role="menu"`) because it contains interactive buttons and long-form text, which `role="menu"` does not permit.
- `freshIds` is a deliberate snapshot pattern: without it, the "new" indicator would vanish the instant the panel opens because `markAllRead` fires in the same tick.
- The color dot uses a dynamic Tailwind class `bg-${item.type}`; this requires `item.type` to always be a statically present theme color name (e.g. `primary`, `success`) for the utility to exist in the built CSS.
- `orderLink` uses `linkIfRouted` + `routerLinkI18n` rather than a direct route string, keeping the notifications module free of a compile-time dependency on an optional `orders` module.

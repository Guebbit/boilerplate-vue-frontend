---
source: src/modules/notifications/composables/use-inbox-lifecycle.ts
sha256: 6b98dd67de088cd688733920693d7667d5655097348e1e0ab6acefb5a5e42c8d
signature: f6600f053bded865446a16e14b5769b7697be015ba92fcc04392a0897d43c631
generated_at: 2026-11-10T04:48:00.688894+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/composables/use-inbox-lifecycle.ts

## Purpose

Vue composable that ties the notifications inbox to the signed-in session: it opens a Server-Sent Events stream and performs an initial read when an authenticated user is present, closes the stream and resets the inbox when the user leaves or switches accounts, and re-translates all notifications when the locale changes. It is meant to be called once from a long-lived shell component.

## Key elements

- **`useInboxLifecycle()`** (exported) — Entry point. Returns a `ComputedRef<boolean>` (`mayRead`) indicating whether the current session can see notifications. Internally wires up the SSE stream, inbox sync, and watchers.
- **`streamUrl()`** — Builds the absolute SSE endpoint by appending `/notifications/stream` to the REST base URL (honours `API_URL` override; does **not** use the `API_SSE` override).
- **`NOTIFICATION_EVENT_NAMES`** — Derived from `NOTIFICATIONS_CHANNELS`; the three event names the stream emits (`notifications.created`, `notifications.deleted`, `notifications.read`).
- **`handlers`** (local) — Maps each event name to the corresponding inbox-store method (`receiveCreated`, `receiveDeleted`, `receiveRead`).
- **`start()` / `closeStream()` / `refresh()`** (local) — Lifecycle helpers: `start` performs a fresh read then opens the SSE client; `closeStream` tears it down; `refresh` calls `inbox.sync()`.
- **`watch` on viewer id** — Keyed on `session.viewer?.id` (or `undefined`). On every change it closes the stream, resets the inbox, and restarts if a viewer is present. `{ immediate: true }` handles a restored session.
- **`watch` on `i18n.global.locale.value`** — Triggers `inbox.retranslate` so notification text follows the active locale.
- **`onScopeDispose(closeStream)`** — Ensures the stream is closed when the owning component unmounts.

## Relationships

- **`store.ts`** — Imports `useNotificationsInboxStore`; all stream events and the initial read are written through its `sync`, `receiveCreated`, `receiveDeleted`, `receiveRead`, `retranslate`, and `reset` methods.
- **`NotificationsBell.vue`** — Expected consumer. The JSDoc directs callers to invoke `useInboxLifecycle` from a component that lives as long as the app shell; the bell component fits that role and reads the returned `mayRead` ref for rendering.
- **`use-inbox-lifecycle.spec.ts`** — Unit-test file that exercises the composable's watchers, stream open/close behaviour, and locale re-translation logic.

## Notes

- The SSE stream is **not replayable**: any event written while the stream is closed is lost, so every `(re)open` is preceded by a fresh `inbox.sync()` read. This is the central invariant the module enforces.
- `mayRead` is a simple `session.isAuth` check — no permission/role query is made. Every signed-in account (including staff) gets an inbox; guests do not.
- The `onEvent` callback uses a type assertion (`handlers[name] as …`) because the compiler cannot correlate the generic `name`/`payload` pair; the cast is safe by construction.
- The floating promise from `inbox.sync()` inside `refresh` is intentionally suppressed (eslint-disable); the store handles its own error reporting.

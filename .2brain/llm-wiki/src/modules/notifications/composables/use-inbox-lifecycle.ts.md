---
source: src/modules/notifications/composables/use-inbox-lifecycle.ts
sha256: db94c7d61bda7f340270bb732e7ca6d3ef7821503ee67a60ddb24a5fa04fab15
generated_at: 2026-10-17T01:08:22.059246+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/composables/use-inbox-lifecycle.ts

## Purpose

Composable that binds the notifications inbox to the signed-in user's lifetime. While an authenticated user with `read` permission on `Notification` is present, it opens an SSE stream and performs an initial inbox read; when the user leaves or switches accounts it tears the stream down and empties the store. It also re-translates all inbox text when the app locale changes.

## Key elements

- **`useInboxLifecycle(): ComputedRef<boolean>`** — the sole export. Sets up the SSE stream, inbox sync, locale re-translation, and teardown. Returns `mayRead` so the caller can gate its own rendering.
- **`streamUrl(): string`** — builds the SSE endpoint as `${instance.defaults.baseURL}/notifications/stream`. Uses the REST base URL, not the separate `API_SSE` override.
- **`NOTIFICATION_EVENT_NAMES`** — array of channel names derived from `NOTIFICATIONS_CHANNELS`; passed to the SSE client as the set of events to subscribe to.
- **`handlers`** — object mapping each event name (`notifications.created`, `.deleted`, `.read`) to the corresponding `useInboxStore` method (`receiveCreated`, `receiveDeleted`, `receiveRead`).
- **`start()` / `closeStream()`** — open (stream + initial `inbox.sync()`) and close (dispose the `SseClient`) respectively.
- **`watch(() => mayRead ? session.viewer?.id : undefined, …)`** — reactive driver: restarts the inbox on account switch or initial login, stops it on logout. `immediate: true` covers a restored session.
- **`watch(i18n.global.locale.value, inbox.retranslate)`** — re-renders notification text on language change.
- **`onScopeDispose(closeStream)`** — guarantees cleanup when the owning component unmounts.

## Relationships

- **`src/modules/notifications/store.ts`** — `useInboxStore` is the state container; this composable calls `sync`, `reset`, `retranslate`, and the three `receive*` methods.
- **`src/modules/notifications/components/NotificationsBell.vue`** — the app-shell-level component that calls `useInboxLifecycle()` once and uses the returned `mayRead` to decide whether to render the bell UI.
- **`src/modules/notifications/tests/use-inbox-lifecycle.spec.ts`** — unit tests exercising the stream open/close, account-switch, and locale-change paths.

## Notes

- **SSE is stateless by design.** Frames written while the stream is down are never replayed, so every (re)open is preceded by a full `inbox.sync()` read. Do not rely on the stream to back-fill history.
- **The watch key is `viewer.id`, not `mayRead`.** Switching directly from one authenticated account to another (both with `mayRead === true`) still triggers a reset-and-restart because the id changes.
- **Stream URL ≠ `API_SSE`.** The `API_SSE` env override points at the observability stream; this inbox stream intentionally rides the standard REST base.
- **Type cast in `onEvent`.** The `(handlers[name] as …)(payload)` cast works around a limitation where the compiler cannot correlate the generic `name`/`payload` pair to a specific handler signature. It is safe by construction but should not be "simplified" away.
- Call `useInboxLifecycle()` exactly once, from a component whose scope matches the app shell lifetime (i.e., `NotificationsBell.vue`). Calling it from multiple components would open duplicate streams.

---
source: src/app/components/IdleSessionDialog.vue
sha256: db7d2d242c7b697e82401e2b2096d88b82a6c45e70a7bf033d547b89f5a8dc0c
signature: eac5fa27c228f89c3ede8e6fef75c2cba8fcef30bb2a50c508896d41e1f56307
generated_at: 2026-11-10T02:52:13.930787+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/IdleSessionDialog.vue

## Purpose

Staff idle-timeout courtesy dialog. Mounted once by `LayoutDefault.vue`, it renders a "still there?" prompt two minutes before the server's idle limit would expire, giving the visitor a chance to stay signed in rather than being silently dropped (WCAG 2.2.1 Timing Adjustable). The server enforces the timeout regardless; this component is the UX layer on top.

## Key elements

- **`remainingMs`** (computed) — Milliseconds until the session expires for inactivity, derived from `idle.lastActiveAt + idle.timeoutMs − now`. `undefined` when no timeout applies (e.g., shopper).
- **`isOpen`** (computed) — True when `remainingMs` is inside the 120 s warning window and still > 0. Drives `:model-value` on the dialog.
- **`countdown`** (computed) — Human-readable `m:ss` string for the visitor.
- **`tick()`** — Advances the internal `now` ref each second; when `remainingMs ≤ 0` calls `session.signalIdle()`.
- **`stay()`** — Calls `session.touchSession()` to reset the idle clock.
- **`leave()`** — Calls `session.logout()`.
- **`ticker`** — `setInterval` handle started in `onMounted`, cleared in `onUnmounted`.
- **`fullscreen`** — From `useFullscreenDialog`; makes the dialog fill the viewport on small screens.

## Notes

- `idle` is `undefined` for non-staff (shopper) sessions; in that case the component renders nothing visible.
- The countdown is driven by a local 1 s `setInterval`, not by the server. The server remains the source of truth for the actual timeout.
- The dialog uses `persistent` (no outside-click dismiss) and `role="alertdialog"` with explicit ARIA label/description IDs.
- `WARN_BEFORE_MS` is a module-level constant (120 000 ms); changing it affects when the prompt appears but not the server-side limit.
- `data-test` attributes (`idle-session-dialog`, `idle-session-stay`, `idle-session-leave`) are the stable hooks for E2E tests.

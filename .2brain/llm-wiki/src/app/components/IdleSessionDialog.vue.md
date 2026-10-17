---
source: src/app/components/IdleSessionDialog.vue
sha256: 015a971f7a3c9815b9091db184f1889bde064e084d75bad54984ed7a9284dd83
generated_at: 2026-10-17T00:05:32.011129+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/IdleSessionDialog.vue

## Purpose

A "still there?" prompt shown to staff 2 minutes before their idle session expires. It is mounted once by `LayoutDefault.vue`, counts down using the server's idle clock, and lets the user either extend the session ("Stay signed in") or end it explicitly. It exists as a WCAG 2.2.1 courtesy — the server enforces the timeout regardless.

## Key elements

- **`remainingMs`** (computed) — milliseconds left on the idle clock (`lastActiveAt + timeoutMs − now`); `undefined` when no timeout applies (e.g. shoppers).
- **`isOpen`** (computed) — true when the clock is inside the 2-minute warning window and above zero; drives the `<v-dialog>` `model-value`.
- **`countdown`** (computed) — human-readable `m:ss` string for the message.
- **`tick()`** — runs every second via `setInterval`; advances the clock and calls `session.signalIdle()` once the limit is reached.
- **`stay()`** — calls `session.touchSession()` to reset the idle timer.
- **`leave()`** — calls `session.logout()`.
- **`WARN_BEFORE_MS`** — constant `120_000` (2 min) defining the warning window.
- **Lifecycle** — `onMounted` starts the ticker; `onUnmounted` clears it.

## Relationships

No graph neighbors are recorded. The component imports from the session Pinia store (`useSessionStore`), `vue-i18n`, and Vuetify components. It is referenced (mounted) by `LayoutDefault.vue`.

## Notes

- **Shoppers see nothing:** `idle` is `undefined` for non-staff roles, so `remainingMs` stays `undefined` and the dialog never opens.
- **Server is authoritative:** this dialog is purely a courtesy layer; the backend will still terminate the session at its own deadline.
- **Persistent dialog:** the `<v-dialog>` is `persistent`, so it cannot be dismissed by clicking outside or pressing Escape — the user must choose "Stay" or "Leave".
- **Accessibility:** uses `role="alertdialog"` with `aria-labelledby` / `aria-describedby` pointing at the card title and text elements.
- **Testing hooks:** `data-test` attributes on the card, leave button, and stay button (`idle-session-dialog`, `idle-session-leave`, `idle-session-stay`).
- **All user-facing strings** go through `t('idle-session.*')` keys — no hardcoded copy in the template.

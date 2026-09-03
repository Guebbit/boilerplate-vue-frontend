# src/ui/dialog.ts

## Purpose

A Pinia store that replaces the synchronous `globalThis.confirm()` with an async, queue-based, themeable confirmation flow. Callers push a `DialogRequest` and await a `Promise<boolean>`; the `DialogHost` component renders the queue head and calls back with the viewer's answer.

## Key elements

- **`DialogRequest`** — Input shape for a confirmation: `message` (required), optional `title`, `confirmLabel`, `cancelLabel`, and `color` (`'primary' | 'error' | 'warning'`). All strings are expected pre-translated.
- **`DialogEntry`** — Extends `DialogRequest` with a monotonic `id` and a `resolve(answer: boolean)` function that settles the caller's promise.
- **`useDialogStore`** — Pinia store (`'dialog'`) exposing:
  - `queue` — `ref<DialogEntry[]>`, oldest-first; the host renders index 0.
  - `confirm(request)` — Pushes a new entry, returns a `Promise<boolean>` that never rejects.
  - `answer(answer: boolean)` — Shifts the head entry and calls its `resolve`. Intended for the host component to call once per user action.

## Relationships

- **`ui/organisms/DialogHost.vue`** (referenced in doc comments, not imported here) — Reads `queue[0]` for display and calls `answer(true|false)` on button click, Escape, or backdrop dismiss. This file deliberately avoids importing Vuetify or any component so it remains testable in jsdom.
- No other graph neighbors.

## Notes

- **Queue, not replace.** Two simultaneous `confirm()` calls both resolve, in FIFO order. A second dialog does not cancel or overwrite the first.
- **Strings are pre-translated.** This store owns no i18n dictionary; callers invoke `t()` before passing copy. The `color` field controls button styling only.
- **`confirm` never rejects.** Dismiss, Escape, and cancel all resolve `false`; accept resolves `true`. Callers can use `.then()` without a `.catch()`.
- **`nextId` is module-scoped** (a `let` inside the setup closure), not exposed. It increments once per `confirm` call.
- **`answer` uses `?.`** — calling it when the queue is empty is a silent no-op rather than an error.

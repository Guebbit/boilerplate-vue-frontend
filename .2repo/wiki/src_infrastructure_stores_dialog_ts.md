# src/infrastructure/stores/dialog.ts

## Purpose

Pinia store that replaces `globalThis.confirm()` with an asynchronous, themeable, queued confirmation flow. Callers push a `DialogRequest` and `await` a `Promise<boolean>`; a separate host component (`AppDialogHost.vue`) renders the queue's head and calls `answer()` to settle the caller's promise. The store intentionally knows nothing about Vuetify, theming, or translation.

## Key elements

- **`DialogRequest`** (interface) — the payload a caller passes to `confirm`: optional `title`, required `message`, optional `confirmLabel`/`cancelLabel`, optional `color` (`'primary' | 'error' | 'warning'`). All strings arrive pre-translated.
- **`DialogEntry`** (interface) — extends `DialogRequest` with a monotonically increasing `id` and a `resolve: (answer: boolean) => void` callback that settles the caller's promise.
- **`useDialogStore`** (Pinia setup store, id `'dialog'`) — exposes:
  - **`queue`** (`Ref<DialogEntry[]>`) — pending questions, oldest-first. The host renders index 0.
  - **`confirm(request): Promise<boolean>`** — pushes a new `DialogEntry` onto the queue; the returned promise resolves `true` on accept, `false` on decline/dismiss/Escape. Never rejects.
  - **`answer(answer: boolean)`** — shifts the head of the queue and calls its `resolve`. Called once per user click by the host.

## Relationships

No graph neighbors recorded. The store is consumed by `AppDialogHost.vue` (rendering) and by any caller that needs a confirmation prompt. It imports only `vue` (`ref`) and `pinia` (`defineStore`).

## Notes

- **Queue, not stack, not replace.** Concurrent calls each get their own promise and are answered strictly FIFO. A second `answer()` call while the queue is empty is a safe no-op (`entry?.resolve`).
- **No i18n inside the store.** The store sits in the bottom infrastructure tier and owns no translation dictionary; callers must pass already-translated strings.
- **`confirm` never rejects.** Dismiss, Escape, and the cancel button all resolve `false` — callers only need a single `.then` / `await`, no `catch`.
- **`nextId` is a closure variable**, not reactive state; it exists solely to give each entry a stable ordering key.
- **Testability:** because the store holds only data and promises (no DOM, no Vuetify), it is unit-testable in jsdom without mounting a component tree.

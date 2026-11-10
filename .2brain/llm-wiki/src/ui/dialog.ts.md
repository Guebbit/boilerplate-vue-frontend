---
source: src/ui/dialog.ts
sha256: f897c15442e111da945c7f23334bb87950d2260c436203791981522e90b55e9a
signature: c24dd73649e02dc960eefa8f0cbb17e30a504a5804261fb9ff515afa575977bf
generated_at: 2026-11-10T06:26:17.345560+00:00
model: ollama:qwen3.8:27b
---

# src/ui/dialog.ts

## Purpose

A Pinia store that replaces the synchronous, un-themeable `globalThis.confirm()` with an async, queueable, promise-based confirmation dialog. Callers push a `DialogRequest` and `await` a `boolean` resolution; a separate host component renders the queue's head and calls back to settle the promise.

## Key elements

- **`DialogRequest`** (exported interface) — The shape of one confirmation: `title?`, `message`, `confirmLabel?`, `cancelLabel?`, `color?` (`'primary' | 'error' | 'warning'`). All strings arrive pre-translated.
- **`DialogEntry`** (internal interface) — Extends `DialogRequest` with a monotonically increasing `id` and the `resolve` callback that settles the caller's promise.
- **`useDialogStore`** (exported, `defineStore('dialog', …)`) — Exposes:
  - `queue` — reactive array of pending `DialogEntry[]`, oldest-first.
  - `confirm(request)` — pushes an entry and returns a `Promise<boolean>` that never rejects.
  - `answer(answer)` — shifts the head of the queue and resolves its promise; no-op if the queue is empty.

## Notes

- **Queue, not replace.** Simultaneous `confirm` calls (e.g. a row-delete racing a navigation guard) are answered strictly FIFO; a click on dialog N never resolves dialog N+1.
- **Promise never rejects.** Dismissal (Escape, close) resolves `false`, same as a cancel click.
- **No i18n ownership.** The store is design-system code; callers must pass already-translated strings via their own `t()`.
- **`message` naming rule.** For a single-row destructive action the message must name that specific row (e.g. `t('…confirm-delete', { name: item.title })`); a bare "delete this item?" is treated as a bug. Bulk or self-only actions are the sole exception.
- **jsdom-friendly.** Because the store holds only the queue and promises with no component dependency, it is unit-testable without mounting a component tree.
- **Rendering lives elsewhere.** The companion `ui/organisms/DialogHost.vue` reads `queue[0]` and calls `answer(true | false)`; this file imports no Vuetify component.

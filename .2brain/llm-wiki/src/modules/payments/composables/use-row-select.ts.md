---
source: src/modules/payments/composables/use-row-select.ts
sha256: 6f0727cce4b83e56e07ae63288301bc43f00ba6c076aa1ade3aa7f258226c5b4
signature: 98c69d8c078b7519ff99fdba9e456514e5ed5a7369969c7b03ca0ca01bfcd096
generated_at: 2026-11-10T05:11:53.277787+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/composables/use-row-select.ts

## Purpose

Provides a one-shot row-selection model for payments tables. Instead of persisting a selection state, it captures a click, resolves the row, fires a callback, and immediately clears itself—so the same row can be "opened" repeatedly without a lingering highlight.

## Key elements

- **`useRowSelect<TRow extends { id: string }>(rows, onPick)`** — The sole export. Accepts a reactive row list and a pick handler; returns a `Ref<string | undefined>` meant to be bound as the table component's selection `v-model`.
- **Internal `selectedId` ref + `watch`** — On each selection change the watcher looks up the matching row by `id`, resets `selectedId` to `undefined` (clearing the highlight), then invokes `onPick` with the resolved row object.

## Relationships

- **`AwaitingTransfersTable.vue`** — Consumes `useRowSelect`; binds the returned ref to its selection prop and passes an `onPick` callback that navigates/opens the awaiting-transfer detail.
- **`PaymentsTable.vue`** — Same consumption pattern; the `onPick` callback drives the payments detail view.

Both tables rely on the composable to translate a raw selection event into a domain-level "open row" action without managing selection state themselves.

## Notes

- The selection is intentionally ephemeral: the `watch` fires *before* `onPick`, sets `selectedId` back to `undefined` in the same tick, so the table never shows a persistent selected row. If a component also tries to read `selectedId` after `onPick`, it will already be `undefined`.
- The generic constraint is only `{ id: string }`; the composable performs no other validation on row shape.
- If no row matches the selected id, `onPick` is simply not called (silent no-op).

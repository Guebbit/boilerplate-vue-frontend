---
source: src/ui/organisms/DialogShell.vue
sha256: 7e20919239a19c16b0b1173d3003c8886c01770e0b478401af6dec587f3cd0a7
signature: 4a5180b9e1fa89a12d7219a3cdab14724dc9825f9f8abc8fbe9d916f8c61cc17
generated_at: 2026-11-10T06:31:11.130937+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/DialogShell.vue

## Purpose

A thin, presentational wrapper around Vuetify's `v-dialog` that standardises three cross-cutting concerns for every form/step dialog: fullscreen sizing on small screens, accessible naming via an auto-generated `titleId`, and focus return to the opener on close. It renders no content of its own — the caller supplies the `v-card` and everything inside it through a single slot.

## Key elements

- **`isOpen` (`defineModel<boolean>`, required)** — two-way binding controlling whether the dialog is open; passed straight to `v-dialog`'s `v-model`.
- **Default slot (`{ titleId: string }`)** — the only slot. The caller renders the `v-card` and all inner content; `titleId` must be placed on the heading so the dialog is announced by its title.
- **`titleId`** — generated with Vue's `useId()`; bound to `aria-labelledby` on the `v-dialog` and exposed to the slot.
- **`fullscreen`** — reactive boolean from `useFullscreenDialog()`; bound to `v-dialog :fullscreen` so the dialog fills the viewport on a phone.
- **`useReturnFocus(() => isOpen.value)`** — composable that restores focus to the triggering element once the dialog closes.
- **Attribute fall-through** — undeclared attributes (`max-width`, `data-test`, `role`, `persistent`, `aria-describedby`, …) pass through to the underlying `v-dialog`.

## Relationships

No graph neighbors are registered for this file.

## Notes

- The component intentionally has **no `v-card` of its own**; the DOM inside the dialog belongs entirely to the caller. Do not add markup here.
- The slot consumer **must** apply `titleId` to the heading element; without it the dialog is announced generically as "dialog" by screen readers.
- `defineModel` is marked `required: true` — passing no `v-model` is a type error.
- Because only undeclared attributes fall through, any prop the caller *does* want on the `v-dialog` (e.g. `persistent`, `max-width`) is passed as an HTML attribute, not a prop, from the call-site perspective.

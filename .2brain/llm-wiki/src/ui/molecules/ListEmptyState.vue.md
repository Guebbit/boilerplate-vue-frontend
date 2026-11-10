---
source: src/ui/molecules/ListEmptyState.vue
sha256: 06c41f9a57ad6dd12f60e87b4208c7f4be3ee0afa1a108d56042ea4c7ead912b
signature: b23e80cc1f1d2005f68de5addb088db54f6474748df7460d9812a0b0610dfeea
generated_at: 2026-11-10T06:28:05.024636+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/ListEmptyState.vue

## Purpose
A presentational molecule that standardises the "no rows" state across all lists. It renders a headline, a 64 px secondary-coloured icon, and an optional call-to-action area, so individual list views never re-implement this markup. The component is a thin wrapper around Vuetify's `v-empty-state`.

## Key elements
- **`title` prop** (`string`) — the already-translated headline displayed by `v-empty-state`.
- **`icon` prop** (`Component`) — a `lucide-vue-next` component rendered at 64 px in the `#media` slot with `text-secondary` and `aria-hidden="true"`.
- **`actions` slot** (optional) — rendered inside `v-empty-state`'s `#actions` slot only when the parent provides it; typically holds one or more buttons.
- **Fall-through attributes** — any extra attributes (e.g. `data-test`, `text`) are inherited by the underlying `v-empty-state`.

## Relationships
No graph neighbours are recorded for this file. It depends on the Vuetify `v-empty-state` component and expects an icon component from `lucide-vue-next`, but no project-internal imports are present.

## Notes
- The `icon` prop is typed as the generic Vue `Component`, but the doc comment specifies it must be a `lucide-vue-next` import; the 64 px size and `text-secondary` colouring are owned here so callers don't repeat them.
- The `actions` slot is conditionally rendered (`v-if="$slots.actions"`), meaning the `#actions` region of `v-empty-state` is simply absent when no slot is provided.
- The icon is purely decorative (`aria-hidden="true"`); screen-reader users rely on the `title` text alone.

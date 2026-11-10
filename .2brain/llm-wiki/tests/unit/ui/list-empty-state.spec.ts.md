---
source: tests/unit/ui/list-empty-state.spec.ts
sha256: d4320cc5e635b60cbeae3be75ce5b221eeff24ea2cf3c019c40b33ff119c6f69
signature: 80caff040096ae7b5b73d0f5e7d0e4b7810fb2618ef84ab9416452a2f92b4f3c
generated_at: 2026-11-10T08:27:11.079756+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/list-empty-state.spec.ts

## Purpose

Unit test for `ListEmptyState.vue`, the shared "no rows" empty-state component. It verifies three rendering contracts: the title text and decorative icon appearance, the conditional `actions` slot, and attribute fallthrough to the component root.

## Key elements

- **`mountState`** — factory helper that mounts `ListEmptyState` with a fixed `title` prop (`"Nothing here"`), the `Inbox` icon from `lucide-vue-next`, a `data-test="empty"` attribute, an optional `slots` record, and the shared Vuetify plugin registered globally.
- **"shows the title and a decorative secondary icon"** — asserts the title text is rendered, the `<svg>` carries the `text-secondary` class, and `aria-hidden="true"` is present (decorative, not semantic).
- **"renders the actions slot only when given"** — asserts the `actions` slot content is absent by default and appears when a slot is supplied.
- **"lets other attributes reach the root"** — asserts a non-prop attribute (`data-test`) falls through to the component's root element.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The icon is **`aria-hidden="true"`** by contract — it is purely decorative. Any future change to make it a meaningful/icon-button icon must update this assertion.
- Attribute inheritance is tested via the `attrs` key in `mount()` options (not `props`), which is the Vue 3 fallthrough mechanism. This is distinct from passing a regular prop.
- The component is always mounted inside the Vuetify plugin context (`global.plugins`); the empty-state UI (e.g., `text-secondary`) depends on Vuetify's theme classes being available.

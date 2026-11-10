---
source: tests/unit/ui/form-card.spec.ts
sha256: 351cd77944feb47fe6d8627ad8ecc27fb76c1c11cfc9901c5d94a902f0b009e7
signature: ca80a95f55c6a6046ddae78acdcae1e97743d22961c423cd0287e25df4f8120d
generated_at: 2026-11-10T08:25:39.666266+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/form-card.spec.ts

## Purpose

Unit tests for `FormCard.vue` that pin the contract between a page component and its form element. Rather than asserting markup appearance, the suite verifies the seam created by `defineExpose`: that a parent page's `formElement` ref actually resolves to a real `<form>` element, that slotted fields live inside it (so `querySelector`-based focus management works), and that submit is emitted to the parent instead of triggering a browser navigation. A second block covers the card's UI props (size classes, back-link presence, slot ordering, submit-button attributes).

## Key elements

- **`mountCard(props, slots)`** — helper that mounts `FormCard` with Vuetify, a memory-history router, a default back-link prop, and a default `<input>` in the default slot.
- **`exposedFormOf(wrapper)`** — reads the form `Ref` from `wrapper.vm.$.exposed` (the component's public exposure) rather than from `wrapper.vm`. Deliberately bypasses Vue Test Utils' closed-component shortcut so the assertion fails if `defineExpose` is removed.
- **`describe("…the seam between the page and its form")`** — three tests: exposed element is the `<form>` itself; slotted fields are queryable inside it; `submit` event is emitted (not browser-submitted).
- **`describe("…size, back link and slots")`** — four tests: `size` prop toggles width/margin classes; no back-link anchor rendered without a target; slot order (before → fields → submit → after-submit → footer) verified via `indexOf` positions; `submitColor`/`submitTest` props forwarded to the button.
- **`router`** — a minimal memory-history router with a single stub route (`ProductsList`), supplied so the card's back-link prop has a resolvable route name at mount time.

## Relationships

No graph neighbors are recorded for this file. It imports `FormCard.vue` (the unit under test), the Vuetify plugin instance, and `vue-router` for the mount harness.

## Notes

- **`wrapper.vm` vs `$.exposed`:** In a `<script setup>` SFC, `wrapper.vm` reaches *all* bindings regardless of exposure. The test reads `wrapper.vm.$.exposed` specifically so that deleting `defineExpose` from the SFC causes a test failure. The `eslint-disable` on that line is intentional and explained inline.
- **Submit test is async:** `wrapper.find('form').trigger('submit')` returns a Promise; the test `return`s it so Vitest awaits it before asserting on `wrapper.emitted('submit')`.
- **Slot-order test** uses `String.prototype.indexOf` on the rendered HTML and compares the resulting index array against its sorted copy — a simple "all present and in order" check without DOM-tree traversal.
- The file does **not** assert general visual rendering (spacing, typography, Vuetify component internals). Its scope is the public contract a parent page relies on.

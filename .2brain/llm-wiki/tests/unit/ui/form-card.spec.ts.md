---
source: tests/unit/ui/form-card.spec.ts
sha256: 5e1a4164e5a50b7f51d2157dc4586af938042ac1f94dbc3170f88808c7b9463f
generated_at: 2026-10-17T02:45:58.282316+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/form-card.spec.ts

## Purpose

Unit test for `FormCard.vue` that pins the public `defineExpose` seam: it verifies the `<form>` element is actually reachable via the exposed `formElement` ref and that slotted fields live inside it. It complements `tests/cross-cutting/form-idiom` (which checks the consumer side — that a page *passes* a `formElement`) by checking the provider side (that something is *on the other end*). Without this, a broken `defineExpose` would be silent: pages would still render errors but lose keyboard/screen-reader focus on submit.

## Key elements

- **`mountCard()`** — mounts `FormCard.vue` with Vuetify, a single-route memory-history router, a default slot (`<input class="field" name="title" />`), and the props `submitLabel`, `backTo`, `backLabel`.
- **`exposedFormOf(wrapper)`** — reads `wrapper.vm.$.exposed.formElement.value`. Deliberately uses `.$` (the internal instance) rather than `wrapper.vm`, because `<script setup>` components are closed: `wrapper.vm` would resolve bindings regardless of `defineExpose`, letting the assertion pass even if the expose were deleted.
- **Test: "exposes the form element itself"** — asserts the exposed value is the same DOM node as `wrapper.find('form').element` (not a wrapper div).
- **Test: "renders slotted fields inside that element"** — asserts `exposedFormOf(...)?.querySelector('.field')` is non-null, confirming `querySelector`-based focus logic will find the fields.
- **Test: "reports a submit to the page rather than letting the browser send the form"** — triggers a native `submit` on the `<form>` and expects exactly one `submit` emit (i.e., the component intercepts default navigation).

## Relationships

No graph neighbors are recorded for this file. It imports `@/ui/organisms/FormCard.vue`, `@/ui/vuetify`, and `vue-router` (memory history only).

## Notes

- The `eslint-disable-next-line` on `exposedFormOf` is intentional and scoped to that single line: TS-ESLint cannot fully resolve a `.vue` SFC's instance type, and `.$` is the one deliberate escape hatch the test needs.
- The router exists solely so the `backTo` prop resolves to a valid route name; no navigation behavior is exercised here.
- The Vuetify plugin is required at mount time (form layout components); it is not the subject of any assertion.

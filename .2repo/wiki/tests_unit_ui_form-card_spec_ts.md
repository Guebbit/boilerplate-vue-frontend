# tests/unit/ui/form-card.spec.ts

## Purpose

Unit test for `FormCard.vue` that pins the `defineExpose` seam between a page component and the `<form>` element one level below it. It verifies that `formElement` actually resolves to the real `<form>` node, that slotted fields live inside that node (so `querySelector`-based focus logic can find them), and that submit is emitted to the parent rather than triggering a browser form send.

## Key elements

- **`mountCard`** — helper that mounts `FormCard` with a sample slot (`<input class="field">`), a router (memory history, one route for the `backTo` prop), and the Vuetify plugin. Returns a `VueWrapper`.
- **`exposedFormOf`** — reads `wrapper.vm.$.exposed.formElement.value`. Deliberately bypasses `wrapper.vm` because `<script setup>` components are closed: `wrapper.vm` would still reach internal bindings even if `defineExpose` were removed, making the assertion vacuous.
- **Test: "exposes the form element itself"** — asserts the exposed ref points to the exact `<form>` DOM node, not a wrapper div.
- **Test: "renders the slotted fields inside that element"** — asserts `querySelector('.field')` on the exposed element succeeds, guarding against fields rendered outside the form container.
- **Test: "reports a submit to the page"** — triggers `submit` on the form and asserts the `submit` event is emitted exactly once (i.e. the component intercepts rather than letting the browser navigate).

## Relationships

No graph neighbors listed. The file imports `FormCard.vue`, `@/ui/vuetify`, `vue-router`, and `@vue/test-utils`, but the dependency graph reports no related files.

## Notes

- The `exposedFormOf` helper is the critical guard: any refactor that moves the form into a wrapper or removes `defineExpose` will be caught here but would pass if tested through `wrapper.vm` directly.
- The router is a minimal memory-history instance with a single dummy route (`/:locale/products`). It exists only so the `backTo` prop and any internal `router-link` resolve; it is not under test.
- The file's doc comment explicitly references `tests/cross-cutting/form-idiom` as the complementary check (that a page *passes* `formElement`), positioning this file as the "other end" assertion.

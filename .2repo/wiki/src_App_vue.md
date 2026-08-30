# src/App.vue

## Purpose

The composition root of the application. It intentionally contains no domain logic or state—only the `<RouterView />` outlet and a single accessibility live region. All global installs (Pinia, router, i18n, Vuetify) and cross-cutting concerns are handled elsewhere, keeping this file minimal so it stays safe as the first file any derived project inherits.

## Key elements

- **`<script setup lang="ts">`** – Imports `RouterView` (vue-router) and `routeAnnouncement` (a reactive ref from `@/app/router/announcer.ts`). Contains only a doc comment explaining the file's invariants.
- **`<template>`** – Renders two things and nothing else:
  - `<RouterView />` – the outlet where matched route components mount.
  - `<p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-test="route-announcer">` – a visually-hidden live region that reads out the current route's title after every navigation. It is bound to `{{ routeAnnouncement }}`.

## Relationships

- **`src/main.ts`** – The real composition root. `App.vue`'s own doc comment states that everything the application needs (Pinia, router, i18n, Vuetify) is installed there before `App.vue` mounts. `App.vue` is purely a rendering surface that `main.ts` mounts.
- **`index.html`** – The browser entry point that loads the JS bundle which ultimately instantiates `App.vue` as the root component.

## Notes

- **Keep it empty.** The doc comment is a hard rule, not a suggestion: no domain state, no component logic, no imports beyond what the template literally renders. State parked here outlives the folder it originated from in every derived project.
- **The live region must stay here.** It is placed *outside* any layout component so it (1) exists before the first route component mounts and (2) survives the unmount/mount cycle between two route components. A region re-created alongside a page is not announced by screen readers because the previous node is already gone.
- **`data-test="route-announcer"`** is the stable selector for E2E/accessibility tests; do not rename or remove the attribute without updating those tests.

---
source: src/ui/molecules/TourButton.vue
sha256: a2eb3138d9e1f5c71621a6a9d40a77de70da0bbb6af0ff3161056edcb6fde0bd
signature: c5b0ae64f28983c5fd172e659d1d961c0f28be6d6c83d25b08f7370dd7795461
generated_at: 2026-11-10T06:29:16.149541+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/TourButton.vue

## Purpose

A small "help" button rendered on pages that offer a guided tour. It carries no tour logic of its own — clicking it simply appends `?tour=<id>` to the current route's query string, which the app shell's `AppTourHost` watches and acts on. The button is entirely hidden when the deployment has tours disabled.

## Key elements

- **`props.tour`** (`string`) — Catalogue id of the tour this page offers; passed by the parent page.
- **`enabled`** — Boolean derived from `readToursEnabled()` (`@/infrastructure/runtime-config.ts`); gates rendering via `v-if`.
- **`open()`** — Calls `router.push({ query: { ...route.query, tour: props.tour } })`, preserving existing query params. The floating-promise is intentionally un-awaited (vue-router reports failures via `router.onError` in `app/router/index.ts`).
- **Template** — A Vuetify `v-btn` (variant `"text"`, size `"small"`) with a `CircleHelp` icon (18 px) and i18n label. Exposes `data-test="tour-<id>"` for E2E selectors and an `aria-label` from `t('tours.button-label')`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The button is a pure "door-opener": the actual tour lifecycle (mount, step navigation, close) lives elsewhere. Do not add tour state here.
- `router.push` is called with `void` and an eslint-disable for `@typescript-eslint/no-floating-promises`. This is intentional — navigation errors surface through the global `router.onError` handler, not a local `.catch`.
- Visibility is a deployment-level switch (`readToursEnabled`), not a per-user or per-route flag. If you need per-page opt-out, hide the component at the parent, not here.

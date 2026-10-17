---
tags:
  - 2brain
  - 2brain/module
  - project/boilerplate-vue-frontend
type: module
module: src/ui/organisms/
files: 12
updated: 2026-10-17T02:57:01.808970+00:00
---

# src/ui/organisms/

## Purpose

`organisms/` holds the mid-level, reusable Vue components that sit between leaf UI atoms and full feature pages. Each component owns a self-contained chunk of UI (a card section, a data table, a dialog, a tab bar) and exposes a narrow `v-model` / slot / event surface so that feature views can compose them without re-implementing shared behavior.

## Key parts

- **Card display pieces** — `CardDetail.vue`, `CardInfo.vue`, `CardMaterialStat.vue`: sub-sections of a product/material card (detail fields, info block, material statistics) that a detail page composes together.
- **Data table** — `DataTable.vue` + `data-table-headers.ts`: a generic `T extends object` wrapper around Vuetify's `v-data-table` that maps the app's `CoreDataTableHeader<T>` shape, adds opt-in single-row selection and sorting, swaps in an accessible loading bar, and forwards `header.*`/`item.*` slots. Pagination is always server-side; the footer is hidden.
- **Dialogs** — `DialogHost.vue`, `SecretRevealModal.vue`: a shared dialog host and a blocking one-time secret-reveal dialog (credential shown once, confirm-and-dismiss pattern) used by every module that mints a machine credential.
- **Form building blocks** — `FormCard.vue`, `HumanCheck.vue`, `TranslationTabs.vue`: a card container for forms; a provider-neutral anti-bot challenge (ALTCHA / Turnstile / none) that hands its token to the host form via a template ref; and a purely presentational locale tab bar with add/remove language controls.
- **Item detail layout** — `ItemDetailHero.vue`, `ItemDetailLayout.vue`: the hero/banner and page scaffold for an item's detail view.

## How it connects

No other module in the dependency graph is listed as a dependency of `organisms/`. This module is a terminal (consumer-side) layer: feature pages and views import these components to assemble their screens, but the organisms themselves do not pull in other internal modules. They depend only on third-party libraries (Vuetify, vendor web components/iframes) and on a small set of API endpoints (e.g. `GET /antibot/config`).

## Where to start

1. **`DataTable.vue`** – it has the richest documented contract (generics, slot forwarding, selection/sort opt-ins) and is the most widely reused component here. Reading it shows the standard "wrapper + slot passthrough" pattern the rest of the module follows.
2. **`TranslationTabs.vue`** – a compact example of the module's design philosophy: purely presentational, all state owned by the caller via `v-model` and events, no side-effects on mount. Useful as a quick reference for the prop/event conventions used across the other organisms.

## Connected modules
_(none)_

## Files
- `src/ui/organisms/CardDetail.vue`
- `src/ui/organisms/CardInfo.vue`
- `src/ui/organisms/CardMaterialStat.vue`
- `src/ui/organisms/DataTable.vue` — A generic (`T extends object`) wrapper around Vuetify's `v-data-table` that translates the app's `CoreDataTableHeader<T>` shape into Vuetify's expected format, provides optional single-row selection and sorting (both opt-in via bound `v-model`/`v-model:sort-by` listeners), swaps in the accessible `TableLoadingBar`, and forwards `header.*`/`item.*` slots from the calling view. Pagination is always server-side; the footer is hidden.
- `src/ui/organisms/DialogHost.vue`
- `src/ui/organisms/FormCard.vue`
- `src/ui/organisms/HumanCheck.vue` — Provider-neutral anti-bot challenge widget. On mount it fetches `GET /antibot/config`, then renders the currently active vendor (ALTCHA web component or Cloudflare Turnstile iframe) or nothing if the provider is `none`. A hosting form reads the solved token via a template ref and attaches it to its own submit; this component never calls the protected route itself.
- `src/ui/organisms/ItemDetailHero.vue`
- `src/ui/organisms/ItemDetailLayout.vue`
- `src/ui/organisms/SecretRevealModal.vue` — A blocking, one-time secret-reveal dialog. It displays a plaintext credential (e.g. a webhook subscription secret or a minted API key) exactly once, requires the visitor to explicitly confirm they saved it via a checkbox, and then emits `done`. Shared across every module that mints a machine credential; only the `title`/`intro` wording differs per call site.
- `src/ui/organisms/TranslationTabs.vue` — A shared, purely presentational tab bar for every per-locale translation screen (product create/edit forms and the generic entity-translations screen). It renders one tab per open locale, provides an "add language" picker, and exposes a single remove button. All state and data ownership lives with the caller via `v-model` and events.
- `src/ui/organisms/data-table-headers.ts`

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]

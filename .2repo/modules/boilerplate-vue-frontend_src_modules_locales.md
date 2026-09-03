---
tags:
  - 2repo
  - 2repo/module
  - project/boilerplate-vue-frontend
type: module
module: src/modules/locales/
files: 21
updated: 2026-09-03T10:59:06.952593+00:00
---

# src/modules/locales/

## Purpose

The locales module is the admin-facing translation-management domain. It provides the screens and logic a translator or admin uses to manage the language manifest, add or edit individual translation entries, and work a side-by-side "dictionary board" where every i18n key is visible across all languages simultaneously. It is the *authoring* side of the i18n tier; the runtime *rendering* side lives in `infrastructure/i18n/locale-overrides.ts` and does not import anything from here.

## Key parts

- **Views (three route screens)** — `views/LocalesList.vue` (languages CRUD board), `views/LocalesDictionary.vue` (key × language matrix), and `views/LocaleEntries.vue` (paginated entries for one language). Each is the top-level component for one admin route.
- **Dictionary-board composables** — `composables/use-dictionary-aggregation.ts` merges the three locale data sources (stored entries, API baseline, bundled baseline) into a single per-cell read model; `composables/use-dictionary-cell-editor.ts` owns the per-cell write lifecycle (draft, save, transient UI state).
- **Dialog components** — `components/LanguageFormDialog.vue`, `components/EntryFormDialog.vue`, and `components/EntriesImportDialog.vue` are purely presentational: they validate locally (Zod), reset on open, and emit results upward so the parent view or store handles persistence.
- **Store** — `store.ts` is a single Pinia setup-style store that manages the language manifest and one language's paginated entries via `useStructureCrudApi`.
- **Schemas & conversion** — `schemas.ts` holds the Zod form schemas (with locale-aware error thunks); `dictionaries.ts` provides the pure `flattenDictionary` / `expandEntries` pair that converts between vue-i18n's nested shape and the API's flat dotted-key rows.
- **Module wiring** — `module.ts` is the `AppModule` manifest (routes, nav, response-schema rows, dictionary loaders); `routes.ts` declares the three admin-only route records; `response-schemas.ts` pairs each admin locale endpoint with its Zod response schema.
- **Tests** — Unit specs for the store, aggregation composable, import-dialog gate logic, dictionary conversion, and route access declarations; two e2e files that register the module's screens with shared a11y and visual-regression sweepers.

## How it connects

- **`src/infrastructure/`** — The module manifest in `module.ts` is consumed by the kernel registry that lives in the infrastructure layer. The response-schema rows declared in `response-schemas.ts` are picked up by the global response-envelope validator there. Conversely, the infrastructure's i18n override module (`infrastructure/i18n/locale-overrides.ts`) is the *consumer* side and deliberately has no import of this module.
- **`tests/support/` & `tests/cross-cutting/`** — The a11y spec (`tests/e2e/a11y.cy.ts`) and visual-regression spec (`tests/e2e/locales.visual.cy.ts`) register this module's routes with the shared `sweepA11y` and `sweepVisual` runners provided by those directories, so the locales pages are covered without duplicating axe or screenshot-diff logic.
- **Repository root (`/`)** — The `AppModule` shape that `module.ts` implements is defined at the kernel/registry level; the module registers itself into that registry at bootstrap.

## Where to start

1. **`module.ts`** — It is the single-file manifest that lists every route, the nav entry, the response-schema rows, and the dictionary loaders. Reading it first gives you the module's full surface area in under a minute.
2. **`composables/use-dictionary-aggregation.ts`** — Once you know *what* the module does, this file shows *how* the core read path works: three sources are merged into one per-cell answer that the dictionary board and the entry table both consume. Pairing it with the store (`store.ts`) makes the data flow clear.

## Connected modules
```mermaid
flowchart LR
    m_src_modules_locales["src/modules/locales/"]
    m_root["/ (repository root)<br/>33 files"]
    m_scripts["scripts/<br/>13 files"]
    m_src_infrastructure["src/infrastructure/<br/>21 files"]
    m_tests_cross_cutting["tests/cross-cutting/<br/>11 files"]
    m_tests_support["tests/support/<br/>13 files"]
    m_src_modules_locales --- m_root
    m_src_modules_locales --- m_scripts
    m_src_modules_locales --- m_src_infrastructure
    m_src_modules_locales --- m_tests_cross_cutting
    m_src_modules_locales --- m_tests_support
    style m_src_modules_locales stroke-width:3px
```

[[boilerplate-vue-frontend_ROOT|/ (repository root)]] · [[boilerplate-vue-frontend_scripts|scripts/]] · [[boilerplate-vue-frontend_src_infrastructure|src/infrastructure/]] · [[boilerplate-vue-frontend_tests_cross-cutting|tests/cross-cutting/]] · [[boilerplate-vue-frontend_tests_support|tests/support/]]

## Files
- `src/modules/locales/components/EntriesImportDialog.vue` — A Vuetify dialog that lets a user import locale entries by pasting or uploading a JSON dictionary (the same shape as `src/locales/*.json` files), flattens it into `LocaleEntryInput[]` rows, and emits the result upward. It presents a tenant selector and a merge/replace mode choice, with an extra confirmation step for destructive replaces. The component performs no persistence itself — it only parses, validates shape, and emits.
- `src/modules/locales/components/EntryFormDialog.vue` — A modal dialog for adding a single locale entry (tenant, key, value). It is purely presentational: it validates its fields against a Zod schema, resets them on every open, and emits the result upward via a `save` event. It never touches a store itself, so the parent page owns persistence.
- `src/modules/locales/components/LanguageFormDialog.vue` — A create-or-edit dialog for a single language (locale capability). It swaps between two validation schemas based on whether the `language` prop is present, resets the form on every open, and emits the saved fields upward. The component exists to centralize the one-field difference between the two modes (the `tag` field is editable on create, disabled on edit) in a single reusable dialog.
- `src/modules/locales/composables/use-dictionary-aggregation.ts` — Vue composable that merges three locale data sources—stored entries, the API's deployed baseline, and the build's bundled baseline—plus page-local pending keys, into a single per-cell read model. The dictionary board and cell editor query cell state through this composable rather than reading the raw sources, giving "what is this cell" exactly one answer.
- `src/modules/locales/composables/use-dictionary-cell-editor.ts` — Vue composable that owns the per-cell write lifecycle on the dictionary board: a local draft map so a blur can distinguish "user changed the value" from "user clicked through", the save / clear / Enter handlers that dispatch into the locales store, and the transient UI state (saved checkmark, inline error) each cell displays after its own last write.
- `src/modules/locales/dictionaries.ts` — Pure conversion between the API's flat dotted-key rows (one `{ key, value }` per entry) and the nested object shape vue-i18n consumes. Exists as a standalone module so the two directional transforms can be unit-tested without a browser or store.
- `src/modules/locales/module.ts` — Module manifest for the locales (translation-management) domain. It declares the routes, navigation entry, response-schema rows, and locale dictionary loaders through the `AppModule` shape consumed by the kernel registry. This file is the *author* side of the i18n tier — the screens a translator uses to edit languages — while rendering (the *consumer* side) lives in `infrastructure/i18n/locale-overrides.ts` and does not depend on this module.
- `src/modules/locales/response-schemas.ts` — Declares the response-envelope validation rows for the nine **admin-only** locale endpoints. Each row pairs an HTTP method with a `$`-anchored URL regex and the corresponding Zod response schema, so the global response-envelope validator can confirm that admin locale calls return the expected shape.
- `src/modules/locales/routes.ts` — Declares the locale-management route table (three admin-only routes) as a typed `RouteRecordRaw[]` that the module registry splices into the application router. Each entry lazy-loads its view component.
- `src/modules/locales/schemas.ts` — Zod validation schemas for the locale admin's two forms (language and entry). Error messages are written as thunks wrapping `translate()` so they resolve to whatever locale is active at parse time, rather than freezing to the locale that was active when the schema object was created.
- `src/modules/locales/store.ts` — Pinia store (setup-style) for the translation admin screen. It manages two distinct API resources behind one `defineStore`: the language manifest (capabilities across both tiers, read via `getLocales`, written via explicit wrappers that always refetch after a mutation) and one language's paginated translation entries (driven by `useStructureCrudApi`).
- `src/modules/locales/tests/dictionaries.spec.ts` — Unit tests for the two pure transformation functions `flattenDictionary` and `expandEntries`. They exercise the nested-object ↔ flat-dotted-rows conversion in isolation (no store, no transport), covering edge cases like array/numeric-key round-tripping, deep nesting, and the deeper-key-wins collision rule.
- `src/modules/locales/tests/e2e/a11y.cy.ts` — Declares the locales module's routes (and one dialog state) to the shared `sweepA11y` runner, which visits each route and asserts against axe. It exists so the locales pages — including their mobile-stacked table layouts and the entry-creation dialog — are covered by the accessibility sweep without duplicating axe logic per page.
- `src/modules/locales/tests/e2e/locales.visual.cy.ts` — Registers three locales-module screens (list, dictionary, per-locale entries) with the shared `sweepVisual` visual-regression runner so that each screen is captured as a screenshot and diffed against a stored baseline. It exists to catch unintended visual regressions in the locales admin pages.
- `src/modules/locales/tests/entries-import-dialog.spec.ts` — Unit tests for the `EntriesImportDialog` component's confirmation-gate logic: verifying that a **replace**-mode import is blocked until the user accepts the confirmation prompt (via the real `useDialogStore`), while a **merge**-mode import emits immediately without any confirmation. The dialog shell (Vuetify `v-dialog`) is stubbed so its slot content renders regardless of open state; the component's own `watch(isOpen, …)` and submit handler are exercised for real.
- `src/modules/locales/tests/routes.spec.ts` — Pins the `meta.access` value every locales route declares, asserting each against an explicitly written expected value rather than a derived one. Its job is to prove the access *declarations* exist on the route records; enforcement (that the router actually checks them) is proven elsewhere.
- `src/modules/locales/tests/store.spec.ts` — Vitest spec for `useLocalesStore` that drives the store through a mocked `orvalMutator` transport and asserts on both the returned data and the exact `METHOD path` sequence of HTTP calls. It pins behavioural contracts that are easy to regress: manifest refetch after every language write, tag immutability on edit, search-cache coherence on entry writes, and pagination/search/dictionary-shape semantics.
- `src/modules/locales/tests/use-dictionary-aggregation.spec.ts` — Unit tests for the `useDictionaryAggregation` composable. Rather than mocking the network transport or the two internal loaders (`import.meta.glob` for bundled dictionaries, `orvalMutator` for API dictionaries), this spec fakes the Pinia store's three fetch methods with plain mutable variables, giving a single, narrow boundary to drive the composable's lookup logic.
- `src/modules/locales/views/LocaleEntries.vue` — Route view for `/locales/:tag` that renders a single language's translation entries in a paginated, searchable table. It drives the locales store's `watchSearchEntries` toolkit, supports inline value editing on blur, add/delete/import/export operations, and after every successful write refreshes the running app's in-memory dictionary so the edit is immediately visible without a reload.
- `src/modules/locales/views/LocalesDictionary.vue` — Route view that renders a client-side paginated, debounced-filtered "dictionary board" — one row per i18n key, one column per language. It owns only the presentation layer concerns (filtering, paging, the add-key flow) and delegates all three-source reading to `useDictionaryAggregation` and all per-cell writes to `useDictionaryCellEditor`.
- `src/modules/locales/views/LocalesList.vue` — Route-level Vue view ("languages board") that renders a CRUD table over the locale manifest. Admins can create, edit, and delete `LocaleCapability` rows, toggle their active state, and navigate to the dictionary or per-language entry views. The view is intentionally read-only for `static`-source locales, which have no dynamic record to mutate.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]

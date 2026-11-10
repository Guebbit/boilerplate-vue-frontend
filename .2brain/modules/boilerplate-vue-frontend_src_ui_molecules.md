---
tags:
  - 2brain
  - 2brain/module
  - project/boilerplate-vue-frontend
type: module
module: src/ui/molecules/
files: 16
updated: 2026-11-10T08:42:32.356912+00:00
---

# src/ui/molecules/

## Purpose

A collection of small, single-purpose presentational components (molecules) that solve recurring UI problems across the app—list chrome, form fields, detail-page rows, and page-level headers. Each component encapsulates one specific interaction or layout pattern so that view-level code composes them rather than re-implementing markup, accessibility attributes, and edge-case logic.

## Key parts

- **List & table chrome** — `ListPagination`, `PageSizeSelect`, `page-size-options.ts`, `ListSearchActions`, `ListEmptyState`, `SortSelect`, `TableLoadingBar`, and `RowDeletedChip` together cover the full set of controls and states a paginated, filterable, sortable list needs. They wrap or replace Vuetify primitives to fix accessibility gaps and enforce consistent behaviour.
- **Form fields** — `FormImageUpload` (file pick, preview, progress) and `InlineErrorAlert` (accessibility-focused inline error that pairs with the `useBlockingError` composable).
- **Detail & display rows** — `ItemDetailField` (icon-tile label/value for detail pages) and `DefinitionRow` (dense `<dl>` row for fact panels) are visual counterparts for two common read-only contexts. `LazyImage` standardises broken-image, reflow, and lazy-fetch behaviour for any record image.
- **Page chrome** — `PageHeader` (rich/dynamic hero title), `TourButton` (appends `?tour=<id>` for the app-shell tour host), and `CopyButton` (clipboard copy + toast).

## How it connects

This module sits at a leaf in the dependency graph; it has no declared internal module dependencies. It is consumed by view/page modules that compose these molecules into full screens. At the library level it relies on Vuetify components (alerts, selects, pagination, empty-state, progress-linear) and on a handful of app-level composables (`useBlockingError`) and shell components (`AppTourHost`) that live outside this directory.

## Where to start

Read **`ListEmptyState.vue`** first—it's a four-line Vuetify wrapper that makes the "molecule = thin, purposeful wrapper" pattern immediately clear. Then read **`ListPagination.vue`** to see how a molecule adds real value on top of the underlying library component (conditional removal, unique `aria-label`, focus relocation) without changing its public API.

## Connected modules
_(none)_

## Files
- `src/ui/molecules/CopyButton.vue` — A single-purpose icon button that copies a given text string to the clipboard and displays a toast confirming success or reporting failure (via a locale key). It exists so callers get a consistent, always-iconed copy action without managing clipboard or toast logic themselves.
- `src/ui/molecules/DefinitionRow.vue` — A single label/value row intended for use inside a `<dl>`, providing a dense, underlined presentation for panels that list many facts at once. It is the lightweight counterpart to `ItemDetailField` (a bordered, icon-bearing tile for detail pages).
- `src/ui/molecules/FormImageUpload.vue` — A reusable image-picker form field combining a `v-file-input`, a live `<img>` preview (object URL or existing record image), and an optional upload-progress bar. It encapsulates the object-URL lifecycle so parent forms only deal with a single `File` model and a numeric `progress` prop.
- `src/ui/molecules/InlineErrorAlert.vue` — Single-root Vuetify alert for displaying blocking-workflow errors or warnings inline within a form. It exists as a dedicated component (rather than a toast) because `role="alert"` triggers an immediate screen-reader announcement at the point of focus, which a toast queue cannot provide after the user's attention has moved. It is the rendering half of the `useBlockingError` composable pairing.
- `src/ui/molecules/ItemDetailField.vue` — Atomic, read-only presentational component that renders a single label/value pair for use inside detail pages. It standardises the visual treatment of one row (icon tile + label + value) so that detail views only compose these fields rather than duplicating layout markup.
- `src/ui/molecules/LazyImage.vue` — Renders a single record's image with three visual tiers — a blurred thumbnail, the full image, and a bundled placeholder icon — while handling URL resolution against the API host, reserving layout space before any byte arrives, and using native browser lazy-loading. It exists so that every image site in the app gets identical broken-image, reflow, and lazy-fetch behavior without each caller reimplementing the logic.
- `src/ui/molecules/ListEmptyState.vue` — A presentational molecule that standardises the "no rows" state across all lists. It renders a headline, a 64 px secondary-coloured icon, and an optional call-to-action area, so individual list views never re-implement this markup. The component is a thin wrapper around Vuetify's `v-empty-state`.
- `src/ui/molecules/ListPagination.vue` — A thin wrapper around Vuetify's `v-pagination` that solves three problems the raw component doesn't handle: it removes itself from the DOM when there is only one page (so screen readers and tests don't see a useless landmark), it lets the caller supply a meaningful `aria-label` (Vuetify defaults every instance to "Pagination Navigation", which collides when a page has two pagers), and it relocates focus to a caller-chosen landmark if the pager unmounts while focus is inside it.
- `src/ui/molecules/ListSearchActions.vue` — A small button-row component that closes every admin list's filter form: a **Search** submit button, a **Reset** button, and a default slot for page-specific extras (e.g. a Create link or Export). It deliberately uses `type="submit"` on the Search button so the enclosing `<form>`'s own `@submit.prevent` remains the single place a search is triggered.
- `src/ui/molecules/PageHeader.vue` — A drop-in hero header for pages whose title can't be expressed as a simple `route.meta.title` translation — dynamic text, rich markup, etc. The consuming view renders it at the top of its own body, and the default layout steps aside.
- `src/ui/molecules/PageSizeSelect.vue` — A reusable Vuetify `v-select` that lets a user pick how many rows per page to display. It centralises the page-size picker pattern so paginated lists don't each re-implement the dropdown, label, and item-mapping logic.
- `src/ui/molecules/RowDeletedChip.vue` — A presentational chip that renders a localized "Deleted" label for any row whose `deletedAt` field is set (products, users, orders, etc.). It owns only the visual styling and the `row-deleted` test hook; the parent component decides *when* to render it.
- `src/ui/molecules/SortSelect.vue` — A "Sort by" dropdown for card-based list views. It wraps a Vuetify `v-select` over a small set of server-side sort tokens (e.g. `-price`, `title`), always offering a leading "default order" entry. Intended as the card-list counterpart to table-header sorting.
- `src/ui/molecules/TableLoadingBar.vue` — Provides an accessible replacement for Vuetify's built-in `v-progress-linear` loader, intended to be passed into `v-data-table`'s `#loader` slot. It exists because Vuetify's internal loader renders a `role="progressbar"` with no accessible name (an axe serious violation), and that cannot be patched via Vuetify component defaults since `aria-label` is not a declared prop.
- `src/ui/molecules/TourButton.vue` — A small "help" button rendered on pages that offer a guided tour. It carries no tour logic of its own — clicking it simply appends `?tour=<id>` to the current route's query string, which the app shell's `AppTourHost` watches and acts on. The button is entirely hidden when the deployment has tours disabled.
- `src/ui/molecules/page-size-options.ts` — Exports the default set of page-size options (10, 25, 50) used across the app's list views. It lives in its own module because Vue's `<script setup>` in `PageSizeSelect.vue` cannot expose a runtime named export that other callers might import independently of the component.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]

---
tags:
  - 2repo
  - 2repo/module
  - project/boilerplate-vue-frontend
type: module
module: src/ui/
files: 22
updated: 2026-09-03T11:00:28.105994+00:00
---

# src/ui/

## Purpose

`src/ui/` is the application's presentation layer. It contains every Vue component (molecules and organisms), shared composables, a single UI store, type definitions, and the Vuetify theme/icon configuration. Everything from a single label/value row to a full detail-page layout lives here, so that feature modules can compose pages without re-implementing visual or accessibility patterns.

## Key parts

- **Vuetify configuration** — `vuetify/index.ts` holds all design tokens (palettes, component defaults, breakpoints, locale) and `vuetify/icons.ts` wires lucide-vue-next as the icon system. Together they are the single restyling surface for the app.
- **Composables** — `composables/use-server-page-total.ts` supplies a server-authoritative page count for paginated stores; `composables/use-touch-friendly-size.ts` returns a responsive Vuetify size prop for accessible touch targets.
- **Molecules (small, single-purpose components)** — `DefinitionRow`, `ItemDetailField`, `LazyImage`, `ListPagination`, `TableLoadingBar` (read/display atoms); `FormCounterInput`, `FormImageUpload` (form-field wrappers that enforce a11y and validation shape).
- **Organisms (larger, composed components)** — `DataTable` (generic accessible table with server-side pagination), `ItemDetailLayout` / `ItemDetailHero` / `CardDetail` / `CardInfo` / `CardMaterialStat` (detail-page building blocks), `FormCard` (single-form page shell), `DialogHost` (renders the confirmation dialog queue).
- **Store & types** — `dialog.ts` is a Pinia store that turns `globalThis.confirm()` into an async, queueable, themeable confirmation; `types.ts` and `data-table-headers.ts` export shared type unions consumed across components.

## How it connects

This module has no outgoing dependencies on other modules in the project's dependency graph. It is a leaf: feature and page modules import from here, but `src/ui/` imports nothing outside of Vue, Vuetify, Pinia, and the `@guebbit/vue-toolkit` package.

## Where to start

1. **`vuetify/index.ts`** — Read first to understand the color system, component defaults, and breakpoint rules that every component in this module relies on.
2. **`organisms/DataTable.vue`** — The most feature-dense component here; it demonstrates the module's recurring patterns (a11y fixes, slot forwarding, composable integration, server-side pagination) in one file.

## Connected modules
_(none)_

## Files
- `src/ui/composables/use-server-page-total.ts` — A shared Vue composable that supplies a server-authoritative `pageTotal` (from `meta.totalPages`) for stores whose `search:` calls a real paginated endpoint. It exists because `@guebbit/vue-toolkit`'s built-in `pageTotal` counts the **local** item dictionary, which is incorrect for server-paginated data (e.g. a stale row from a previous language still inflating the count). This composable standardizes the fix so every server-paginated store handles it identically.
- `src/ui/composables/use-touch-friendly-size.ts` — A single-purpose Vue composable that returns a reactive Vuetify `size` prop value for row-action buttons. On desktop it yields `'small'` (compact density); on mobile (below the `sm` breakpoint) it yields `undefined` so Vuetify falls back to its larger default, keeping the touch target at or above WCAG's 44 px recommendation.
- `src/ui/dialog.ts` — A Pinia store that replaces the synchronous `globalThis.confirm()` with an async, queue-based, themeable confirmation flow. Callers push a `DialogRequest` and await a `Promise<boolean>`; the `DialogHost` component renders the queue head and calls back with the viewer's answer.
- `src/ui/molecules/DefinitionRow.vue` — A single label/value row (`<dt>`/`<dd>`) for dense `<dl>`-style panels that list many facts at a glance. It exists as the compact counterpart to `ItemDetailField` (a bordered, icon-bearing tile for detail pages). The component is purely presentational: it applies layout and typography but leaves all value rendering and i18n to the caller.
- `src/ui/molecules/FormCounterInput.vue` — A thin wrapper around Vuetify's `v-number-input` that adds two things the raw component doesn't provide: a dev-time guard ensuring the field is accessible (either a visible `label` or an `ariaLabel` must be supplied), and a uniform `errorMessages` prop shape so this stepper integrates with the same validation pattern as every other form field in the project.
- `src/ui/molecules/FormImageUpload.vue` — A single-image picker form field built on Vuetify's `v-file-input`. It renders a live preview from an object URL (or the record's existing image), displays validation errors, and shows an upload-progress bar whose percentage is driven by the parent via a `progress` prop. It exists so that every form that needs an "upload one image" input can drop in a consistent, self-contained field.
- `src/ui/molecules/ItemDetailField.vue` — Atomic, read-only presentational field for detail pages. Renders a single label/value pair with a decorative icon tile. Designed to be dropped into a CSS-grid layout where the parent controls the accent color.
- `src/ui/molecules/LazyImage.vue` — Renders a single record image in three tiers — a small blurred thumbnail that paints instantly, the full image that fades in over it once decoded, and a bundled placeholder icon when no image exists or the request fails. It centralises URL resolution, box reservation, lazy loading, and graceful degradation so that no caller has to handle those concerns individually.
- `src/ui/molecules/ListPagination.vue` — A thin wrapper around Vuetify's `v-pagination` for single lists. It removes itself from the DOM entirely when the list has only one page, supplies a descriptive `aria-label` so multiple paginators on a page are distinguishable to screen readers, and recovers focus to the `<main>` landmark if it unmounts while focus is inside it.
- `src/ui/molecules/TableLoadingBar.vue` — Drop-in replacement for the `v-progress-linear` that `v-data-table` renders internally while `loading` is true. It exists to give that progress bar an `aria-label`, fixing a `serious` axe violation (unlabeled `role="progressbar"`) that cannot be resolved through Vuetify component defaults because `aria-label` is not a declared prop. Intended to be passed into every table's `#loader` slot.
- `src/ui/organisms/CardDetail.vue` — A thin presentational wrapper that renders a Vuetify `v-card` with a fixed set of visual defaults (flat variant, border, `p-6` padding) and a single default slot. Detail-page cards (`ItemDetailHero`, stat tiles, the main content card) all compose through this component so they share one card shell without duplicating the markup.
- `src/ui/organisms/CardInfo.vue` — An organism-level Vue component that renders a Vuetify `v-card` containing a gradient icon tile, a title, and a description. It exists as a reusable building block for "info card" layouts where the accent color is driven by the app's theme.
- `src/ui/organisms/CardMaterialStat.vue` — A small presentational stat-tile component. It renders a Vuetify card containing a label, a large formatted value, and an optional subtitle, with a colored top border driven by a theme accent. It exists to give callers a consistent, theme-aware way to display a single metric without repeating layout markup.
- `src/ui/organisms/DataTable.vue` — A generic (`T extends object`) Vue SFC that wraps Vuetify's `v-data-table` to provide a consistent, accessible table for the app. It translates the app's `CoreDataTableHeader<T>` shape into Vuetify column definitions, forwards caller-provided `header.*`/`item.*` slots, replaces the default loader with `TableLoadingBar`, and adds optional single-row selection via `v-model`. Pagination is server-side: the footer is hidden and `items-per-page` is set to `-1`.
- `src/ui/organisms/DialogHost.vue` — A single-instance confirmation dialog host mounted once by the application layout. Any component that needs a confirmation calls `useDialogStore().confirm(...)` and never renders a dialog itself; this host is the only place that knows confirmations are Vuetify dialogs, so restyling every "Are you sure?" in the app is an edit to this one file.
- `src/ui/organisms/FormCard.vue` — A presentational card that wraps a single-form page (e.g. `ProductCreate`, `UserCreate`) with its fixed chrome: a `novalidate` form, a full-width submit button, and a centred "back" text link. The caller supplies only the fields (via the default slot) and the i18n labels, so every create page shares the same card geometry and button layout without duplicating markup.
- `src/ui/organisms/ItemDetailHero.vue` — Renders the top section of a detail page: a 72 px picture (or a gradient icon tile as fallback) sitting beside the record's eyebrow, title, and description. It exists so every record type shares one consistent hero layout while allowing type-level control over whether an image slot appears at all.
- `src/ui/organisms/ItemDetailLayout.vue` — Shared layout skeleton for entity detail/edit pages (product, order, user, etc.). Provides a consistent two-column grid structure (hero/stats, main card/aside, actions) and sets a `--detail-accent` CSS custom property so that inner components (ItemDetailField, ItemDetailHero, chips) inherit the per-entity accent color without needing individual prop drilling.
- `src/ui/organisms/data-table-headers.ts` — Defines the column-header shapes that `DataTable` accepts. It exists as a standalone module (rather than being declared in `<script setup>`) because it must export a `type` union, and `<script setup>` only accepts exported `interface` declarations.
- `src/ui/types.ts` — A standalone module that holds shared UI-layer type definitions so that multiple components (organisms/molecules) can reference the same type without importing each other. Currently contains a single theme-accent union.
- `src/ui/vuetify/icons.ts` — Wires **lucide-vue-next** into Vuetify as the application's icon system, replacing Vuetify's default `@mdi/font` icon font. It provides the alias table Vuetify internals look up by name and the render function that turns a resolved icon component into a vnode.
- `src/ui/vuetify/index.ts` — The single source of truth for all design tokens in the project: Vuetify color palettes (light & dark), component `defaults`, display breakpoints, icon configuration, and locale setup. Downstream forks restyle the entire app by editing this file and `./icons.ts` alone; Tailwind only aliases these colors and defines no palette of its own.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]

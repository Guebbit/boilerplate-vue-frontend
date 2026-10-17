---
tags:
  - 2brain
  - 2brain/module
  - project/boilerplate-vue-frontend
type: module
module: src/ui/molecules/
files: 12
updated: 2026-10-17T02:56:50.206893+00:00
---

# src/ui/molecules/

## Purpose

A collection of small, self-contained UI building blocks (in the "molecules" sense of the Design System scale). Each component handles a single, well-scoped presentation concern—form inputs, pagination controls, image display, or page-level chrome—and is meant to be dropped into any view or layout without carrying business logic.

## Key parts

- **List & pagination controls** — `ListPagination.vue`, `PageSizeSelect.vue`, `SortSelect.vue`, `TableLoadingBar.vue`, and `page-size-options.ts` together cover the repeated "how many rows / which order" UI that card- and table-based list views need. `page-size-options.ts` exists as a plain `.ts` export so callers can import the default `[10, 25, 50]` array without pulling in the Vue component.
- **Form inputs & validation** — `FormCounterInput.vue`, `FormImageUpload.vue`, and `InlineErrorAlert.vue` provide the small form-field primitives (numeric counter, image picker, inline error banner) used inside larger forms.
- **Display & layout fragments** — `DefinitionRow.vue`, `ItemDetailField.vue`, and `LazyImage.vue` render individual data fields and images; `PageHeader.vue` supplies a page-hero `<header>` for views whose title is dynamic or richer than a route-meta string.

## How it connects

This module sits at the leaf of the UI dependency graph—it has no internal module dependencies. Higher-level views and layout routes import these components directly to assemble pages. Because no other `src/ui` sub-module is listed as a dependency, the molecules are deliberately kept dependency-free so they can be reused anywhere in the application without coupling to a specific feature or layout.

## Where to start

Read **`PageSizeSelect.vue`** first: it is the smallest, best-documented component and shows the standard pattern—bind a `v-model` to a composable ref, accept a translated label prop, and delegate all Vuetify styling to the component itself. Then look at **`PageHeader.vue`**, whose doc comment explains *why* it was extracted from a layout route, giving context on how these molecules are meant to be consumed at the top of a view's `<template>`.

## Connected modules
_(none)_

## Files
- `src/ui/molecules/DefinitionRow.vue`
- `src/ui/molecules/FormCounterInput.vue`
- `src/ui/molecules/FormImageUpload.vue`
- `src/ui/molecules/InlineErrorAlert.vue`
- `src/ui/molecules/ItemDetailField.vue`
- `src/ui/molecules/LazyImage.vue`
- `src/ui/molecules/ListPagination.vue`
- `src/ui/molecules/PageHeader.vue` — A self-contained page-hero `<header>` that a view renders at the top of its own body when its title is dynamic or richer than a simple translated `route.meta.title`. It was extracted from `LayoutDefault`'s `#header` slot after that layout became a route and lost the ability to accept per-view slot content.
- `src/ui/molecules/PageSizeSelect.vue` — A single-purpose Vuetify `v-select` picker that lets users choose the number of rows per page in any paginated list. It centralises the repeated "rows-per-page" dropdown so callers only pass a translated label and (optionally) a custom set of sizes, while the `v-model` binds directly to a search composable's `pageSize` ref.
- `src/ui/molecules/SortSelect.vue` — A "Sort by" dropdown for card-based list views. Wraps a Vuetify `v-select` around a small set of server-side sort tokens (e.g. `-price`, `title`) and prepends a "default order" entry. Tables handle sorting via column headers instead; this component exists specifically for the card layout.
- `src/ui/molecules/TableLoadingBar.vue`
- `src/ui/molecules/page-size-options.ts` — Provides the standard page-size options (`[10, 25, 50]`) as a standalone named export. It lives in its own `.ts` file because Vue's `<script setup>` cannot expose a runtime named export that a caller might import independently of the component.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]

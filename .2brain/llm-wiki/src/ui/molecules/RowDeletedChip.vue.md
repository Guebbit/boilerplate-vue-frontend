---
source: src/ui/molecules/RowDeletedChip.vue
sha256: bece90fce8275c0364b7d58fe55830b6b2d2a7501fa6f89010ca6be6bff49cf2
signature: 71298ed9d6cc8faaa1fa37b6e8228d608164f911d6353fe85a525f3097f02e07
generated_at: 2026-11-10T06:28:49.636126+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/RowDeletedChip.vue

## Purpose

A presentational chip that renders a localized "Deleted" label for any row whose `deletedAt` field is set (products, users, orders, etc.). It owns only the visual styling and the `row-deleted` test hook; the parent component decides *when* to render it.

## Key elements

- **`<template>`** – A single `<v-chip>` with fixed attributes: `size="small"`, `variant="tonal"`, `color="warning"`, `class="ml-1"`, and `data-test="row-deleted"`. No props are accepted; the chip is always identical.
- **`t('generic.deleted')`** – Localized label resolved via `vue-i18n`. The key lives under the `generic` namespace.
- **`data-test="row-deleted"`** – Stable test selector exposed to the E2E/unit-test layer; this is the contract tests rely on to find the chip.

## Relationships

No graph neighbors are recorded for this file. It has no imports beyond `vue-i18n` and no parent/child component imports visible in the source.

## Notes

- **Zero props / zero logic.** The component is a pure static snippet. Do not add reactive state or props here; if the label or styling must vary, create a sibling component.
- **Test hook is the only external contract.** The `data-test="row-deleted"` attribute is the sole stable identifier for automated tests. Renaming it without updating tests will break the suite.
- **Caller responsibility.** The doc-comment explicitly states the *caller* decides visibility (e.g. `v-if="row.deletedAt"`). This component does not inspect row data.

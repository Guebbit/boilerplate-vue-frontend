---
source: src/modules/shop-tasks/components/ShopWorkFeed.vue
sha256: c8afdedf67720b82d62f7152f29b02da5876286e9cd82c31f64eaf828a93d01e
signature: c8afdedf67720b82d62f7152f29b02da5876286e9cd82c31f64eaf828a93d01e
generated_at: 2026-11-10T05:41:54.695034+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop-tasks/components/ShopWorkFeed.vue

## Purpose

A zero-render side-effect component mounted in the app bar for the lifetime of the shell. Its sole role is to keep the `useShopWorkFeed` composable's reactive subscriptions alive so that staff nav badge counts stay updated. It renders nothing user-visible.

## Key elements

- **`<script setup>` block** — imports and immediately invokes `useShopWorkFeed()`; no reactive state, props, or emits are declared.
- **`<template>`** — a single `<span hidden />` placeholder to satisfy Vue's single-root requirement.

## Relationships

- **`src/modules/shop-tasks/composables/use-shop-work-feed.ts`** — the only dependency. `ShopWorkFeed.vue` calls `useShopWorkFeed()` at setup time; the composable owns all the feed/badge logic, and this component is merely the host that keeps it mounted.

## Notes

- The component is intentionally invisible. Do not remove it from the app-bar mount point "because it renders nothing" — that is the entire reason it exists.
- No props, emits, or template bindings are exposed; treat it as a one-way consumer of the composable's side effects.

---
source: src/modules.ts
sha256: 3e96f3ea7846af69e29c656f92c876560abd663f74c59cc925fc3eeff31efd0a
generated_at: 2026-10-02T12:08:41.408494+00:00
model: ollama:qwen3.8:27b
---

# src/modules.ts

## Purpose

The domain-module registry for the build. It declares which feature modules are included by exporting a single typed array (`enabledModules`). Adding or removing a domain is a one-line change here plus a folder under `src/modules/`; nothing else should break, and if it does, the coupling is intentional and worth surfacing.

## Key elements

- **`enabledModules: AppModule[]`** — The sole export. An alphabetically-ordered array of 16 module instances (account, api-keys, cart, delivery, demo, feedback, inventory, locales, observability, orders, payments, products, returns, users, webhooks, wishlist). Each entry is the default export of `@/modules/<name>/module`. The array order is the order in which route records are spliced into the route tree.
- **`AppModule`** (type import from `@/kernel/registry`) — The shape each module must satisfy; gives the array a common contract (presumably routes, guards, or metadata the kernel consumes).

## Relationships

- **`@/kernel/registry`** — Provides the `AppModule` type used to type the array. This is the only cross-file dependency.
- **`@/modules/<name>/module`** (× 16) — Each imported module supplies one element of `enabledModules`. This file is their sole aggregator.

## Notes

- Order is deliberately alphabetical; the comment notes vue-router's own ranking makes order irrelevant for distinct paths, so the choice exists purely to keep diffs stable.
- The file is a module (no side effects beyond the import graph). Do not add conditional logic here — inclusion is binary per module.
- Removing a module means deleting its import line *and* its array entry. A missing import will surface as a compile error rather than a silent gap.

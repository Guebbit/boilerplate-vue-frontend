---
source: src/modules.ts
sha256: 526194828234ee1e3398ce460a718ee935b2e318c5ddcd3d5adef038011714b3
signature: 83564b570c8bf18dcb0775f1da6b69507210ce896b589cd908c5a3be62e76508
generated_at: 2026-11-10T03:17:56.501185+00:00
model: ollama:qwen3.8:27b
---

# src/modules.ts

## Purpose

Central registry that enumerates every domain module wired into this build. It exists so there is exactly one list—ordered and importable—of active modules, making "which domains does this build serve?" a single-file question.

## Key elements

- **`enabledModules: AppModule[]`** — the sole export. An ordered array of all domain module objects (account, apiKeys, cart, delivery, example, inventory, locales, notifications, observability, orders, payments, products, returns, shop, shopTasks, stats, stockAlerts, tasks, users, webhooks, wishlist). Downstream code (routing, boot) consumes this array.
- **Per-domain imports** — 21 default imports, each resolved to `@/modules/<name>/module`. The array order matches the import order (alphabetical).

## Relationships

- **`src/kernel`** — imports the `AppModule` type from `@/kernel/registry`, which defines the shape every entry in `enabledModules` must satisfy. The kernel's registry/boot logic presumably iterates over `enabledModules` to splice routes and initialize services.

## Notes

- **Order is alphabetical and deliberate.** The docblock states it determines the order routes are spliced into the router tree, though vue-router's path ranking makes this a non-issue for distinct paths. The alphabetical convention keeps diffs trivial.
- **No dynamic loading or feature flags.** Adding a domain means creating `src/modules/<name>/module` and adding one import + one array entry here. Removing one is the inverse. There is no plugin system, no conditional inclusion—the list is the source of truth.
- **The `example` module is present** in the registry. It is a real entry, not a placeholder comment.

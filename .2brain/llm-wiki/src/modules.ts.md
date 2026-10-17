---
source: src/modules.ts
sha256: 8a46974fec4fce9b9cac9af94c1016fb57fc6732b6fd718b049884531212bde0
generated_at: 2026-10-17T00:14:16.001475+00:00
model: ollama:qwen3.8:27b
---

# src/modules.ts

## Purpose

Central registry that enumerates every domain module included in this build. Each entry is a one-line import from `src/modules/<name>/module`, collected into a single exported array. It is the sole place that decides which domains are active; adding or removing a domain means adding or deleting exactly one line here.

## Key elements

- **`enabledModules: AppModule[]`** — The single export. An ordered array of all 19 domain modules (account, apiKeys, cart, delivery, example, feedback, inventory, locales, notifications, observability, orders, payments, products, returns, stats, users, webhooks, wishlist). Downstream code splices each module's routes into the router tree in this order.
- **`AppModule` (type import from `@/kernel/registry`)** — The shared contract each domain module must satisfy; this file only re-exports the instances, never defines module logic.

## Relationships

No graph-registered neighbors. The file imports one type (`AppModule` from `@/kernel/registry`) and 19 concrete modules from `src/modules/*/module`. Each of those module files is the sole consumer of a line in this array; no other file imports `enabledModules`'s individual entries directly.

## Notes

- **Ordering is alphabetical and intentional.** Vue-router's path ranking makes splice order irrelevant for distinct paths, so the array is kept alphabetical purely to keep diffs minimal and predictable.
- **Removal is deliberately painful.** The header comment states that if deleting a module's line causes other code to break, that coupling is a real signal to investigate, not a problem to auto-fix. There is no lint rule or build step that prunes the list automatically.
- **Single source of truth.** There is no feature-flag or environment gate around individual entries here; if a module is in the array, it is live in the build.

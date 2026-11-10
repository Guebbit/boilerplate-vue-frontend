---
source: src/modules/shop-tasks/module.ts
sha256: d4791de3a6ef6b016cd663f96412a6fd67856378f93fc0f2114f6db270acba6d
signature: d4791de3a6ef6b016cd663f96412a6fd67856378f93fc0f2114f6db270acba6d
generated_at: 2026-11-10T05:42:35.754861+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop-tasks/module.ts

## Purpose

Module manifest for the `shop-tasks` subdomain. It declares **no routes and no menu entry**; instead it wires up the shop's notice wording, task-label locales (EN/IT), response schemas, and the data feed that drives staff-nav badge counts. It exists so the foundation's bell, the tasks screens, and the shell can consume shop-specific copy and counts without the shop owning any navigation surface.

## Key elements

- **Default export** (`AppModule`): the manifest object, name `"shop-tasks"`, `routes: []`.
- **`notices`**: re-exports `shopNotices` from `./notices.ts` — the mapping of `shop-tasks.*` notification codes to human-readable text and link targets.
- **`responseSchemas`**: lazy-imports `./response-schemas` → `shopTasksResponseSchemas` (used by `GET /shop-tasks/summary`).
- **`locales`**: lazy-loads `./locales/en.json` and `./locales/it.json`, each wrapped through `dictionary` from `@/kernel/registry`. Provides `task-kind`, `task-category`, and `task-link` labels.
- **`slots['app-bar']`**: mounts `components/ShopWorkFeed.vue` (async) into the shell's app-bar. The component renders nothing visible; it is the feed that populates staff-nav badge counts.

## Relationships

- **`src/modules/shop-tasks/notices.ts`** — imported as `shopNotices` and assigned to the manifest's `notices` field. This is the sole runtime dependency between the two files.

## Notes

- **No routes.** The module is purely a data/wording provider plus one UI slot. Removing it strips custom notice wording (they fall back to generic) but does not affect the bell, the tasks inbox, or any route.
- **Link safety by design.** Notice links reference a sibling's route by name; the bell binds a link only if the current build actually ships that route. Removing a sibling module silently removes its link with no dangling reference.
- **`ShopWorkFeed.vue` is invisible.** It is mounted with the shell but renders no DOM content — it exists solely to drive badge-count data via `@/kernel/work-counts`.
- **Subdomain tag:** `supporting`.

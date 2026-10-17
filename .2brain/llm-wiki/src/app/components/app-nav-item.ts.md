---
source: src/app/components/app-nav-item.ts
sha256: 7f06e52c23e12b33f36b566e349f9736de7a55a8954bf4549974667eaab97c72
generated_at: 2026-10-17T00:05:56.954124+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/app-nav-item.ts

## Purpose

Defines the `AppNavItem` interface — the shape of a single resolved navigation entry (translated, locale-prefixed, counted). It was extracted out of `AppNavMenu.vue` into a plain `.ts` file so that TypeScript-ESLint's type-aware rules can resolve it without `no-unsafe-*` noise, and so both `AppNavMenu.vue` and `AppNavigation.vue` can import the same type from a non-SFC module.

## Key elements

- **`AppNavItem`** (exported interface) — describes one navigation entry:
  - `name` — stable route name, used as the render `key`; invariant across locales.
  - `title` — translated label.
  - `group?` — translated section heading; consecutive entries sharing the same value (and `order`) render the heading once above the first.
  - `to` — `RouteLocationRaw` destination, already locale-prefixed.
  - `icon?` — Lucide `Component` rendered before the label; absent → no icon slot.
  - `badge?` — live count; `undefined` → no badge.
  - `detail?` — live text beside a pinned entry's icon; `undefined` → none.
  - `pinned?` — when `true`, the entry is lifted onto the bar beside the account menu instead of staying in its section's dropdown.

## Relationships

No graph neighbors recorded.

## Notes

- The file exists *only* as a type home; it has no runtime logic. The docblock at the top explains the ESLint extraction rationale — don't re-inline the interface back into an SFC without re-triggering the `no-unsafe-*` issues.
- `name` is the only truly stable field; every other field is display/locale-dependent and must be re-resolved per visitor.
- `group` rendering is positional (entries must sit next to each other by `order`); the interface itself does not enforce that — it is the consuming component's responsibility.

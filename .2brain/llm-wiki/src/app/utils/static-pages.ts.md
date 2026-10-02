---
source: src/app/utils/static-pages.ts
sha256: 2360b0336e3a27b856c339904457dfecf45b1dafb55cc5063a16e167bbbe14a2
generated_at: 2026-10-02T11:50:00.250189+00:00
model: ollama:qwen3.8:27b
---

# src/app/utils/static-pages.ts

## Purpose

Centralises the shop's four prose pages (about, FAQ, terms, privacy) and the single formula that maps a page name to its router route name. By living in one place, the router, footer, and any page that cross-links its siblings all share the same source of truth instead of duplicating the mapping.

## Key elements

- **`STATIC_PAGES`** — `readonly` array (`['about', 'faq', 'terms', 'privacy'] as const`) defining the canonical list and display order of prose pages.
- **`StaticPageName`** — union type derived from `STATIC_PAGES` (`'about' | 'faq' | 'terms' | 'privacy'`), used as a compile-time-safe page identifier.
- **`staticPageRouteName(page)`** — transforms a `StaticPageName` into the router route string by prefixing `Static` and capitalising the first letter (e.g. `'about' → 'StaticAbout'`).
- **`staticPageParagraphs(tm, rt, path)`** — calls an i18n `tm()` lookup for a given dictionary path, then runs each entry through `rt()` for rich-text processing. Guards against `tm()` returning `{}` (a non-array) by yielding an empty array instead.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- `staticPageParagraphs` deliberately accepts `tm` and `rt` as parameters rather than calling `useI18n()` itself, so it stays a pure function and can be unit-tested without a React hook context.
- The `as const` on `STATIC_PAGES` means adding or reordering pages here changes the `StaticPageName` type and will surface as a compile error at every call site — intentional.
- The route-name formula is a simple string concat (`'Static' + capitalised`); if the router ever adopts a different naming convention, only this one-liner needs to change.

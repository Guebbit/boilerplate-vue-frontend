---
source: src/app/components/StaticPageLinks.vue
sha256: fd956ab68ed0fa1cb5550bbae019514bddabb1b04b9053917efa0ebc61b6b1ee
signature: 73a954340ed071bb6a417d93503873b7af0c500e9890fc242512244a784ad025
generated_at: 2026-11-10T02:53:22.532748+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/StaticPageLinks.vue

## Purpose

Renders the bottom cross-link bar shared by all five static prose pages (About, FAQ, Terms, Privacy, Legal). By living in a single component, it guarantees the five pages never drift on which siblings they link to or in what order.

## Key elements

- **`siblings` (computed)** — Filters `STATIC_PAGES` to exclude the `current` prop, producing the four sibling page names in the shared canonical order.
- **`current` prop (`StaticPageName`)** — Identifies which page is rendering the links so it can be excluded from the list.
- **`routerLinkI18n`** (imported from `@/i18n/router-link.ts`) — Builds an i18n-aware route object for each `RouterLink`.
- **`staticPageRouteName`** (imported from `@/app/utils/static-pages.ts`) — Maps a `StaticPageName` to its corresponding router name.
- **Template `<nav>`** — A single landmark (labelled via `t('static-pages.related')`) containing one `RouterLink` per sibling, with a 44 px minimum touch target below the `sm` breakpoint.

## Relationships

No graph neighbors are registered for this file.

## Notes

- The component is intentionally prop-driven rather than reading the current route itself; the parent page passes its own `StaticPageName`. This keeps the component trivially testable and decoupled from the router.
- Link keys are prefixed (`'link-' + name`) to avoid collisions if other keyed lists are added to the same parent scope.
- Touch-target sizing is handled in CSS (`min-h-11` → 44 px, `sm:min-h-0`), not in JS, so screen-reader / a11y tooling sees a plain `nav` with `aria-label`.

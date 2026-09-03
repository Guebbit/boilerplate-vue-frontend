# src/app/components/StaticPageLinks.vue

## Purpose

Renders the cross-link footer shared by all four static prose pages (About, FAQ, Terms, Privacy). Given the name of the page currently in view, it displays RouterLinks to the remaining three, guaranteeing the set of sibling links stays consistent across pages.

## Key elements

- **`current` prop** (`StaticPageName`) — identifies the page rendering the links so it can exclude itself from the sibling list.
- **`siblings`** (computed) — `STATIC_PAGES` filtered to exclude `current`; determines both the set and the order of links rendered.
- **Template block** — a `v-divider`, a `<nav>` with an i18n-driven `aria-label`, and a `v-for` of `RouterLink` elements using `routerLinkI18n` + `staticPageRouteName` for locale-aware routing.
- **`t()`** (from `vue-i18n`) — localises each link's visible text (`static-pages.<name>.title`) and the nav landmark label.

## Relationships

No graph neighbors are recorded for this file. Its imports (`static-pages.ts`, `router-link.ts`) are referenced but not listed as tracked neighbors.

## Notes

- The component intentionally has **no styling logic beyond utility classes**; visual appearance is a flat underline at 80% opacity.
- Link order is dictated by the order of `STATIC_PAGES` in `static-pages.ts`—reordering that array changes the rendered link order on every page simultaneously.
- The `:key` prefix (`'link-' + name`) is hardcoded; ensure no collision if sibling markup is added inside the same `<nav>`.
- Translation keys follow the pattern `static-pages.<name>.title`—add a new static page by extending `STATIC_PAGES` and providing the matching i18n key; the component needs no changes.

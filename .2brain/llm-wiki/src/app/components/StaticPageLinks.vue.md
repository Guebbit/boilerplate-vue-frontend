---
source: src/app/components/StaticPageLinks.vue
sha256: a5a9e7f903138fa006de7d023c10d964ad92a5da9aceb4f64bdb8358d4672962
generated_at: 2026-10-02T11:46:20.516940+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/StaticPageLinks.vue

## Purpose

Renders the cross-link navigation strip at the bottom of every static prose page (About, FAQ, Terms, Privacy). By sharing a single component across all four pages, it guarantees they always present the same set of sibling links in the same order, preventing drift.

## Key elements

- **`current` prop** (`StaticPageName`) — identifies which page is rendering the links; that page is excluded from the sibling list.
- **`siblings`** (computed) — filters `STATIC_PAGES` to drop `current`, preserving the shared array order as the display order.
- **`routerLinkI18n({ name: staticPageRouteName(name) })`** — builds i18n-aware `to` values for each sibling `RouterLink`.
- **Template** — a `<nav>` landmark (aria-labeled via `static-pages.related`) containing one underlined `RouterLink` per sibling, with link text from `static-pages.{name}.title`.

## Notes

- The component is deliberately the *only* place where static-page cross-links are authored; do not hard-code sibling lists in the page components themselves.
- Display order is driven entirely by the order of the `STATIC_PAGES` array in `@/app/utils/static-pages.ts`; changing that array reorders links everywhere automatically.
- The `:key` values are prefixed with `'link-'` to avoid collisions with keys in surrounding page content.

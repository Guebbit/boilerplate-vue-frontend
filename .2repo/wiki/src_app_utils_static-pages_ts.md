# src/app/utils/static-pages.ts

## Purpose

Single source of truth for the shop's static prose pages (about, FAQ, terms, privacy). It defines the canonical page list, the type for individual page names, the formula that maps a page name to its router route name, and a helper that resolves i18n paragraph arrays into rendered strings. The router, footer, and cross-linking pages all read from here so the mapping exists in exactly one place.

## Key elements

- **`STATIC_PAGES`** — `readonly` array (`as const`) listing the four prose pages in the order they appear in footers and cross-links: `['about', 'faq', 'terms', 'privacy']`.
- **`StaticPageName`** — Union type derived from `STATIC_PAGES` (`'about' | 'faq' | 'terms' | 'privacy'`).
- **`staticPageRouteName(page)`** — Converts a `StaticPageName` to its router route name by prefixing `Static` and upper-casing the first letter (e.g. `'faq'` → `'StaticFaq'`).
- **`staticPageParagraphs(tm, rt, path)`** — Calls `tm(path)` to fetch a paragraph array from the i18n dictionary, then maps each entry through `rt` for rich-text rendering. Returns `string[]`.

## Relationships

No graph neighbors are tracked for this file.

## Notes

- `staticPageParagraphs` explicitly guards against `tm` returning a non-array (it returns `{}` for missing paths). A non-array result is coerced to `[]` so callers can safely iterate.
- The route-name convention is `Static` + first-letter-uppercase of the page key; the page names are all lowercase single words, so no further capitalization logic is needed.
- `STATIC_PAGES` is declared `as const`, so `StaticPageName` is a closed union—adding a new page requires updating the array in this file and every consumer inherits the new member automatically.

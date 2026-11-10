---
source: src/app/utils/static-pages.ts
sha256: f075a84b857401bf9a0b8ac707029d15e2579ec9279d7cb17312796381615e94
signature: 518b8f79a57533cbb7f9d52d2d5e2f06920d4a9b5fc9af0638f4ea59d4fa58a4
generated_at: 2026-11-10T02:58:32.260811+00:00
model: ollama:qwen3.8:27b
---

# src/app/utils/static-pages.ts

## Purpose

Single source of truth for the shop's prose pages (about, FAQ, terms, privacy, legal). Centralises the page-name list, the name→route-name formula, and an i18n paragraph resolver so the router, footer, and cross-linking pages all read from one place.

## Key elements

- **`STATIC_PAGES`** – Re-export of `STATIC_PAGE_NAMES` (imported from the generated file). The canonical ordered list of prose-page names.
- **`StaticPageName`** – Union type derived from the elements of `STATIC_PAGES`. Used to type-constrain any function parameter that accepts a page name.
- **`staticPageRouteName(page)`** – Converts a page name to its router route name (e.g. `"about"` → `"StaticAbout"`). Pure string transform, no lookup table.
- **`staticPageParagraphs(tm, rt, path)`** – Resolves an i18n dictionary path into an array of rendered paragraph strings. Calls `tm(path)`, then maps each entry through `rt()`. Returns `[]` if `tm` doesn't return an array (i18n falls back to `{}`).

## Relationships

- **`src/app/utils/static-pages.generated.ts`** – Provides `STATIC_PAGE_NAMES`, the actual array of page-name strings. This file re-exports it as `STATIC_PAGES` and derives the `StaticPageName` type from it. The generated file is the sole data source; this file is the consumer-facing API layer.

## Notes

- `staticPageRouteName` relies on simple capitalisation + a `"Static"` prefix. If a router entry ever deviates from that pattern, this helper will silently produce the wrong name.
- `staticPageParagraphs` defensively treats a non-array `tm()` result as "no paragraphs" rather than throwing, because the i18n library returns `{}` for missing dictionary keys.
- The `rt` cast (`message as string`) is necessary because `tm` is typed as returning `unknown`; the generated dictionary is expected to hold string entries at the given path.

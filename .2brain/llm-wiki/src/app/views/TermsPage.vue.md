---
source: src/app/views/TermsPage.vue
sha256: 5dd167edc80e3f443fc13d0c539bf2e4f75c18686a910d57a549c89b363aa3eb
generated_at: 2026-10-02T11:51:59.919761+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/TermsPage.vue

## Purpose

Dedicated terms-of-service page. It exists as its own component (rather than reusing a shared paragraph renderer) because legal copy requires its own structural elements—headings, lists, numbered clauses—that a generic renderer does not support. All visible text is currently Lorem Ipsum placeholder, to be replaced before launch.

## Key elements

- **`paragraphs` (computed)** — Resolves the i18n key `static-pages.terms.paragraphs` into an array of translated strings via `staticPageParagraphs(tm, rt, …)`. Rendered one-per-`<p>` in the template.
- **`tm` / `rt`** — Destructured from `useI18n()` (vue-i18n composer API). Passed into `staticPageParagraphs` for pluralization and runtime interpolation.
- **`StaticPageLinks`** — Navigation component rendered at the bottom of the card; receives `current="terms"` so it can highlight the active link.
- **`staticPageParagraphs`** (imported from `@/app/utils/static-pages.ts`) — Utility that reads a nested i18n key and returns the paragraph array.

## Relationships

No graph neighbors are recorded for this file. Its runtime dependencies (`StaticPageLinks`, `staticPageParagraphs`, `vue-i18n`) are leaf imports with no further edges listed.

## Notes

- The `eslint-disable-next-line @typescript-eslint/unbound-method` on the `tm`/`rt` destructuring is intentional; vue-i18n's documented pattern. Do not "fix" it.
- All user-facing text is placeholder. Before launch, replace the Lorem Ipsum under `static-pages.terms.paragraphs` in the i18n locale files—no code change to this component is needed.
- The outer `#static-page-terms` div is the page-level anchor; navigation or scroll-spy logic may target it.
- Card is constrained to `max-w-2xl` and centered (`mx-auto`); do not stretch it to full width without a design review.

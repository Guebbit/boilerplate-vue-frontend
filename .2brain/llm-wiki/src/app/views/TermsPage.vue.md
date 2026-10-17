---
source: src/app/views/TermsPage.vue
sha256: 796051a44d7c701f4db044c3df3dbe16b1672bf955a26be1862370862493a0d3
generated_at: 2026-10-17T00:07:34.978509+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/TermsPage.vue

## Purpose

Dedicated terms-of-service page component. It exists as its own view rather than reusing a shared paragraph renderer because legal copy requires specific structure (headings, lists, numbered clauses) that the generic renderer does not support.

## Key elements

- **Component name (`'TermsPage'`)** — declared in the non-setup `<script>` block so `<KeepAlive>` and devtools can identify it; `<script setup>` cannot set `name` itself.
- **`paragraphs` (computed)** — resolves the i18n key `static-pages.terms.paragraphs` via the `staticPageParagraphs` helper, returning an array of paragraph strings.
- **`tm` / `rt`** — destructured from `useI18n()`; passed into the `staticPageParagraphs` utility to perform translation at render time.
- **`StaticPageLinks`** — imported component rendered below the prose; receives `current="terms"` to highlight the active link.
- **Template** — renders paragraphs inside a `v-card` (max-width `2xl`, centered) with a `v-for` loop, followed by the links block. Root element carries `id="static-page-terms"`.

## Relationships

No graph neighbors are recorded for this file. It does import `@/app/components/StaticPageLinks.vue` and `@/app/utils/static-pages.ts` at runtime, but neither appears in the dependency-graph neighbor list.

## Notes

- Paragraph content is currently **placeholder Lorem Ipsum** under the i18n key `static-pages.terms.paragraphs`; real legal copy is expected before launch.
- The `eslint-disable-next-line` for `@typescript-eslint/unbound-method` on the `useI18n()` destructure is intentional and matches vue-i18n's documented usage pattern.
- Two `<script>` blocks are required: the plain block solely to expose `name`; the `setup` block for all logic. Removing either breaks devtools identity or the component body.

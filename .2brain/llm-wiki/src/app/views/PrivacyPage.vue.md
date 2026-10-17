---
source: src/app/views/PrivacyPage.vue
sha256: 40e8026f72c15366958a686cbd51593b8ec8f4791e4f6746e2762b0334af2e89
generated_at: 2026-10-17T00:07:23.182072+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/PrivacyPage.vue

## Purpose

Renders the site's privacy-policy page as a standalone Vue SFC. It exists as its own component (rather than reusing a shared paragraph renderer) because real policy copy will need richer structure—headings, lists, data-category tables—that a generic paragraph renderer does not provide.

## Key elements

- **`export default { name: 'PrivacyPage' }`** — Named-component block. Required alongside `<script setup>` (which cannot declare `name` itself) so DevTools and `<KeepAlive>` can identify the component.
- **`paragraphs` (computed)** — Resolves the translated paragraph array via `staticPageParagraphs(tm, rt, 'static-pages.privacy.paragraphs')`. Returns one string per paragraph.
- **`tm` / `rt`** — Destructured from `useI18n()` (vue-i18n). Used as translation helpers passed into `staticPageParagraphs`.
- **`StaticPageLinks`** — Footer navigation component rendered at the bottom of the card; receives `current="privacy"` to highlight the active link.
- **`staticPageParagraphs`** — Utility (from `@/app/utils/static-pages.ts`) that maps an i18n key to an array of paragraph strings.
- **Template** — A `<v-card>` containing a `v-for` over `paragraphs` (each rendered as a `<p>`), followed by `<StaticPageLinks>`. Root element has `id="static-page-privacy"` for in-page anchoring.

## Relationships

- Imports `StaticPageLinks` (`@/app/components/StaticPageLinks.vue`) for the shared static-page footer nav.
- Imports `staticPageParagraphs` (`@/app/utils/static-pages.ts`) for the i18n-key → paragraph-array mapping.
- Depends on `vue-i18n` (`useI18n`, `tm`, `rt`) for all text resolution.

## Notes

- **Dual `<script>` blocks are intentional:** the plain `<script lang="ts">` block exists solely to supply `name` to the SFC; all logic lives in `<script setup>`.
- **Content is placeholder:** `static-pages.privacy.paragraphs` currently resolves to Lorem Ipsum. Real policy copy replaces it before launch.
- **Eslint disable on `tm`/`rt`:** `@typescript-eslint/unbound-method` is suppressed because vue-i18n's documented pattern destructures these from the composer, which handles binding internally.
- **Key strategy:** paragraphs use an index-based key (`'p-' + index`) rather than content-based keys, since the array is static per locale and order-stable.

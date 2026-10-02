---
source: src/app/views/PrivacyPage.vue
sha256: 4bf82996ee9d7edebb7d9fb8e6df9deef2721459a45fe2df66dac21e2eb5faa3
generated_at: 2026-10-02T11:51:45.851718+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/PrivacyPage.vue

## Purpose

Renders the site's dedicated privacy-policy page. It exists as a standalone component (rather than reusing a shared paragraph renderer) because real policy copy will require headings, lists, and data-category tables that a generic renderer cannot express. Content is currently placeholder Lorem Ipsum, to be replaced before launch.

## Key elements

- **`paragraphs`** (computed) — Resolves the translated paragraph list via `staticPageParagraphs(tm, rt, 'static-pages.privacy.paragraphs')`. Returns one string per paragraph.
- **`StaticPageLinks`** — Imported from `@/app/components/StaticPageLinks.vue`; renders cross-links to other static pages, receiving `current="privacy"` to highlight the active page.
- **`staticPageParagraphs`** — Utility from `@/app/utils/static-pages.ts`; given the i18n `tm`/`rt` helpers and a key path, returns the localized paragraph array.
- **Template** — A Vuetify `v-card` (max-width 2xl) that iterates `paragraphs` as `<p>` elements, followed by the `StaticPageLinks` block. The outer `div` carries `id="static-page-privacy"` for in-page anchoring.

## Relationships

- **`StaticPageLinks`** (import) — Rendered at the bottom of the card to provide navigation to sibling static pages (terms, cookies, etc.). The `current` prop tells it which link to mark active.
- **`static-pages.ts`** (import) — Supplies the paragraph-resolution helper; the actual copy strings live in i18n resources under the `static-pages.privacy.paragraphs` key.
- **`vue-i18n`** (import) — Provides `tm` (translation map) and `rt` (raw text) functions used by `staticPageParagraphs` to fetch localized strings.

## Notes

- The file contains **both** an options-`<script>` (setting `name: 'PrivacyPage'`) and a `<script setup>` block. This split is required so the component name is available to DevTools/`keep-alive` while still using the composition API.
- The `eslint-disable-next-line` on the `tm`/`rt` destructuring is intentional: `useI18n` binds these internally, and the rule is a false positive here.
- All visible copy is **placeholder**; do not treat the rendered text as the actual legal policy.
- The template structure is deliberately simple (flat `<p>` list) as a starting point. Expect it to grow into headings, lists, and tables when real policy copy lands—this is the stated reason the page is its own component.

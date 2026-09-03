# src/app/views/TermsPage.vue

## Purpose

Renders the site's Terms of Service page. It exists as a standalone component (rather than reusing a generic paragraph renderer) because legal copy requires its own structural concerns. The actual legal text is not yet written — placeholder Lorem Ipsum strings live in i18n resources and are expected to be replaced before launch.

## Key elements

- **`paragraphs` (computed)** — Resolves the ordered list of paragraph strings via `staticPageParagraphs(tm, rt, 'static-pages.terms.paragraphs')`. Each entry is rendered as a `<p>` in the template.
- **Template** — Wraps content in `LayoutDefault` (with `id="static-page-terms"`), displays paragraphs inside a centered `v-card` (max-width `2xl`), and renders `StaticPageLinks` with `current="terms"` to highlight the active nav item.
- **i18n helpers** — Destructures `t`, `tm`, and `rt` from `useI18n()` (vue-i18n composer). `t` handles the page title; `tm`/`rt` are passed into the `staticPageParagraphs` utility to resolve the raw paragraph list.

## Relationships

No graph neighbors are recorded for this file. Its runtime dependencies are:

- `LayoutDefault` (`@/app/layouts/LayoutDefault.vue`) — outer page shell.
- `StaticPageLinks` (`@/app/components/StaticPageLinks.vue`) — sibling-static-page navigation; receives `current="terms"` to mark itself active.
- `staticPageParagraphs` (`@/app/utils/static-pages.ts`) — utility that turns the i18n raw-message list into an array of translated strings.

## Notes

- The `<script lang="ts">` block (outside `<script setup>`) only sets the component `name: 'TermsPage'`; all logic lives in the `setup` block.
- The eslint-disable on the `useI18n()` destructuring is required because vue-i18n's composer self-binds `t`/`tm`/`rt` internally; treating them as unbound methods would break behavior.
- Paragraph content is intentionally placeholder (Lorem Ipsum) and keyed under the i18n namespace `static-pages.terms.paragraphs`. Replace before launch.
- Template uses Vuetify's `v-card` and Tailwind utility classes (`mx-auto mt-10 w-full max-w-2xl p-8`) for layout; no scoped styles.

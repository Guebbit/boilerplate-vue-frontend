# src/app/views/PrivacyPage.vue

## Purpose

Renders the site's privacy-policy page as a dedicated component. It exists separately from any shared paragraph renderer because real policy copy will require richer structure (headings, lists, data-category tables) that a generic renderer does not support.

## Key elements

- **`PrivacyPage` component** — Vue SFC with `<script setup lang="ts">`; component name declared via the classic options object.
- **`paragraphs` (computed)** — Resolves the ordered list of policy paragraphs by calling `staticPageParagraphs(tm, rt, 'static-pages.privacy.paragraphs')`. Currently returns placeholder Lorem Ipsum strings from the i18n catalog.
- **`useI18n()` destructuring** — Exposes `t` (plain string lookup), `tm` (raw message), and `rt` (runtime interpolation) for the static-page utilities.
- **Template** — Wraps content in `LayoutDefault`, renders each paragraph as a `<p>` inside a centered `v-card` (max-width `2xl`), and appends `StaticPageLinks` with `current="privacy"`.

## Relationships

The dependency graph lists no formal neighbors, but the file imports:

- `@/app/layouts/LayoutDefault.vue` — page shell (header, nav, footer).
- `@/app/components/StaticPageLinks.vue` — footer navigation among static pages; receives `current="privacy"` to highlight the active link.
- `@/app/utils/static-pages.ts` → `staticPageParagraphs` — shared helper that turns a dot-path key + i18n raw-message/runtime helpers into an array of translated strings.
- `vue-i18n` — `useI18n()` composer.

## Notes

- **Placeholder copy.** All paragraph strings under `static-pages.privacy.paragraphs` are Lorem Ipsum. Real legal copy must be injected into the i18n resources before launch.
- **Eslint suppression.** The `@typescript-eslint/unbound-method` disable is intentional: vue-i18n's own docs show destructuring `t`/`tm`/`rt` from `useI18n()` and the composer self-binds them.
- **Future structure.** The component is deliberately isolated so that when real policy copy arrives (with headings, tables, etc.), only this file needs restructuring—no shared renderer to modify.

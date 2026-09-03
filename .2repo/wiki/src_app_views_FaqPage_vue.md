# src/app/views/FaqPage.vue

## Purpose

Renders the shop's FAQ as a series of topic headings, each followed by an accordion of question/answer pairs. All visible copy is pulled from i18n (`static-pages.faq.*`); this file only declares topic keys, their order, and the layout. A conditional contact CTA appears at the bottom when the Contact route is present in the build.

## Key elements

- **`TOPICS`** — `readonly string[]` of four keys (`'shopping'`, `'orders'`, `'account'`, `'demo'`) that determine which topics render and in what order. Adding a topic means adding a key here *and* a dictionary entry.
- **`entriesOf(topic)`** — Calls `tm()` to fetch the raw entry array for a topic, then maps each `{ q, a }` pair through `rt()` into a `FaqEntry`. Returns `[]` when the dictionary path is missing or not an array.
- **`topics`** (computed) — Combines a title (`t()`) and entries (`entriesOf()`) per topic, then **filters out any topic whose entries array is empty** so a bare heading is never rendered.
- **`hasContact`** (computed) — `router.hasRoute('Contact')`; gates the closing CTA card.
- **Template** — Uses `LayoutDefault` as the shell, Vuetify `v-expansion-panels` (accordion variant) for Q&A, a `v-card` CTA with `MessageSquare` icon, and `StaticPageLinks` for sibling-page navigation.

## Relationships

No graph neighbors are recorded for this file. It imports the following local modules:

- `@/app/layouts/LayoutDefault.vue` — page shell (title, nav).
- `@/app/components/StaticPageLinks.vue` — renders links to other static pages; receives `current="faq"`.
- `@/infrastructure/i18n/router-link.ts` — `routerLinkI18n` helper used to build the i18n-aware `:to` for the Contact button.

## Notes

- **Two `<script>` blocks:** the non-setup block exists solely to set `name: 'FaqPage'` (for devtools / `<KeepAlive>`); all logic lives in `<script setup>`.
- **`tm()` contract:** returns `{}` (an empty object, not an array) when the i18n path is absent. `entriesOf` guards with `Array.isArray` to avoid treating that as a valid (empty) list.
- **`rt()` vs `t()`:** topic titles use plain `t()`, but individual question/answer strings use `rt()` (rich-text rendering), implying they may contain markup or interpolation directives.
- **Topic visibility is data-driven:** if a translation key is removed from the dictionary, that topic silently disappears rather than showing an error.
- **Eslint disable** on the `useI18n()` destructuring is intentional — vue-i18n's composer handles method binding internally.

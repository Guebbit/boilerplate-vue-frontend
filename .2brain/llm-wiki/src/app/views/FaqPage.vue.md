---
source: src/app/views/FaqPage.vue
sha256: f0a7b403f7c50db6ad9bb67041486bf8dc582d27a18f2a63a72af9ca2386de5d
generated_at: 2026-10-02T11:51:06.333369+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/FaqPage.vue

## Purpose

Renders the shop's FAQ as a series of topic headings, each with an accordion of question/answer pairs. All copy is pulled from the i18n dictionary under `static-pages.faq.topics.*`; the file itself only declares the topic keys and their order. A contact CTA card appears at the bottom only when a `Contact` route exists in the current build.

## Key elements

- **`TOPICS`** — `readonly string[]` (`['shopping', 'orders', 'account', 'demo']`); the single source of truth for topic keys and reading order.
- **`FaqEntry`** — interface with `question` and `answer` fields; the shape rendered by each expansion panel.
- **`entriesOf(topic)`** — resolves a topic's entries via `tm(...)`, guards against non-array results, and maps the dictionary's `{ q, a }` keys into `{ question, answer }` using `rt()` for rich-text rendering.
- **`topics`** (computed) — maps `TOPICS` to `{ key, title, entries }` objects and **filters out** any topic whose entry list is empty, so a missing dictionary section produces no heading.
- **`hasContact`** (computed) — `router.hasRoute('Contact')`; gates the contact CTA card.
- **Template** — iterates `topics` in `<v-expansion-panels variant="accordion">`, conditionally renders a `<v-card>` contact CTA (with `routerLinkI18n` link), and closes with `<StaticPageLinks current="faq" />`.

## Relationships

No graph neighbors are listed for this file in the dependency graph. (It imports `StaticPageLinks.vue`, `routerLinkI18n.ts`, `vue-i18n`, `vue-router`, and `lucide-vue-next`, but these do not appear as recorded neighbors.)

## Notes

- **Dual script blocks:** The non-setup `<script>` exists solely to attach `name: 'FaqPage'` so `<KeepAlive>` and devtools can identify the component; `<script setup>` cannot declare a `name` itself.
- **`tm()` fallback:** vue-i18n's `tm()` returns `{}` (not an array) when a path is absent. `entriesOf` checks `Array.isArray` before mapping; without this guard an empty topic would crash on `.map`.
- **Empty-topic filtering:** The `.filter(topic => topic.entries.length > 0)` on the `topics` computed means a topic key present in `TOPICS` but missing from the dictionary is silently skipped rather than rendered as a bare heading.
- **i18n destructuring:** `const { t, tm, rt } = useI18n()` carries an eslint-disable for `unbound-method`; vue-i18n's composer binds these internally, so the warning is a false positive.
- **Conditional contact CTA:** The CTA is not a static "coming soon" link; it is fully hidden (not just disabled) when the `Contact` route is absent, supporting builds that omit the feedback module.

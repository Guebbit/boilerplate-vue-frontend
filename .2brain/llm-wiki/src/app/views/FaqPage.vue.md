---
source: src/app/views/FaqPage.vue
sha256: d18ae9e3c5dc16b910e3bc215745fefa6eb6f2559633a758f69e682dd62df4ef
signature: 5d0248f4e86c697f8abdcc43aaae855c094cc1607ebf8b7e0310d12f1610ab3f
generated_at: 2026-11-10T02:59:11.371606+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/FaqPage.vue

## Purpose

Renders the shop's FAQ page: questions grouped into four topics (shopping, orders, account, demo), each topic a heading over an accordion of expansion panels. All copy is pulled from the i18n dictionary under `static-pages.faq.topics.*`; the file itself only declares topic keys and their order. Conditionally appends a contact-form CTA when the Contact route exists in the build.

## Key elements

- **`TOPICS`** — `readonly string[]` of the four topic dictionary keys, in reading order.
- **`FaqEntry`** — interface `{ question: string; answer: string }` for a rendered Q/A pair.
- **`entriesOf(topic)`** — calls `tm()` on the topic's `entries` array, maps `{ q, a }` pairs through `rt()`, and returns `[]` if the dictionary has no entries for that topic.
- **`topics` (computed)** — maps `TOPICS` into `{ key, title, entries }` objects; filters out any topic whose entry list is empty so no orphan heading renders. Re-resolves on locale change.
- **`hasContact` (computed)** — checks `router.hasRoute('Contact')` to gate the contact CTA card.
- **Template** — iterates `topics` in `<section>` blocks, renders each entry in a `v-expansion-panel` (variant `accordion`). Closes with an optional `v-card` contact CTA (with `MessageSquare` icon and a `v-btn` linking to the Contact route via `routerLinkI18n`) and a `StaticPageLinks` card highlighting the current `faq` page.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Dual `<script>` blocks:** The plain `<script lang="ts">` block exists solely to set `name: 'FaqPage'` (required for devtools / `<KeepAlive>`); `<script setup>` cannot declare a component name itself.
- **`tm` + `rt` pattern:** `tm()` returns raw message objects (or `{}` if the key is missing); `rt()` resolves a single message. The `entriesOf` guard (`Array.isArray`) prevents a missing dictionary key from crashing the map.
- **Empty-topic filtering:** A topic whose dictionary entry resolves to zero Q/A pairs is silently dropped from the rendered list rather than showing an empty heading.
- **Conditional contact CTA:** The contact card and its button render only when the `Contact` route is registered, so builds without the tasks module simply omit it.
- **Eslint suppression:** The `useI18n()` destructuring carries an `eslint-disable` for `@typescript-eslint/unbound-method` because vue-i18n's composer binds the methods internally.

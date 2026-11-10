---
source: src/ui/organisms/CardDetail.vue
sha256: e8a5b3532b1840e755df1ac700003c83c2ab266e10e78410a3ef56f49e0d42f0
signature: d25c1c625f84c0e920cc66372dd6e8316a1fd82b50bae910d53865c6c66681d2
generated_at: 2026-11-10T06:29:37.591846+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/CardDetail.vue

## Purpose

A thin, presentational card shell (wrapping Vuetify's `v-card`) that all detail-page and edit-page cards render through. It standardises the flat-bordered card chrome, the optional heading block (title + subtitle + actions), and the semantic root tag, so callers like `ItemDetailHero` or stat tiles only supply content rather than repeating card markup.

## Key elements

- **`inheritAttrs: false` + `v-bind="$attrs"` on the `<v-card>`** — caller-supplied classes/attributes land on the `v-card` itself, not on the component's implicit wrapper, avoiding duplicate styling.
- **Props:**
  - `as` — semantic tag for the card root (`article` | `aside` | `div` | `section`); defaults to `article`.
  - `title` — heading text; the entire heading `<div>` is omitted when absent.
  - `subtitle` — secondary line rendered below the heading; only appears when `title` is also set.
- **Slots:**
  - `default` — main card content, rendered after the heading block.
  - `title-actions` — controls placed at the right end of the heading row (kebab-case in templates).
- **Template** — a single `<v-card variant="flat" border class="p-6">` with a conditional heading row (`flex`, `justify-between`) followed by the default slot.

## Relationships

No dependency-graph neighbors are recorded for this file. It is a leaf presentational component with no imports from other project modules; its only external dependency is Vuetify's `v-card`.

## Notes

- The heading block is **all-or-nothing**: if `title` is undefined, neither the subtitle nor the `#title-actions` slot renders (the wrapping `<div v-if="title">` guards all three).
- The component lives in the `organisms` layer and is intentionally content-agnostic; it carries no logic of its own beyond prop/slot passthrough.
- The `as` prop maps directly to Vuetify's `:tag` on `v-card`, so it controls the rendered HTML element.

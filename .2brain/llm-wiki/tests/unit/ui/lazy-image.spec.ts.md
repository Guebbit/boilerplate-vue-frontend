---
source: tests/unit/ui/lazy-image.spec.ts
sha256: 0599bcaa8f7d75524aff971aca61df82f937c71ab31a1da3e8c7c0058f83bc0a
signature: f5b8b13f5ff2bc1d1316765f89d41c02e59aebcdbd857dc104893501e9e1253e
generated_at: 2026-11-10T08:26:57.045717+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/lazy-image.spec.ts

## Purpose

Unit tests for `LazyImage.vue` that pin down the component's four core behaviors: placeholder fallback (by absence and by load failure), accessible `alt` text per tier, `loading="lazy"`/`eager` selection, and the optional blurred thumbnail layer. The suite exists because these decisions are invisible in visual tests until they are wrong.

## Key elements

- **`mountImage(props)`** — helper that mounts `LazyImage` with Vuetify + i18n plugins and a default `alt` of `"Photo of Blue Widget"`.
- **`mainImage(wrapper)`** — returns the *last* `<img>` in the DOM (the full-image layer), regardless of whether a thumbnail is present.
- **`thumbnailImage(wrapper)`** — returns the element matching `[data-test="lazy-image-thumbnail"]`; absent when no thumbnail is rendered.
- **`PLACEHOLDER_ALT`** — the expected placeholder `alt` string, read directly from `@/locales/en.json` to keep assertions independent of the component's rendering.
- **`beforeAll(() => loadLocale('en'))`** — loads the i18n dictionary before any test runs.
- **Four `describe` blocks** — "which picture is shown", "what it announces", "how it loads", "the thumbnail tier".

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **`loadLocale('en')` is load-bearing, not boilerplate.** Without it, `t('image.placeholder-alt')` returns the key string, the component renders the key, and an assertion comparing the two passes trivially. The `beforeAll` call and the `PLACEHOLDER_ALT` constant (plus the explicit `not.toBe('image.placeholder-alt')` check) together make the i18n assertion real.
- **URL assertions use `instance.defaults.baseURL`.** The test asserts resolved absolute URLs rather than relative paths, coupling the test to the configured API origin.
- **Per-URL failure reset** is tested by triggering `error` on one `src`, then calling `setProps` with a new `src` on the same instance — simulating the `v-for` row-recycling scenario the component must survive.
- **The thumbnail tier is decorative by contract** (`alt=""`, `aria-hidden="true"`) and is dropped from the DOM entirely when the full image fails.
- **`fill: true` overrides pixel width.** When set, the style contains `width: 100%` and no explicit pixel value, while still preserving `aspect-ratio`.

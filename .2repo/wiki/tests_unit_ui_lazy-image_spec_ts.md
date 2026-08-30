# tests/unit/ui/lazy-image.spec.ts

## Purpose

Unit test suite for `LazyImage.vue` that pins down four behavioral contracts: placeholder selection (absence vs. 404), `alt` text integrity across all display states, per-URL failure reset for recycled instances, and the `loading` attribute strategy. These are written as logic-level assertions rather than visual checks because the behaviors are invisible until they are wrong.

## Key elements

- **`mountImage(props)`** — Helper that mounts `LazyImage` with a default `alt: 'Photo of Blue Widget'`, spreads caller props, and registers `vuetify` + `i18n` as global plugins.
- **`mainImage(wrapper)`** — Selector returning the *last* `<img>` in the DOM (the full-image layer, which sits beneath any future thumbnail tier).
- **`PLACEHOLDER_ALT`** — Reads `enMessages.image['placeholder-alt']` so assertions compare against the actual dictionary value rather than a duplicated string.
- **`beforeAll(() => loadLocale('en'))`** — Loads the i18n locale so `t()` resolves to real text; without it the component renders the key and self-comparing assertions pass vacuously.
- **`describe('which picture is shown')`** — Covers src resolution against the API base URL, placeholder on missing `src`, delayed placeholder on `error` event, and clean-slate reset when `src` changes after a failure (the `v-for` recycling case).
- **`describe('what it announces')`** — Verifies caller `alt` is used for real images, placeholder gets its own i18n string, and `alt=""` stays empty (decorative) even in the placeholder tier.
- **`describe('how it loads')`** — Asserts `loading="lazy"` by default, `loading="eager"` when the `eager` prop is set, reserved dimensions via inline `width`/`aspect-ratio`, and that only one `<img>` renders (no thumbnail tier with today's backend).

## Relationships

No graph-tracked neighbors. The file imports `LazyImage.vue` (SUT), the shared `vuetify` and `i18n` plugins, the HTTP client (`instance.defaults.baseURL`), and `en.json` for the placeholder string assertion.

## Notes

- The i18n `beforeAll` is load-bearing, not boilerplate: without it, `t('image.placeholder-alt')` returns the key, the component renders the key, and an equality assertion is a tautology. The suite explicitly guards against this with `expect(PLACEHOLDER_ALT).not.toBe('image.placeholder-alt')`.
- `mainImage` always indexes the **last** `<img>` because the component's architecture places the full image after any thumbnail layer. Today there is only one `<img>`, but the selector is written for the multi-tier future.
- The "clean slate" test simulates Vue's `v-for` component recycling by mutating `src` on the same mounted instance after an `error` event — it is not a re-mount.
- `alt=""` is a sentinel for "decorative" (e.g., the nav avatar whose button already carries the accessible name). The test locks in that this sentinel survives the placeholder fallback.

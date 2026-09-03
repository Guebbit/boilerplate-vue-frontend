# tests/unit/ui/lazy-image.spec.ts

## Purpose

Unit tests for the `LazyImage.vue` molecule, pinning the four decisions every stored picture in the app must satisfy: placeholder-on-absence *and* placeholder-on-failure (never pre-empting a slow load), `alt` text that tracks what is actually on screen (including the `alt=""` decorative contract), per-URL failure state that resets when a recycled `v-for` row receives a new record, and the `loading="lazy"` / `eager` performance attribute. These are pinned in a unit suite rather than the visual suite because the behaviors are invisible until they break.

## Key elements

- **`beforeAll(() => loadLocale('en'))`** — loads the English dictionary so `t('image.placeholder-alt')` resolves to real copy. Without it, both the component and the assertion render the raw key, producing a vacuously green test.
- **`PLACEHOLDER_ALT`** — reads `enMessages.image['placeholder-alt']` directly from the JSON, making the assertion a real comparison against the dictionary rather than a self-referential tautology.
- **`mountImage(props)`** — shared helper that mounts `LazyImage` with a default `alt: 'Photo of Blue Widget'` and injects `vuetify` + `i18n`.
- **`mainImage(wrapper)`** — selects the **last** `<img>` in the wrapper (the full-image layer, always rendered beneath any thumbnail tier).
- **`thumbnailImage(wrapper)`** — selects the `[data-test="lazy-image-thumbnail"]` element (the blurred first-paint layer).
- **`describe('which picture is shown')`** — covers src resolution against the API origin, placeholder on absent `src`, placeholder only after `error` event, and state reset when `setProps` supplies a new `src` (the `v-for` recycling case).
- **`describe('what it announces')`** — covers caller `alt` pass-through, placeholder alt from the dictionary (asserting it is *not* the raw key), and the `alt=""` decorative exception.
- **`describe('how it loads')`** — asserts `loading="lazy"` by default, `loading="eager"` when the `eager` prop is set, `width`/`aspect-ratio` reservation to prevent reflow, and that no thumbnail `<img>` appears when `thumbnailSrc` is absent.
- **`describe('the thumbnail tier')`** — covers thumbnail src resolution, its `alt=""` / `aria-hidden="true"` decorative contract, independence from `src`, and removal on full-image failure.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Locale loading is load-bearing, not boilerplate.** The `beforeAll` call is explicitly documented in-file: skipping it makes the placeholder-alt assertion compare the i18n key against itself, yielding a green test that proves nothing about the rendered output.
- **Failure state is per-URL, not per-instance.** The "gives a new record a clean slate" test exercises the `v-for` recycling scenario: without a reset on prop change, the first broken image poisons every subsequent row in a list. This is the reason the component must watch `src` and clear its internal `errored` flag.
- **`mainImage` picks the last `<img>`, not the first.** When a thumbnail tier is present, the thumbnail is the first element; the full image is always the last. The helper encodes that ordering invariant.
- **The placeholder path is exercised two ways:** `src: undefined` (absence) and `trigger('error')` (failure). Both must land on the same `/images/no-image-placeholder.svg` + `data-placeholder="true"` state, but the failure path must NOT fire before the browser's `error` event (the "slow image" guard).

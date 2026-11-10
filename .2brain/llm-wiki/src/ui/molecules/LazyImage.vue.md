---
source: src/ui/molecules/LazyImage.vue
sha256: 7793c18efae8a6fa2baf4478d4e25fb8e4daebd4bf4cb6318342c398dd54f110
signature: 7793c18efae8a6fa2baf4478d4e25fb8e4daebd4bf4cb6318342c398dd54f110
generated_at: 2026-11-10T06:27:57.576672+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/LazyImage.vue

## Purpose

Renders a single record's image with three visual tiers — a blurred thumbnail, the full image, and a bundled placeholder icon — while handling URL resolution against the API host, reserving layout space before any byte arrives, and using native browser lazy-loading. It exists so that every image site in the app gets identical broken-image, reflow, and lazy-fetch behavior without each caller reimplementing the logic.

## Key elements

- **Props** (`src`, `thumbnailSrc`, `alt`, `width`, `height`, `eager`, `fill`, `roundedClass`) — `src`/`thumbnailSrc` are raw API paths (resolved internally); `eager` forces immediate load for above-the-fold heroes; `fill` makes the box track its container width; `roundedClass` is a Tailwind class (named to avoid colliding with Vuetify's size-based `rounded`).
- **`fullSource` / `thumbnailSource`** (computed) — resolve each prop via `resolveImageUrl`; return `undefined` when the image has failed or the prop is absent.
- **`displayedSource`** (computed) — the full image URL, falling back to `placeholderImageUrl()` when no usable source exists.
- **`isPlaceholder`** (computed) — true when no real image is on screen; drives the `alt` override and `data-placeholder` attribute.
- **`boxStyle`** (computed) — sets explicit `width`/`aspect-ratio` (or `width: 100%` in `fill` mode) so the box is reserved before load and rows don't reflow.
- **`failed` / `loaded`** (refs) — track error and decode state; reset when `src` changes (guards against recycled `v-for` rows inheriting a prior failure).
- **Template** — two `<img>` elements: a decorative blurred thumbnail (`aria-hidden`, `alt=""`) and the primary image with `loading="lazy"`/`"eager"` and `decoding="async"`. The primary image fades in via `opacity` transition over 300 ms.

## Relationships

No graph neighbors are recorded for this file. It imports `resolveImageUrl` and `placeholderImageUrl` from `@/infrastructure/utils/images.ts` and `useI18n` from `vue-i18n`, but neither appears in the dependency graph as a peer component.

## Notes

- **No explicit default on `eager`.** Vue's boolean-prop casting already yields `false` when absent; restating `= false` would trip the `no-useless-default-assignment` lint.
- **Thumbnail stays mounted after the full image decodes.** Unmounting it the instant the fade *begins* leaves ~300 ms of empty space; under an opaque full image the extra DOM node is negligible.
- **`alt=""` is never overridden.** An empty string is a deliberate "decorative" decision (e.g. the nav avatar); the component preserves it across all three tiers rather than substituting placeholder wording.
- **Native `loading="lazy"` is used instead of an IntersectionObserver.** The browser's heuristics account for scroll velocity and connection type; a fixed root-margin observer cannot.
- **`width`/`height` are in CSS pixels** and also feed the `aspect-ratio` CSS value; they are not the intrinsic pixel dimensions of the image file.

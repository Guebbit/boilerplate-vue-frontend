# src/ui/molecules/LazyImage.vue

## Purpose

Renders a single record image with three display tiers (thumbnail → full image → bundled placeholder) while handling URL resolution, layout reservation, lazy loading, and error fallback in one place. It exists so callers never repeat the resolve / placeholder / size / lazy-load logic that every image site in the app needs.

## Key elements

- **`defineProps`** — `src` (raw API path; resolution is this component's job), `alt` (required; `""` means decorative and is never overridden), `width`/`height` (default 96 px; used to reserve the box via `aspect-ratio`), `eager` (bypasses lazy loading for above-the-fold heroes), `rounded` (Tailwind class, default `"rounded"`; use `"rounded-full"` for avatars).
- **`fullSource`** (computed) — `resolveImageUrl(src)` or `undefined` when no src / load failed.
- **`thumbnailSource`** (computed) — `thumbnailImageUrl(src, width)` or `undefined`. Stays mounted even after the full image decodes to avoid a 300 ms gap during the fade.
- **`displayedSource`** (computed) — `fullSource ?? placeholderImageUrl()`; the URL actually set on the visible `<img>`.
- **`boxStyle`** (computed) — inline `width` + `aspect-ratio` so the row never reflows when bytes arrive.
- **`watch(src)`** — resets `failed` and `loaded` flags when a recycled `v-for` row or route-param change supplies a new URL.
- **`failed` / `loaded`** (refs) — track error and decode state; drive the opacity transition between thumbnail and full image.
- **Template** — outer `<div>` carries `data-test="lazy-image"` and `data-placeholder="true"` when a stand-in is shown; thumbnail `<img>` is `alt=""` + `aria-hidden` (decorative); main `<img>` uses native `loading`/`decoding` attributes and a 300 ms opacity transition.

## Relationships

None recorded in the dependency graph. The component imports from `@/infrastructure/utils/images.ts` (`placeholderImageUrl`, `resolveImageUrl`, `thumbnailImageUrl`) and `vue-i18n` (`useI18n` for the placeholder alt string).

## Notes

- `eager` intentionally has **no default value**; Vue's absent-boolean → `false` coercion is relied upon, and an explicit `= false` would trip the `no-useless-default-assignment` lint rule.
- The thumbnail tier is a no-op today because the backend does not serve thumbnails; the component degrades to plain lazy-loading. This is the designed fallback, not a TODO.
- `alt=""` (decorative) is the **one** value that survives the placeholder override; the placeholder alt from i18n is applied only when `alt` is a non-empty string and the placeholder is showing.
- Native `loading="lazy"` is preferred over an IntersectionObserver: the browser accounts for scroll velocity and connection type, which a fixed root-margin observer cannot.
- The thumbnail is `scale-105 blur-sm` to mask the soft edge that `object-cover` blur leaves behind; it is removed from the DOM only when `thumbnailSource` is falsy, not when `loaded` flips.

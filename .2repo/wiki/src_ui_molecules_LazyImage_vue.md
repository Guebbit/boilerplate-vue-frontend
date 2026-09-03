# src/ui/molecules/LazyImage.vue

## Purpose

Renders a single record image in three tiers — a small blurred thumbnail that paints instantly, the full image that fades in over it once decoded, and a bundled placeholder icon when no image exists or the request fails. It centralises URL resolution, box reservation, lazy loading, and graceful degradation so that no caller has to handle those concerns individually.

## Key elements

- **Props** — `src` and `thumbnailSrc` (raw API paths; the component resolves them), `alt` (required; `""` is preserved as "decorative" across all tiers), `width`/`height` (default 96 × 96, used to reserve the box via `aspect-ratio`), `eager` (skip lazy loading for above-the-fold heroes), `rounded` (Tailwind class, defaults to `rounded`).
- **`failed` / `loaded` refs** — track error state and full-image decode; both are reset via a `watch` on `src` so a recycled `v-for` row doesn't inherit a stale broken state.
- **`fullSource` / `thumbnailSource` computed** — call `resolveImageUrl()` on the raw prop; return `undefined` when `failed` is true.
- **`displayedSource` computed** — `fullSource` or `placeholderImageUrl()` as a fallback.
- **Template** — two `<img>` elements inside a sized, `overflow-hidden` wrapper: the thumbnail (`alt=""`, `aria-hidden`, `scale-105 blur-sm`) stays mounted underneath after the full image fades in; the main image uses native `loading="lazy"` / `decoding="async"` and transitions opacity over 300 ms.

## Relationships

- **`@/infrastructure/utils/images.ts`** — imports `resolveImageUrl` (turns an API-relative path into an absolute URL against the API host) and `placeholderImageUrl` (returns the bundled fallback icon URL).
- **`vue-i18n`** — `useI18n().t` supplies the placeholder's accessible name (`image.placeholder-alt`), which overrides the caller's `alt` only when a placeholder is shown and `alt` is non-empty.

## Notes

- Callers pass raw API paths; resolving them inside the component is deliberate to avoid duplicated logic upstream.
- `thumbnailSrc` is independent of `src` — the backend serves them as separate files (small WebP derivative vs. original), so there is no client-side `width` parameter.
- The thumbnail is intentionally **not** unmounted when `loaded` flips to true; removing it at the start of the fade would expose 300 ms of empty box. It costs nothing to leave under an opaque layer.
- Native `loading="lazy"` is preferred over an `IntersectionObserver` because the browser accounts for scroll velocity and connection type.
- `eager` has no explicit `false` default; Vue's boolean-prop casting handles the absent case, and restating it would trip the `no-useless-default-assignment` lint rule.
- `alt=""` (decorative) is the one value never overridden by the placeholder text — critical for the nav account button where the button already carries the accessible name.

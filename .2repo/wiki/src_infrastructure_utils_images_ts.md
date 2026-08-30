# src/infrastructure/utils/images.ts

## Purpose

Leaf module that answers one question from three angles: given a record's `imageUrl`, what does `<img src>` get? It resolves API-relative paths to absolute URLs, optionally appends a thumbnail query parameter, and supplies a bundled placeholder for records with no image.

## Key elements

- **`resolveImageUrl(source?)`** — Converts a relative API path (e.g. `/images/<hash>.png`) into an absolute URL by prefixing the axios instance's `baseURL`. Returns the input unchanged if it's already self-contained (absolute, scheme-relative, `blob:`, `data:`), and `undefined` for empty input.
- **`thumbnailImageUrl(source?, width = 64)`** — Appends a width query parameter to the resolved URL. Returns `undefined` when `VITE_IMAGE_THUMBNAIL_PARAM` is unset (the current default), signalling "no thumbnail tier; load the full image."
- **`placeholderImageUrl()`** — Returns the same-origin path `/images/no-image-placeholder.svg` for use when a record has no image.
- **`isSelfContained(source)`** (private) — Regex check for absolute URLs, scheme-relative URLs, or in-memory schemes (`blob:`, `data:`).
- **`THUMBNAIL_WIDTH_PARAMETER`** (private) — Read once from `import.meta.env.VITE_IMAGE_THUMBNAIL_PARAM`; empty string means the backend serves no sized variants.

## Relationships

No formal dependency-graph neighbors are registered. The file imports `instance` from `@/infrastructure/http/client.ts` solely to read `instance.defaults.baseURL` for the origin prefix in `resolveImageUrl`. It is consumed by image-rendering components (notably `LazyImage`, referenced in doc comments).

## Notes

- The origin prefix is read from the axios instance at call time, **not** from `import.meta.env` at build time. This is intentional: the e2e shard runner's `__E2E_API_URL` override is a runtime value invisible to build-time reads.
- When `baseURL` is empty (single-origin deployment), the function ensures the path starts with `/` to avoid producing a leading `//` that the browser would parse as a scheme-relative host.
- `thumbnailImageUrl` is a no-op until `VITE_IMAGE_THUMBNAIL_PARAM` is set in the environment. Activating it is a one-line `.env` change, not a code change — provided the backend uses a query-parameter convention. A path-based variant scheme would require rewriting this function.
- The placeholder is a bundled SVG in `public/`, chosen to avoid any third-party network dependency.

# src/infrastructure/utils/images.ts

## Purpose

Two small leaf functions that turn an API record's relative image path into a URL a browser can actually fetch, and supply a bundled SVG when no image exists. They exist because the OpenAPI contract returns `uri-reference` values (paths relative to the API host), and handing those straight to `<img src>` 404s whenever the frontend and API are on different origins.

## Key elements

- **`isSelfContained(source)`** *(private)* — Regex check for absolute URLs, scheme-relative (`//…`), `blob:`, or `data:` schemes. Returns `true` for anything the browser can already fetch as-is.
- **`resolveImageUrl(source?)`** — Public. Returns `undefined` for nullish input, passes through self-contained URLs, and otherwise prepends the axios instance's `baseURL` (with slash-normalisation). When `baseURL` is empty (same-origin deploy) it simply ensures a leading `/`.
- **`placeholderImageUrl()`** — Public. Returns the same-origin path `/images/no-image-placeholder.svg` (a bundled vector in `public/`) for use as a fallback `<img src>`.

## Relationships

- Imports `instance` from `@/infrastructure/http/client.ts` to read `instance.defaults.baseURL` at call time, so the prefix tracks whatever the HTTP client is configured with (including the e2e shard runner's `__E2E_API_URL` runtime override).

## Notes

- The API origin is read from the **axios instance**, not `import.meta.env` or `VITE_API_URL`. This is deliberate: build-time env vars cannot see runtime overrides (e.g. the e2e shard runner injects `__E2E_API_URL` after the bundle is built).
- When `baseURL` is empty the function does **not** join onto `''` (which would produce a scheme-relative `//` URL); it just guarantees a leading slash.
- `placeholderImageUrl` returns a static path string, not a `URL` object—callers are expected to use it directly in `src` attributes.
- The placeholder is a local SVG, not a CDN/third-party image, so it has zero network dependency and no external outage surface.

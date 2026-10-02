---
source: src/infrastructure/utils/images.ts
sha256: 56189a48c892ce96b728ede984421521f6b2bd2c18d37c172ddab4e33c9ac4aa
generated_at: 2026-10-02T12:04:57.062245+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/images.ts

## Purpose

Resolves API-relative image paths into absolute URLs the browser can fetch, and provides a bundled placeholder for records with no image. It exists because the API returns `uri-reference` paths (e.g. `/images/<hash>.png`) that, if handed to `<img src>` unchanged, resolve against the frontend origin and 404 whenever the API lives on a different host.

## Key elements

- **`resolveImageUrl(source?: string | null): string | undefined`** — If `source` is falsy, returns `undefined` (caller should fall back to the placeholder). If it is already self-contained (absolute `https:`/`http:`, scheme-relative `//…`, `blob:`, or `data:`), returns it as-is. Otherwise prefixes it with the axios instance's `baseURL`, normalising slashes. When `baseURL` is empty (single-origin deploy), simply ensures a leading `/`.
- **`placeholderImageUrl(): string`** — Returns the same-origin path `'/images/no-image-placeholder.svg'` (a bundled vector asset in `public/`). Single point of change if the stand-in image ever changes.
- **`isSelfContained(source: string): boolean`** *(internal)* — Regex check that a string starts with a URI scheme (`[a-z][\d+.a-z-]*:`) or a scheme-relative `//`. Used by `resolveImageUrl` to skip rewriting.

## Relationships

- Imports `instance` from `@/infrastructure/http/client.ts` solely to read `instance.defaults.baseURL`. This is deliberate: the base URL is a runtime value (settable by the e2e shard runner's `__APP_CONFIG` override) and would be invisible to a build-time `import.meta.env` read.

## Notes

- The slash-joining logic strips trailing slashes from `apiOrigin` and leading slashes from `source` to avoid producing `//` (which the browser interprets as scheme-relative).
- The placeholder is a local SVG, not a third-party URL: no network dependency, testable without interception, and it scales to any `LazyImage` box size.
- The e2e suite historically could not catch the 404 bug because it asserted on the `src` attribute string, not on an actual byte fetch—this module is the fix at the source.

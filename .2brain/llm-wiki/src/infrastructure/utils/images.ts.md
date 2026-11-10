---
source: src/infrastructure/utils/images.ts
sha256: 56189a48c892ce96b728ede984421521f6b2bd2c18d37c172ddab4e33c9ac4aa
signature: 6c968babf90c8538e83ae02ff949b920c94f987233ced8ce4fc34e7668aa7978
generated_at: 2026-11-10T03:12:21.419947+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/images.ts

## Purpose

Turns the API's relative `imageUrl`/`thumbnailUrl` paths into absolute URLs the browser can actually fetch, and supplies a bundled fallback when no image exists. Both are pure string-shaping helpers with no side effects, kept in one leaf because they are two sides of the same "what goes in `<img src>`" decision.

## Key elements

- **`resolveImageUrl(source?: string | null): string | undefined`** — If the source is already self-contained (absolute URL, `//cdn…`, `blob:`, `data:`) it is returned as-is. Otherwise the API origin is read from the shared axios `instance.defaults.baseURL` and joined with the path. Returns `undefined` for empty/null input so callers know to fall back to the placeholder.
- **`placeholderImageUrl(): string`** — Returns the same-origin path `/images/no-image-placeholder.svg` (a bundled vector asset). Centralised so any future change to the stand-in image is a one-line edit.
- **`isSelfContained(source: string): boolean`** *(internal)* — Regex test that a string already carries a scheme or scheme-relative prefix, i.e. it is not an API-relative path that needs rewriting.

## Relationships

No graph neighbors are tracked for this file.

## Notes

- **BaseURL comes from the axios instance (`@/infrastructure/http/client.ts`), not `import.meta.env`.** This is deliberate: the e2e shard runner injects `__APP_CONFIG` at runtime, a value no build-time `import.meta.env` read can see. Changing the source of the origin string will silently break e2e.
- **Empty `baseURL` case:** When the app is deployed behind one origin (no separate API host), `baseURL` is empty. The code returns the path as-is (or prepends `/`) rather than joining, to avoid producing a `//` prefix the browser would read as a scheme-relative host.
- **`placeholderImageUrl` returns a path, not an absolute URL.** It is same-origin by contract; the caller is responsible for serving it.
- The file is a "leaf" — it exports only two pure functions and one internal helper, making it trivially testable and safe to import anywhere.

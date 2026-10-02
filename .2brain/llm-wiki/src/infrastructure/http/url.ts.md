---
source: src/infrastructure/http/url.ts
sha256: 83e7569d5fa5ffbc48ee50e83158ce5f58602beee61b6be5b1423e2f4d5be287
generated_at: 2026-10-02T11:59:28.024520+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/url.ts

## Purpose

Single-source utility that normalises an Axios request URL (absolute or relative) into the pathname the HTTP layer uses for matching. It exists so that every consumer derives the same canonical pathname from a raw URL, preventing mismatches between route-pattern lookup and exclusion filtering.

## Key elements

- **`toPathname(url: string | undefined): string`** – The only export. Accepts an absolute (`http://…`) or relative URL (or `undefined`). For absolute URLs it extracts `new URL(url).pathname`; for relative URLs it uses the string as-is. Strips any `?query` portion and prepends `/` if missing. Returns `"/"` for falsy input.

## Relationships

- **`src/infrastructure/http/response-schema-map.ts`** – Calls `toPathname` to resolve incoming request URLs to the route-pattern keys it stores.
- **`src/infrastructure/http/refresh.ts`** – Calls `toPathname` to test URLs against its exclusion set (paths that should not trigger a token refresh).

Both depend on this module so that "the same URL" always yields "the same pathname," keeping the two files in agreement by construction.

## Notes

- The function is intentionally trivial and side-effect-free; it is safe to call on every request without caching.
- Only `http://` and `https://` prefixes are treated as absolute. Other schemes (e.g. `file://`, protocol-relative `//host/path`) fall through to the "relative" branch and are used verbatim after query-stripping.
- The split on `?` takes only the first segment, so a fragment after a query (`path?q=1#frag`) is preserved in the returned pathname. If callers expect fragment-stripping, that is not handled here.

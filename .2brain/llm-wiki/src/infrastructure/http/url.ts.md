---
source: src/infrastructure/http/url.ts
sha256: 83e7569d5fa5ffbc48ee50e83158ce5f58602beee61b6be5b1423e2f4d5be287
signature: 2afb14f56fb09f2a1e515a7e28ec0e7e6cf69b0fbdb437f333a22f0dadfc7689
generated_at: 2026-11-10T03:06:51.885909+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/url.ts

## Purpose
Single-point URL normalisation for the HTTP layer. Converts any request URL (absolute or relative) into a consistent pathname so that route matching and exclusion logic agree on the same shape of identifier.

## Key elements
- **`toPathname(url: string | undefined): string`** — The sole export. Strips scheme/host from absolute URLs, removes any query string, and guarantees a leading `/`. Returns `"/"` when the input is falsy.

## Relationships
- **`src/infrastructure/http/response-schema-map.ts`** — Consumes `toPathname` to build/look up route patterns.
- **`src/infrastructure/http/refresh.ts`** — Consumes `toPathname` to populate its exclusion set.

Both files depend on this module so they normalise URLs identically; there is no other shared helper.

## Notes
- The function intentionally does **not** strip trailing slashes, encode/decode segments, or handle fragment identifiers—only query strings are removed.
- Because the module is a leaf (no outgoing imports), changes here ripple to every file that matches or excludes URLs in the HTTP layer. Keep the contract ("always starts with `/`, no query, no host") stable.
- The `startsWith('http://') / startsWith('https://')` check means protocol-relative URLs (`//host/path`) or other schemes (e.g. `ws://`) fall through to the "relative" branch and are treated as-is.

# src/infrastructure/http/url.ts

## Purpose

Provides a single URL-to-pathname normalization function so that the two consumers that must agree on route identity (route-pattern matching and refresh exclusion) derive the same pathname from any given Axios request URL.

## Key elements

- **`toPathname(url: string | undefined): string`** — The only export. Given an absolute (`http://…`, `https://…`) or relative URL, it extracts the pathname, strips any query string, and ensures the result starts with `/`. Returns `"/"` for a falsy input.

## Relationships

- **`src/infrastructure/http/response-schema-map.ts`** — Imports `toPathname` to convert incoming request URLs into the pathname form used for route-pattern matching.
- **`src/infrastructure/http/refresh.ts`** — Imports `toPathname` to normalize URLs against its exclusion set (paths that should not trigger a refresh).

## Notes

- The function intentionally does **not** use `new URL()` for relative paths; it only parses absolute URLs. This means protocol-relative (`//host/path`) URLs are treated as relative and returned with a leading slash prepended.
- Query-string stripping is a simple `split('?')` on the first segment, so fragment-only URLs (`/page#section`) are left intact (the `#` is not removed).
- Because both consumers call this same leaf function, there is no risk of the two disagreeing on which pathname a URL maps to—any future change to normalization belongs in this file.

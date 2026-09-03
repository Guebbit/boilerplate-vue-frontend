# src/infrastructure/http/url.ts

## Purpose

Single-utility leaf module that normalises an Axios request URL into the pathname string the HTTP layer matches on. It exists so that route-pattern lookups and the refresh exclusion set both derive the same pathname from the same input, guaranteeing they cannot disagree about which URLs they recognise.

## Key elements

- **`toPathname(url: string | undefined): string`** — The sole export. Given an absolute or relative URL (or `undefined`), it returns a pathname that always starts with `/`. Absolute `http(s)://` URLs are parsed via `new URL()` to extract the pathname; relative URLs are used as-is. In both cases the query string is dropped and a leading slash is prepended if missing. Returns `'/'` for `undefined`/falsy input.

## Relationships

- **`src/infrastructure/http/response-schema-map.ts`** — Calls `toPathname` to normalise request URLs before matching them against registered route patterns.
- **`src/infrastructure/http/refresh.ts`** — Calls `toPathname` to build/compare the set of URLs excluded from token-refresh interception.

Both depend on this module; this module depends on nothing.

## Notes

- The function is intentionally a leaf: no imports beyond the global `URL` constructor. This keeps the normalisation logic in exactly one place.
- Only `http://` and `https://` prefixes are treated as absolute; any other scheme (e.g. `//host/path` protocol-relative URLs) would fall through to the "relative" branch and be used as-is.
- The query string is stripped with a simple `split('?')`, so only the first `?` is treated as the delimiter (consistent with standard URL parsing for the query portion).

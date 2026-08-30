# src/infrastructure/i18n/router-link.ts

## Purpose

Rewrites any vue-router location so it carries the current locale. Because vue-router ignores `params` when a `path` is present, path-based locations need the locale physically prefixed onto the path, while named locations get it injected into `params.locale`. This file encapsulates that dual handling so callers never construct locale-prefixed routes by hand.

## Key elements

- **`routerLinkI18n(to: RouteLocationRaw): RouteLocationRaw`** — The single export. Inspects the shape of `to`:
  - String → prefix the path with the current locale.
  - Object with a `path` property → spread the object, prefix `path`.
  - Named route (no `path`) → merge `locale` into `params`, but spread the caller's `params` *after* so an explicit `params.locale` overrides the current one.
- **`prefixLocalePath(path, locale)`** — Module-private helper. Normalizes a leading `/`, then prepends `/{locale}` unless the first path segment is already a supported language code (avoids double-prefixing).

## Relationships

- **`src/infrastructure/i18n/index.ts`** — Imports `getCurrentLocale()` and `supportedLanguages` directly from this barrel. The import is written as `'./index.ts'` (the file's own relative path) rather than a self-referencing barrel re-export, to sidestep a circular dependency that would break Rollup's chunking.

## Notes

- The explicit `params.locale` supplied by the caller always wins over `getCurrentLocale()` in the named-route branch. Pass `{ params: { locale: 'fr' } }` to target a specific locale in a single link.
- `prefixLocalePath` treats a relative path (no leading `/`) the same as an absolute one after normalization; it does not resolve `..` or `.` segments.
- If the first path segment happens to match a supported language code (e.g. `/en/something`), no prefix is added. This is the only guard against double-prefixing.

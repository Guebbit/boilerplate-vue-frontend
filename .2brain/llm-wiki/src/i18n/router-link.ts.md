---
source: src/i18n/router-link.ts
sha256: 3136ff77c80494e998e4cb75a55c4bcfca56aaf69f1555f7b8c2f84cc536002c
generated_at: 2026-10-02T11:53:48.391109+00:00
model: ollama:qwen3.8:27b
---

# src/i18n/router-link.ts

## Purpose

Rewrites any `vue-router` location (string, `path`-object, or named route) so it carries the current locale. Because vue-router ignores `params` when a `path` is present, the two location shapes require different treatment — path strings get a locale segment prepended, while named routes get `params.locale` injected.

## Key elements

- **`routerLinkI18n(to: RouteLocationRaw): RouteLocationRaw`** (exported) — Entry point. Inspects the shape of `to` and returns a locale-aware copy. An explicit `params.locale` supplied by the caller always wins over the globally current locale.
- **`prefixLocalePath(path, locale)`** (module-private) — Normalizes a path (prepends `/` if missing) and prepends `/{locale}` unless the first path segment is already a supported language code.

## Relationships

- **`src/i18n/index.ts`** — Imports `getCurrentLocale` and `supportedLanguages` from there. The import uses the relative path `./index.ts` directly rather than a barrel re-export to avoid a circular dependency that would confuse Rollup's chunking (the two files would reference each other, producing a chunk-boundary warning and an unguaranteed execution order).

## Notes

- **Ordering in the named-route branch:** `params` is built as `{ locale, ...to.params }` so that a caller-supplied `locale` overrides the injected one. Do not reverse the spread.
- **`prefixLocalePath` is idempotent** with respect to already-prefixed paths (guarded by the `supportedLanguages.includes(firstSegment)` check), so calling `routerLinkI18n` on an already-localized path is safe.
- This file intentionally does **not** re-export anything from `index.ts`; consumers should import locale utilities from `src/i18n/index.ts` directly.

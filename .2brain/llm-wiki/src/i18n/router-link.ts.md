---
source: src/i18n/router-link.ts
sha256: 3136ff77c80494e998e4cb75a55c4bcfca56aaf69f1555f7b8c2f84cc536002c
signature: 96b26acee4ccfba10fa72ef5fdf687ab27c10342b0642b39672095b59068f560
generated_at: 2026-11-10T03:00:45.782879+00:00
model: ollama:qwen3.8:27b
---

# src/i18n/router-link.ts

## Purpose

Provides a single helper (`routerLinkI18n`) that rewrites any vue-router location so it carries the current locale prefix. It exists because vue-router's link resolution does not automatically inject the active locale, and the two location forms (path-based vs. named) require different treatment.

## Key elements

- **`routerLinkI18n(to: RouteLocationRaw): RouteLocationRaw`** *(exported)* — Main entry point. Branches on the shape of `to`:
  - String → delegates to `prefixLocalePath`.
  - Object with a `path` property → prefixes `to.path` and spreads the rest.
  - Named route (no `path`) → injects `params.locale` while letting any caller-supplied `params.locale` override the current one.
- **`prefixLocalePath(path, locale)`** *(module-private)* — Normalises a relative/absolute path to start with `/`, checks whether the first segment is already a supported language code, and prepends `/<locale>` if not.

## Relationships

- **`src/i18n/index.ts`** — Imports `getCurrentLocale` and `supportedLanguages` directly from this file's path (`'./index.ts'`). The code comment explicitly notes this avoids a barrel re-export, which would create a circular dependency between the two files and cause Rollup to emit a chunk-ordering warning.

## Notes

- **Vue-router quirk:** `params` are silently ignored when `path` is present on a location object. That is why the path-based branch must physically prefix the path string rather than adding a `locale` param.
- **Explicit-locale override:** For named routes, the caller's `params.locale` always wins over `getCurrentLocale()` (spread order: default first, caller last). No such override path exists for the string/path branches — those always use the current locale.
- **Idempotency guard:** `prefixLocalePath` checks `supportedLanguages.includes(firstSegment)` before prepending, so calling the helper twice on the same path won't produce `//en/en/products`.

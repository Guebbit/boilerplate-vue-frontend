---
source: src/app/utils/branding.ts
sha256: a53d690864349b3e51c3fc81fba3083a4470d5dd20a337389af7b09b89bf7dce
signature: ec57d3607cd79abc67b073dfa89fdb38e1ef51f50d527c4b3924f802f4ac87c0
generated_at: 2026-11-10T02:57:52.649433+00:00
model: ollama:qwen3.8:27b
---

# src/app/utils/branding.ts

## Purpose

Centralizes the two identity values a derived deployment changes to look like its own — product name and logo — so renaming the app requires zero source edits. Both values resolve from runtime configuration first, then Vite env vars, then a hardcoded fallback.

## Key elements

- **`brandName()`** — Returns the display name for browser tab titles and routes that declare none. Resolution order: `runtimeValue('APP_NAME')` → `import.meta.env.VITE_APP_NAME` → `'Guebbit'`.
- **`brandLogoSource(baseUrl: string)`** — Returns the `src` string for the app-bar logo. If a value is configured (`runtimeValue('APP_LOGO')` or `VITE_APP_LOGO`) it is returned as-is when it already carries a scheme or `//`; otherwise it is treated as a path relative to the Vite base URL. With no configured value, falls back to `${baseUrl}images/guebbit-logo-colored.png`.

## Relationships

- **Imports** `runtimeValue` from `@/infrastructure/runtime-config` — the sole dependency; all runtime overrides flow through that helper.
- Consumed by any component that renders the app bar or sets document titles (no other graph neighbors are recorded).

## Notes

- `baseUrl` must end with a slash (Vite's `BASE_URL` contract); the function does not add one.
- The regex test for "already a URL" accepts any single-letter scheme (`a:`, `https:`, etc.) and protocol-relative `//`. A bare `localhost:3000` string would match the scheme pattern and be returned verbatim.
- Leading slashes on configured relative paths are stripped before concatenation (`replace(/^\/+/, '')`), preventing `base//images/…`.

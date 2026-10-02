---
source: src/app/utils/branding.ts
sha256: a53d690864349b3e51c3fc81fba3083a4470d5dd20a337389af7b09b89bf7dce
generated_at: 2026-10-02T11:49:36.012556+00:00
model: ollama:qwen3.8:27b
---

# src/app/utils/branding.ts

## Purpose

Centralises the two values a derived project needs to rebrand without touching source code: the product name and the logo image path. Both are read from runtime (container-level) configuration first, then Vite env vars, then a hard-coded default, so a rename is purely a deployment concern.

## Key elements

- **`brandName(): string`** — Returns the app name used in browser-tab titles and as a stand-alone fallback for routes that declare none. Resolution order: `runtimeValue('APP_NAME')` → `VITE_APP_NAME` → `'Guebbit'`.
- **`brandLogoSource(baseUrl: string): string`** — Returns the `src` attribute for the app-bar logo. Resolution order: `runtimeValue('APP_LOGO')` → `VITE_APP_LOGO` → `` `${baseUrl}images/guebbit-logo-colored.png` ``. If the configured value is a full/protocol-relative URL it is returned as-is; otherwise it is treated as a relative path and prefixed with `baseUrl` (leading slashes stripped).

## Notes

- Depends on `runtimeValue` from `@/infrastructure/runtime-config` for container-level overrides that take priority over build-time env vars.
- The logo regex `/^([a-z][\d+.a-z-]*:|\/\/)/i` is the guard that decides "already absolute" vs. "needs base-prefixing." A scheme like `data:` or a protocol-relative `//host/…` will match; anything else is assumed relative to the app's base path.
- `baseUrl` is expected to be Vite's `BASE_URL` (always trailing-slash). Callers must pass it; it is not read internally.

---
source: src/infrastructure/runtime-config.ts
sha256: ee4bbb985d6d74723904833f8d428992fea2e3ed34d89e3ab3ea6bddccc13227
signature: b7cf4f0d52d7625dcc913042aba5d26402a167932322c54a596caf28f99156ab
generated_at: 2026-11-10T03:09:29.855223+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/runtime-config.ts

## Purpose

Sole reader for deployment values that a container may override after the image is built. At container start, `docker/docker-entrypoint.d/` generates a script that sets `window.__APP_CONFIG` before the app bundle loads; in dev, tests, and `vite preview` no such script exists, so every read falls through to its `import.meta.env.VITE_*` default. There is no central config object — each value is read independently at the call site.

## Key elements

- **`RuntimeConfig`** (interface) — Whitelist of the 21 keys a container may override (API URLs, locale, logging, upload limits, feature flags, telemetry, tour toggle). All values are `string | undefined` and none are secrets; they ship to the browser in the compiled bundle.
- **`runtimeValue(name)`** — Reads one key from `globalThis.__APP_CONFIG`, trims it, and returns `undefined` when unset or blank. Never returns `''`, so callers can safely chain `|| import.meta.env.VITE_X`.
- **`readApiUrl()`** — Returns the API base URL (runtime → build-time → `''`). Empty string means the API is same-origin. Shared by the HTTP client and trace propagation.
- **`readToursEnabled()`** — Returns `false` only when `TOURS_ENABLED` explicitly reads the string `'false'`; otherwise tours are enabled. E2e tests inject `false` to keep tours from covering the screen under test.

## Relationships

- **`docker/docker-entrypoint.d/`** — Generates the startup script that populates `window.__APP_CONFIG`. This file is the only consumer of that global.
- **`index.html`** — Loads the generated config script before the app bundle script tag, guaranteeing `__APP_CONFIG` exists by the time `runtimeValue` is called in production.

## Notes

- `runtimeValue` uses `||` (not `??`) intentionally: a blank line in `.env` yields `''`, which must be treated as unset so the fallback chain works.
- All values are non-secret by contract — do not add keys here without confirming the value already ships to the browser.
- There is deliberately no single "get the whole config" function; each call site reads its own key so tree-shaking and independent fallbacks are preserved.

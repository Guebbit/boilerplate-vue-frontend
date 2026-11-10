---
source: src/infrastructure/config.ts
sha256: bb4b94a07a4079b63ecb85396ac9378c70e57b922a1c11ab1ae953d2de18162e
signature: ba8e415e38aa8b1fdd4c24f23d79cdd0e5e9fc93c5f4f73f789e4a3af3f36f85
generated_at: 2026-11-10T03:01:54.491666+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/config.ts

## Purpose

Holds the site's public configuration (session mode, OAuth providers, anti-bot challenge, operator info, terms version) fetched once per tab from `GET /config` and shared read-only across every consumer. Exists as a single-module singleton so that multiple readers (session store, OAuth buttons, human check, cookie table) trigger at most one network call.

## Key elements

- **`config`** — module-level `ref<Config>()`; the single source of truth. `undefined` until loaded.
- **`loading`** — module-level `Promise` guard that de-duplicates concurrent/repeated `loadConfig` calls.
- **`publicConfig`** — exported `readonly(config)`; the public, immutable view consumers import. `undefined` until `loadConfig` resolves.
- **`loadConfig(): Promise<Config | undefined>`** — Fetches config via `getConfig()` (from `@api`) exactly once. On failure, logs via the logger, clears the `loading` sentinel so the next call retries, and resolves with `undefined`. Never rejects.
- **`resetConfig(): void`** — Clears both `config` and `loading` so the next `loadConfig` re-fetches. Intended for test isolation (the module is shared across test cases).

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Imports the `logger` instance and calls it in the `.catch` handler to record a failed config fetch.

## Notes

- The file deliberately does **not** read the shop config (`GET /shop`); that call belongs to the `shop` module. Consumers must not assume shop-related fields are present here.
- Because `loading` is a module-level variable, a failed fetch resets it to `undefined`, meaning the *next* call will re-attempt. This is intentional: a network hiccup is retried on the next access rather than permanently caching the failure.
- `resetConfig` is not intended for production use; it exists solely to prevent state leakage between test cases that share this ESM module instance.

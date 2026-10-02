---
source: src/infrastructure/utils/logger.ts
sha256: 67bc12a181c78c4f8ce2a9adbd16cbeb251bda7a22dcf66ffad927f076606424
generated_at: 2026-10-02T12:05:18.612156+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/logger.ts

## Purpose

The single module in the app permitted to call `console` (ESLint `no-console` is an error everywhere else). It wraps the four console methods behind a level ceiling plus an opt-in scope filter, both resolved once from environment variables at module load. It exists to give every other file a consistent, gated logging API without any of them touching the global console object.

## Key elements

- **`debug(scope, …parts)` / `info(scope, …parts)`** — area-scoped output; suppressed unless the level ceiling allows it *and* the scope is in the enabled set (or `*` is set).
- **`warn(…parts)` / `error(…parts)`** — level-checked only; never scope-filtered so they can't be silently hidden.
- **`logger`** — grouped object (`{ debug, info, warn, error }`) for call-sites that prefer `logger.debug(…)`.
- **`LogLevel`** — union type `'error' | 'warn' | 'info' | 'debug'`, derived from the ordered `LEVELS` array.
- **`LogScopes`** — open interface (currently `router`, `http`, `observability`) that modules extend via declaration merging to register their own scope keys.
- **`LogScope`** — `keyof LogScopes`; a closed set so a typo is a compile error, not a silently-dropped message.
- **`resolveLevel()` / `resolveScopes()`** — read `VITE_APP_LOG_LEVEL` / `VITE_APP_LOG_SCOPES` (via `runtimeValue` from `@/infrastructure/runtime-config`) once at import; unrecognised level values fall back to the environment default rather than silencing output.

## Relationships

- **`@/infrastructure/runtime-config`** — provides `runtimeValue`, the indirection layer for reading configuration at module load (checked before falling back to `import.meta.env`).
- **All listed Vue components and utility files** (e.g. `use-blocking-error.ts`, `use-stale-record.ts`, `idempotency.ts`, `AppVerificationBanner.vue`, `ProfileAddresses.vue`, etc.) — import `debug`/`info`/`warn`/`error` or the `logger` object from this module; none of them call `console` directly.
- **Faro (observability)** — in production, `console.error` output is captured by Faro's `getWebInstrumentations()`. This module deliberately has no import of the observability store so that a failure before Faro initialises still produces a visible trace.

## Notes

- Level and scope sets are **not re-evaluated** after module load; changing env vars at runtime has no effect.
- `warn` and `error` bypass the scope filter entirely — a misconfigured `VITE_APP_LOG_SCOPES` cannot hide them.
- An unrecognised level string (e.g. a typo in `.env`) falls back to `debug` in dev / `warn` in prod rather than silencing all output.
- To add a new scope, a module declares it by extending `LogScopes` via `declare module` merging; no file in `src/infrastructure/utils/` needs to be edited.
- Scopes only gate `debug` and `info`; they are a no-op for `warn`/`error`.

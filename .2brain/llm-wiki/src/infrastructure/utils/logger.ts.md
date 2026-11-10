---
source: src/infrastructure/utils/logger.ts
sha256: 67bc12a181c78c4f8ce2a9adbd16cbeb251bda7a22dcf66ffad927f076606424
signature: 95a173ca13636bcd06d2f0645e7c205e162d758eccfa660367881be4b62eb16a
generated_at: 2026-11-10T03:12:38.278118+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/logger.ts

## Purpose

The single sanctioned `console` boundary in the application (the `no-console` ESLint rule is an error everywhere else). It provides four severity functions (`debug`, `info`, `warn`, `error`) gated by two axes: a level ceiling and an opt-in scope set, both resolved once at module load from environment variables. It mirrors the backend's `NODE_LOG_LEVEL` ladder and adds scope-based filtering for the quieter levels so noisy traces (navigation, per-request) can be enabled per-area without lowering the global level.

## Key elements

- **`LogLevel`** — union type `error | warn | info | debug`; ordering is defined by position in the internal `LEVELS` array.
- **`LogScopes`** — interface with keys `router`, `http`, `observability`; extended by other modules via declaration merging.
- **`LogScope`** — `keyof LogScopes`; a closed set so a typo is a compile error.
- **`debug(scope, …parts)`** / **`info(scope, …parts)`** — level- and scope-gated; silently dropped if the level ceiling or scope set excludes them.
- **`warn(…parts)`** / **`error(…parts)`** — level-gated only, never scope-filtered; `error` always reaches the console in production (Faro's `getWebInstrumentations` captures it).
- **`logger`** — grouped export object `{ debug, info, warn, error }` for call sites preferring `logger.debug(…)` syntax.
- **`resolveLevel()` / `resolveScopes()`** (internal) — read `VITE_APP_LOG_LEVEL` / `VITE_APP_LOG_SCOPES` (or the `runtimeValue` override) once at load; invalid level values fall back to environment defaults rather than silencing output.

## Relationships

- **`src/infrastructure/config.ts` / `@/infrastructure/runtime-config`** — imports `runtimeValue` to resolve level and scope settings at load time; this is the sole runtime configuration dependency of the module.
- **`src/infrastructure/http/idempotency.ts`** — consumer using the `http` scope for request-trace logging.
- **`src/app/components/AppNavigation.vue`, `src/app/tours/AppTourHost.vue`** — consumers using the `router` scope for navigation/tour lifecycle traces.
- **`src/infrastructure/utils/use-ambient-error.ts`, `use-blocking-error.ts`, `use-missing-record.ts`, `use-stale-record.ts`** — consumers calling `warn`/`error` for record and error states.
- **`src/app/components/AppVerificationBanner.vue`, `src/app/components/ReauthDialog.vue`** — consumers surfacing warnings/errors from auth and verification flows.
- **`src/kernel/use-badge-refresh.ts`** — consumer logging refresh activity.
- **`scripts/e2e/run-shards.ts`, `scripts/e2e/shard-process.ts`, `scripts/lighthouse/collect.ts`, `scripts/lighthouse/run.ts`** — script-side consumers that log progress and failures through the same level/scopes API.

## Notes

- Level and scopes are **frozen at module load**. Changing the env var at runtime (e.g., in a test) has no effect; a page reload or fresh module evaluation is required.
- Scopes filter **only** `debug` and `info`. `warn` and `error` bypass the scope check entirely — an area nobody opted into will still surface warnings and errors.
- `VITE_APP_LOG_SCOPES=*` enables all scopes including any added later via declaration merging.
- Default level is `debug` in development, `warn` in production. An unrecognised level string falls back to these defaults rather than silencing all output.
- The `LogScopes` interface is intentionally open for declaration merging: a module in its own folder adds a new scope key without modifying this file.
- In production, `error` output is the primary signal Faro ships; this module deliberately avoids importing any observability store so a failure before Faro initialises still leaves a console trace.

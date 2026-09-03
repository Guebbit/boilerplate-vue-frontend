# src/infrastructure/utils/logger.ts

## Purpose

The single sanctioned console boundary for the entire app. Every other file is forbidden from calling `console.*` (enforced by an ESLint `no-console` rule), so all runtime logging is funnelled through this module. It wraps `console.debug/info/warn/error` behind a level ceiling and an opt-in scope filter, both read once from `VITE_APP_LOG_LEVEL` and `VITE_APP_LOG_SCOPES` at module load.

## Key elements

- **`LEVELS`** (const) — `['error','warn','info','debug']`; array position defines severity ordering.
- **`LogLevel`** (type) — union of the four level strings.
- **`LogScopes`** (interface) — closed set of area keys (`router`, `http`, `observability`). Modules extend it via declaration merging to register their own scope.
- **`LogScope`** (type) — `keyof LogScopes`; a typo is a compile error, not a silent no-op.
- **`resolveLevel()`** / **`resolveScopes()`** (internal) — parse env vars once; unrecognised level falls back to `debug` (dev) or `warn` (prod) rather than silencing.
- **`meetsLevel(candidate)`** (internal) — true if `candidate` is at or above the configured ceiling.
- **`inScope(scope)`** (internal) — true if scope is in the opted-in set or `*` was specified.
- **`debug(scope, …parts)`** — lowest severity; requires both level and scope to pass.
- **`info(scope, …parts)`** — notable output; requires both level and scope.
- **`warn(…parts)`** — error-level severity without scope filter; gated only by level.
- **`error(…parts)`** — highest severity; no scope filter; reaches production console (Faro captures it).
- **`logger`** (const object) — grouped export `{ debug, info, warn, error }` for `logger.debug(…)` call sites.

## Relationships

All listed graph neighbours (account views/components, `Cart.vue`, `Contact.vue`) are **consumers** that import `logger` (or individual functions) to emit `debug`/`info`/`warn`/`error` traces for their respective flows — login, signup, password reset, profile management, cart, and contact. This file exports only; it imports nothing from those modules.

## Notes

- Scopes filter **only** `debug` and `info`. `warn` and `error` are never withheld by scope regardless of `VITE_APP_LOG_SCOPES`.
- Default level in **production** is `warn`, so `debug`/`info` calls are no-ops unless explicitly enabled.
- `VITE_APP_LOG_SCOPES` is empty by default — no scoped output appears until a scope is listed.
- To add a new scope, a module declares it via `declare module '@/infrastructure/utils/logger.ts'` and adds a key to `LogScopes`. No change to this file is needed.
- Both env vars are read **once** at module load. Changing them at runtime (e.g. in a test harness) has no effect without a page reload.
- In production, `error` output is captured by Faro's `getWebInstrumentations()`; this module deliberately has no import of the observability store so that logging works even before Faro initialises.

# src/infrastructure/utils/logger.ts

## Purpose

The app's single console boundary. Every `console.*` call is funneled through this module, gated by a severity ceiling and an opt-in scope set read from environment variables at module load. It exists so the rest of the codebase can use `no-console` as an ESLint error without losing structured, filterable logging.

## Key elements

- **`LEVELS`** (const) — Ordered array `['error', 'warn', 'info', 'debug']`; index position encodes severity.
- **`LogLevel`** (type) — Union of the four level strings.
- **`LogScopes`** (interface) — Closed set of scope keys (`router`, `http`, `observability`). Extensible per-module via TypeScript declaration merging.
- **`LogScope`** (type) — `keyof LogScopes`; a typo is a compile error, not a silent no-op.
- **`resolveLevel()`** (private) — Reads `VITE_APP_LOG_LEVEL`; falls back to `debug` in dev, `warn` in prod. Invalid values use the fallback rather than silencing all output.
- **`resolveScopes()`** (private) — Parses `VITE_APP_LOG_SCOPES` (comma-separated, `*` for all) into a `Set<string>`. Defaults to empty.
- **`debug(scope, ...parts)`** / **`info(scope, ...parts)`** — Scoped, lower-severity output. Suppressed if below the level ceiling **or** the scope is not opted in.
- **`warn(...parts)`** / **`error(...parts)`** — Unscoped. Only level-ceiling applies. In production, `error` still reaches `console.error` so Faro's `getWebInstrumentations()` can capture it.
- **`logger`** (object) — Grouped export `{ debug, info, warn, error }` for call sites that prefer namespaced access.

## Relationships

- **`eslint.config.ts`** — Enforces `no-console` as an error across the project; this file carries the `eslint-disable-next-line no-console` exceptions, making it the sole sanctioned console caller.
- **Vue components & views** (e.g. `ProfilePasswordChange.vue`, `Login.vue`, `Cart.vue`, etc.) — Import `debug`, `info`, `warn`, `error`, or the `logger` object to emit log output from UI flows (login, cart, profile management). They do not touch `console` directly.

## Notes

- Scope filtering applies **only** to `debug` and `info`. A `warn` or `error` is never withheld due to scope.
- `LogScopes` is intentionally a closed set with a `true`-typed value (not `boolean` or a string) so declaration merging is the only extension path and typos fail at compile time.
- Both env vars are read **once** at module load. Changing them at runtime (e.g. in devtools) has no effect until a full reload.
- The `filter(Boolean)` in `resolveScopes` is a deliberate guard against trailing commas / extra whitespace in `.env` files.
- Production `error` logging is coupled to Faro indirectly: this module writes to `console.error`, and Faro's instrumentation captures it. There is no direct import from this file to the observability store.

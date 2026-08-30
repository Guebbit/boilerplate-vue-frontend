# tests/unit/infrastructure/utils/logger.spec.ts

## Purpose
Unit tests for the app's console boundary (`src/infrastructure/logger.ts`, imported as `@/infrastructure/utils/logger`). Because every other module routes through this logger, a wrong scope or level comparison either silences a real error or floods a production console. The tests pin both filtering axes—scope and level—and confirm the defaults that keep a typo'd env var from accidentally muting errors.

## Key elements
- **`loadLogger(environment)`** — Helper that calls `vi.resetModules()`, stubs the given env vars, then performs a fresh `import('@/infrastructure/utils/logger')`. Exists because the logger reads its configuration once at import time.
- **`spies`** — Object holding `vi.spyOn` mocks for `console.debug`, `console.info`, `console.warn`, and `console.error`; set up in `beforeEach`, restored in `afterEach`.
- **`describe('scope filtering')`** — Verifies that `VITE_APP_LOG_SCOPES` controls which `debug` messages are emitted, that `*` enables all, that empty/missing scopes disable all, that list parsing tolerates spaces and trailing commas, that the scope name is prefixed to the message, and that `warn`/`error` bypass scope filtering entirely.
- **`describe('level filtering')`** — Verifies that `VITE_APP_LOG_LEVEL` gates all four levels, that the default is `debug` in dev and `warn` in production, that `error` is always emitted (even in production), and that an unrecognised level string falls back to the environment default rather than to silence.

## Relationships
- **SUT:** `src/infrastructure/logger.ts` (aliased `@/infrastructure/utils/logger`) — the sole module under test; every assertion is about its exported `logger` object.

## Notes
- Every test case stubs `VITE_APP_LOG_LEVEL` explicitly, even when asserting the default. Omitting it would let Vite inject the developer's local `.env` value into `import.meta.env`, making the assertion environment-dependent.
- `DEV: true` is set in all cases except the two production-default cases (`DEV: false`), mirroring Vite's `import.meta.env.DEV` flag.
- The fresh-import pattern (`vi.resetModules` + dynamic `import`) is load-bearing: the logger captures its config at module-load time, so mutating env vars after the first import would have no effect.
- `vi.unstubAllEnvs()` runs in `afterEach` to prevent env leakage between tests.

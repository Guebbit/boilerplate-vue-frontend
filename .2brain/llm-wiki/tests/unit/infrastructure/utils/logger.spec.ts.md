---
source: tests/unit/infrastructure/utils/logger.spec.ts
sha256: 614d7d06e03e5f8a79da27f1b1a243e97301f1370d19d9fd440031c527ff20b8
generated_at: 2026-10-17T02:39:32.156510+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/logger.spec.ts

## Purpose

Unit tests for the app-wide console boundary logger (`@/infrastructure/utils/logger`). Because every other module routes its console output through this single logger, a wrong level or scope comparison either silences real errors or ships per-navigation noise to production. The tests pin down both filtering axes (scope and level) and their environment-dependent defaults, using a fresh-import pattern to control the exact configuration the module sees.

## Key elements

- **`loadLogger(environment)`** — resets Vitest modules, stubs the given env vars via `vi.stubEnv`, then dynamically imports the logger. Guarantees each test case sees a clean module with a known configuration.
- **`spies`** — per-test spies on `console.debug/info/warn/error` (set in `beforeEach`, restored in `afterEach`), used to assert which console channel the logger wrote to.
- **`describe('scope filtering')`** — verifies that only opted-in scopes emit `debug`, `*` enables all scopes, whitespace/trailing-commas in the list are tolerated, scope is prefixed (`[router]`), and `warn`/`error` are never suppressed by scope.
- **`describe('level filtering')`** — verifies messages below the configured level are dropped, `error` level silences all but errors, dev default is `debug`, prod default is `warn`, and an unrecognised level string falls back to the environment default rather than silencing output.

## Relationships

No graph neighbors recorded.

## Notes

- The logger reads its configuration **once at import**, so every test must stub env vars *before* the dynamic `import()`. `vi.resetModules()` is mandatory to avoid a cached module.
- `VITE_APP_LOG_LEVEL` is stubbed explicitly in every case (even "default" cases) because Vite injects the developer's own `.env` into `import.meta.env`; omitting the var would assert against an unknown value.
- `DEV` is always set alongside the other vars to control which environment default applies.
- The scope list is a simple comma-separated string (not an array); parsing robustness (spaces, trailing commas) is explicitly tested.
- `warn` and `error` bypass scope filtering entirely—only `debug` and `info` are subject to it.

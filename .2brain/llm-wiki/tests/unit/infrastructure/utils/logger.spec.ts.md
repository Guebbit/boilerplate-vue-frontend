---
source: tests/unit/infrastructure/utils/logger.spec.ts
sha256: 58356c0597603cf1a53b0c0766344745f621de03350a0a48a88f247db0b31de9
signature: f876f634e26a9f11ecb96378455f1d5dd1a9f5b92acea4f93ed3af4f341428b5
generated_at: 2026-11-10T08:06:21.212387+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/logger.spec.ts

## Purpose

Unit tests for the `@/infrastructure/utils/logger` module. The logger is the single console boundary the whole app routes through, so a mistaken scope or level comparison either silences real errors or leaks per-navigation noise into production. These tests pin both filtering axes (scope and level) and the intentional asymmetry that `warn`/`error` are never suppressed.

## Key elements

- **`loadLogger(environment)`** — helper that calls `vi.resetModules()`, stubs each key via `vi.stubEnv`, then dynamically imports the logger fresh. Every test case gets an isolated, config-bound instance.
- **`beforeEach` / `afterEach` (console spies)** — installs `vi.spyOn` mocks on `console.debug`, `info`, `warn`, `error` and restores them after each test, so assertions are against call counts and arguments rather than actual output.
- **`describe('scope filtering')`** — verifies: opted-in scope emits, opted-out scope drops, empty list drops all, `*` enables all, spaces/trailing-commas are tolerated, the scope is prefixed (`[router]`), and `warn`/`error` bypass scope filtering entirely.
- **`describe('level filtering')`** — verifies: messages below the configured level are dropped, `error` level silences all but errors, dev default is `debug`, prod default is `warn`, errors still ship in prod (Faro), and an unrecognised level string degrades to the environment default rather than silencing output.

## Relationships

- **`tests/cross-cutting/module-map.spec.ts`** — the module-map spec asserts that every source module (including `infrastructure/utils/logger`) is accounted for in the project's module map. This file exercises that module's runtime behaviour; the map spec guards its structural registration. They cover complementary concerns (structure vs. behaviour) for the same logger module.

## Notes

- **Every case stubs `VITE_APP_LOG_LEVEL` explicitly, including "default" cases.** Vite injects the developer's own `.env` into `import.meta.env`, so omitting the variable would assert against whatever the local `.env` contains rather than the code's fallback. The same discipline applies to `VITE_APP_LOG_SCOPES` and `DEV`.
- **The logger reads its configuration once at import time.** This is a deliberate property pinned by the tests: reading per-call would let a stale `.env` change behaviour mid-session. The `vi.resetModules()` + re-import pattern in `loadLogger` is the mechanism that makes this property testable.
- **Warn and error are exempt from scope filtering by design** ("the one thing you always want to see is the thing that went wrong"). This is tested but easy to accidentally regress if a future refactor centralises filtering.

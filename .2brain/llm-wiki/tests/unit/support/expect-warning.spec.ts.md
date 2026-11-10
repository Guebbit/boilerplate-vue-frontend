---
source: tests/unit/support/expect-warning.spec.ts
sha256: 8f1d1649429ef49302417860ffb4a8ceda05d04f004d0827efa4257ea322faaf
signature: b52b4c769f6469b6f9d67ed844593143417934ae4ac5e1e46269d750d5017172
generated_at: 2026-11-10T08:23:38.479474+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/support/expect-warning.spec.ts

## Purpose

Unit tests for the Vue-warning watcher utility. Verifies that `createWarningWatcher` correctly flags undeclared `[Vue warn]` messages, accepts declared ones, ignores non-Vue output, and restores the console it wrapped. Also exercises `expectWarning`, the convenience function the setup file exposes to tests.

## Key elements

- **`watched()`** – local helper that builds a fake console (`vi.fn()` spies for `warn`/`error`), wraps it with a started `createWarningWatcher`, and returns `{ target, original, watcher }` for assertions.
- **`describe('createWarningWatcher')`** – 8 cases covering:
  - Fails on an undeclared `[Vue warn]` (via `warn` or `error`).
  - Ignores non-Vue messages (`[intlify]`, app logger, non-string args).
  - Accepts declared warnings by substring *or* regex.
  - Fails if a declaration never fired (prevents stale expectations).
  - Passes calls through to the underlying console (spy still receives the arg).
  - Restores original `warn`/`error` on `finish()`.
  - `start()` clears prior state so warnings don't carry between tests.
- **`describe('expectWarning')`** – single case that calls `expectWarning('[Vue warn]: …')` then writes to the **real** `console.warn`, confirming the setup-file watcher accepts it.

## Relationships

- **`tests/support/unit/expect-warning.ts`** – the module under test; provides `createWarningWatcher` and `expectWarning`, both imported at the top of this spec.

## Notes

- The `expectWarning` case intentionally bypasses the fake console and writes to the real `console.warn`; the `eslint-disable` comment and the in-code annotation make this deliberate. The setup file's `afterEach` is what must pass the declared warning, so this case is an integration check with the global harness rather than an isolated unit test.
- The watcher keys off the literal `[Vue warn]:` prefix; any other prefix (`[intlify]`, bare strings, numbers) is silently ignored.
- Declarations are matched by substring *or* regular expression—both forms are exercised in one test.
- Each `watched()` call creates an independent watcher instance; there is no shared global state between `it` blocks.

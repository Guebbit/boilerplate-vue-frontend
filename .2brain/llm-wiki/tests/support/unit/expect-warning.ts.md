---
source: tests/support/unit/expect-warning.ts
sha256: d80af53f63ceb117395a0fd0a2307e61c0855068f6e6623de30813c394b3bc65
signature: dec74d9854fcb68afb67015216345c94504ddcb97afc882bcfe609c1846495cb
generated_at: 2026-11-10T07:40:58.101403+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/expect-warning.ts

## Purpose

Test-support utility that turns unannounced `[Vue warn]` messages into test failures. It wraps `console.warn` and `console.error` for the duration of each test, records any Vue-prefixed warning, and at teardown fails the test if a warning fired without being declared or a declared warning never fired. This prevents green runs from silently hiding Vue/Vuetify deprecation warnings.

## Key elements

- **`WarningMatcher`** (`string | RegExp`) — the shape of a declared warning: a substring or a pattern.
- **`ConsoleTarget`** — `Pick<Console, 'warn' | 'error'>`, the minimal console surface the watcher needs; also the injection point for fakes in unit tests.
- **`createWarningWatcher(target)`** — factory returning `{ start, expect, finish }`. `start` resets state and wraps the two console methods; `expect` records a matcher; `finish` restores originals and throws if there are unexpected warnings or unfired declarations.
- **`warnings`** — singleton instance bound to the real `console`, used by the test runner.
- **`expectWarning(matcher)`** — the public API a spec calls to declare "this test is expected to trigger this Vue warning."
- **`matches(matcher, warning)`** — internal helper: substring check for strings, `.test()` for regexps.

## Relationships

- **`tests/support/unit/setup.ts`** — imports the `warnings` singleton and manages its lifecycle around every test, making the watcher active for the entire suite.
- **`tests/unit/support/expect-warning.spec.ts`** — unit-tests `createWarningWatcher` against a fake `ConsoleTarget` to verify wrap/restore and match logic.
- **`src/modules/notifications/tests/notifications-bell.spec.ts`** — consumer; calls `expectWarning(...)` to acknowledge Vue warnings emitted by the notification-bell component.
- **`tests/unit/ui/use-media-query.spec.ts`** — consumer; calls `expectWarning(...)` for warnings raised by the media-query composable.

## Notes

- Only messages whose first `console` argument is a string starting with `[Vue warn]` are recorded. The app's own logger writing to `console.warn`/`error` is intentionally ignored, as are `[intlify]` messages.
- `@vue/reactivity` bypasses Vue's `warnHandler` and writes straight to the console, so wrapping the console methods (rather than setting `warnHandler`) is the correct interception point.
- The check is bidirectional: a declared warning that never fires also fails the test (`unfired` list), catching stale declarations after refactors.
- `finish` restores the original methods before evaluating, so a failure in `finish` itself won't leave the console wrapped.

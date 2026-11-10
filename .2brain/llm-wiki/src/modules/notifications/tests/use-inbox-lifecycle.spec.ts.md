---
source: src/modules/notifications/tests/use-inbox-lifecycle.spec.ts
sha256: f32e6d251a62c393169b6578da5ed1b2242d3b8b6624f72879a1ae4acbb206d8
signature: c3bbadd270a0bec546a5ba2436cae23d7fe76b447f02f74b1e1f2bf885d84d1c
generated_at: 2026-11-10T04:50:18.420675+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/tests/use-inbox-lifecycle.spec.ts

## Purpose

Vitest spec for the `useInboxLifecycle` composable. It verifies the full wiring contract: which SSE URL and event names are opened, that every (re)open triggers a fresh inbox read, how each stream frame mutates the inbox store, and that session teardown or component unmount tears down the stream and clears notifications. The SSE client itself is mocked; the test owns the *interaction* assertions.

## Key elements

- **`createSseClient` (mocked)** — Factory returning `{ close }`. Parameters are declared but ignored in the body so `mock.calls` retains full tuple typing for assertion purposes.
- **`close` (shared mock)** — A single `vi.fn()` every mocked stream instance shares, allowing `toHaveBeenCalledTimes` assertions regardless of which stream opened.
- **`orvalMutator` (mocked via `@/infrastructure/http`)** — Returns `parseOrvalFixture(…)` or rejects with `readFailure`, letting each test control the inbox payload and simulate HTTP errors.
- **`row(id)`** — Builds a minimal `Notification` fixture (code `notifications.staff.outbox-dead`, audience `own`).
- **`signIn(id)`** — Populates the session store with a token and viewer so the composable treats the user as authenticated.
- **`start()`** — Runs `useInboxLifecycle()` inside a fresh `effectScope`, mirroring a component's `setup`.
- **`lastCallbacks()`** — Shorthand for the callbacks object of the most recently opened stream.
- **`readCount()`** — Counts `orvalMutator` calls to assert read frequency.
- **`open()`** — Signs in, starts the composable, flushes promises, and returns the active stream's callbacks.
- **Test groups** — `a guest`, `a signed-in person`, `the stream's frames`, `the end of a session`, `a language switch`.

## Relationships

- **`src/modules/notifications/composables/use-inbox-lifecycle.ts`** — The system under test; imported and invoked inside `start()`.
- **`src/modules/notifications/store.ts`** — `useNotificationsInboxStore` is read after every action to assert items, `unreadCount`, and clearing.
- **`src/infrastructure/http/index.ts`** — `orvalMutator` is mocked at the module level so all HTTP reads flow through the controllable fake.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope to register DI bindings before any test runs.
- **`tests/support/unit/orval-fixture-schema.ts`** — `parseOrvalFixture` converts the mutable `inboxOnServer` array into the exact response shape the composable expects, per request method and URL.

## Notes

- `wireModulesIntoCore()` runs at **module import time**, not inside a `beforeEach`. If other specs in the same file relied on a different wiring, they would collide.
- The shared `close` `vi.fn()` means you cannot distinguish which stream instance was closed; assertions are on total call count.
- `loadLocale('en')` is called in `beforeEach` and explicitly reset in the language-switch test; forgetting the reset would leak locale state into subsequent runs.
- The composable is executed via `effectScope.run`, so its reactive effects are bound to the scope. `scope.stop()` in `afterEach` is the teardown mechanism the "component goes away" test exercises.

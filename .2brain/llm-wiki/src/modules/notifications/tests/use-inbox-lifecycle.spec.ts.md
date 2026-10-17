---
source: src/modules/notifications/tests/use-inbox-lifecycle.spec.ts
sha256: 3ea1e8299101125de41ee5670e82f151c98be81101f8a06072b26de1fc51290d
generated_at: 2026-10-17T01:10:28.129016+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/tests/use-inbox-lifecycle.spec.ts

## Purpose

Integration-style unit test for the `useInboxLifecycle` composable. It verifies the *wiring* the composable owns—which SSE URL and event names are opened, that a read fires on every (re)open, that stream frames mutate the inbox store, and that session teardown (logout, user swap, component unmount) closes the stream and clears notifications. The SSE client and HTTP layer are both mocked; no network or browser SSE is involved.

## Key elements

- **`createSseClient` mock** (`vi.fn`) — returns `{ close }`; the shared `close` spy lets tests assert teardown. Parameters are declared (though unused in the body) so `mock.calls` is typed as a 3-tuple, enabling assertions on the URL, event names, and callbacks the composable passed.
- **`orvalMutator` mock** (`vi.mock('@/infrastructure/http')`) — intercepts `GET /notifications`; resolves with `inboxOnServer` (mutable per test) or rejects with `readFailure`.
- **`row(id)`** — factory for a single `Notification` fixture with multilingual `titles`.
- **`grantNotificationKeys()`** — installs a CASL ability (`read: Notification`) on the session store so the composable's permission check passes.
- **`signIn(id)`** — populates `accessToken` and `viewer` on the session store.
- **`start()`** — runs `useInboxLifecycle()` inside a fresh `effectScope`, mirroring a component's setup; returns the reactive `mayRead` ref.
- **`open()`** — shorthand: sign in, grant keys, start, flush; returns the SSE callbacks of the opened stream.
- **Test groups:** guest (no-op), signed-in person (permission gate, late key grant, read-on-reopen, read-failure toast), stream frames (created / deleted / read events), session end (logout, user swap, scope stop), language switch (i18n re-render).

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/modules/notifications/composables/use-inbox-lifecycle.ts` | The composable under test; invoked via `start()`. |
| `src/modules/notifications/store.ts` | `useInboxStore` is read to assert items, `unreadCount`, and post-locale-switch `text`. |
| `src/infrastructure/http/index.ts` | `orvalMutator` is mocked out; its call log backs `readCount()`. |
| `tests/support/unit/wire-modules.ts` | `wireModulesIntoCore()` is called at module top-level to register test doubles before any test runs. |
| `tests/unit/infrastructure/http/orval-fixture-schema.ts` | `orvalEnvelope` and `parseOrvalFixture` shape the mock HTTP response so it passes the real Orval schema parser. |

## Notes

- The composable is **reactive to the session store**: granting the `read: Notification` key *after* `start()` still triggers stream creation (covered by the "late-arriving key" test). This is a deliberate design choice, not a timing quirk.
- `effectScope` is used instead of mounting a component; `scope.stop()` in `afterEach` simulates unmount and is itself an assertion target (the "closes the stream when the component that started it goes" test).
- `inboxOnServer` and `readFailure` are plain `let` bindings, not `vi.fn`—they are mutated per test and read by the `orvalMutator` mock closure.
- The `orvalMutator` mock is registered on `@/infrastructure/http` (not on the Orval-generated client directly), matching how production code imports the mutator.

---
source: src/modules/notifications/tests/store.spec.ts
sha256: 2559bb7b4107315a57d5ea9c4dc87abf3cd93b8dca88f56a62b3c752d5e1c733
generated_at: 2026-10-17T01:10:11.936681+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/tests/store.spec.ts

## Purpose

Unit spec for the inbox store (`useInboxStore`). Verifies how server notification rows become persistent messages in the vue-toolkit store, how refetches, stream frames, and bell-side writes interact with them, and what each failure mode leaves behind. The transport (`orvalMutator`) is the only mock; the generated HTTP client, the toolkit message store, and the inbox store under test are all real, so the property under test is their collaboration.

## Key elements

- **`answers`** (module-level mutable record) — Canned HTTP responses keyed by `METHOD /url`. A plain value is resolved as a promise; a function is *called*, enabling per-test rejection or mid-request side effects.
- **`vi.mock('@/infrastructure/http', …)`** — Replaces `orvalMutator` with a router that looks up `answers[key]` and, for resolved values, pipes the payload through `parseOrvalFixture` so it cannot drift from the generated response schema.
- **`row(id, overrides?)`** — Factory returning a default `Notification` (cart-line-removed, en/it titles). Accepts a `RowOverrides` partial to swap `code`, `params`, `severity`, timestamps, etc.
- **`serverHolds(rows)`** — Shorthand: sets `GET /notifications` to answer with the given rows wrapped in an `orvalEnvelope`.
- **`refusal(status)`** — Returns a function that rejects with an error shaped like `onResponseReject` output (`{ status, errors: [{ message }] }`).
- **`holdRead(rows)`** — Returns a `release()` thunk; the corresponding `GET /notifications` promise stays pending until the test calls `release()`, enabling overlapping-read scenarios.
- **`requests()`** — Reads `orvalMutator` mock calls back as `METHOD url` strings for assertion.
- **`toolkit()`** — Convenience accessor for the fresh `useNotificationsStore()` instance.
- **`describe('sync', …)`** — 10 cases covering: row ordering & i18n text, quiet addition (no toast), in-place update preserving a shown toast, no auto-hide timer for quietly-added rows, idempotent re-sync, server-side removal without a DELETE call, non-notification messages left alone, mid-read stream push vs. stale empty read, cart-merge-refused wording (sync + stream paths), and failed read producing a toast while retaining prior state.
- **`describe('a read that is still out when something else happens', …)`** — Overlapping-read cases: stream push arriving between two in-flight reads; deletion frame arriving while an older read is still pending.
- **`beforeEach` / `afterEach`** — Fresh Pinia, cleared mocks, default answers for `read-all`/`dismiss-all`, locale load; `afterEach` restores real timers.

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/modules/notifications/store.ts` | Provides `useInboxStore`, the SUT. Tests call `sync()`, `reset()`, `receiveCreated()`, and read `items`, `unreadCount`. |
| `src/infrastructure/http/index.ts` | Source of `orvalMutator`, which this spec replaces via `vi.mock`. No real HTTP occurs. |
| `tests/support/unit/wire-modules.ts` | `wireModulesIntoCore()` is invoked at module scope (top-level side effect) to register test doubles before any test runs. |
| `tests/unit/infrastructure/http/orval-fixture-schema.ts` | Supplies `orvalEnvelope` (wraps items in the standard envelope) and `parseOrvalFixture` (validates a canned payload against the generated Orval schema before the mock returns it). |

## Notes

- **Two kinds of mock answer:** a *value* (resolved through `parseOrvalFixture`) vs. a *function* (called directly, bypassing schema parsing). Use the function form when the route must reject or trigger side effects mid-request.
- **`answers` is mutable module state**, not a Vitest mock. It is reset in `beforeEach`; forgetting to set a key will cause `parseOrvalFixture` to receive `undefined` and throw.
- **Timers:** `afterEach` unconditionally calls `vi.useRealTimers()`. Tests that need fake timers (auto-hide assertion) call `vi.useFakeTimers()` themselves.
- **`refusal` returns a function, not a promise.** The mock's router detects `typeof answer === 'function'` and invokes it, so the rejection is fresh each call—important when the same route is hit more than once.
- **Overlap tests rely on `Promise.withResolvers`** (ES2024). The `holdRead` helper captures the resolver and returns a `release` thunk; the read promise only settles after `release()` is called.
- **`wireModulesIntoCore()` runs at import time**, not inside a test. If the wiring changes, this spec can break before any `it` block executes.

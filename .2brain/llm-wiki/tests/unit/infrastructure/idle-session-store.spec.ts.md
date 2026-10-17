---
source: tests/unit/infrastructure/idle-session-store.spec.ts
sha256: 950fb7e527d7787df6be1f7e92e4c5ec4873d9e80e3fe6bca746227d01dceb05
generated_at: 2026-10-17T02:37:26.739814+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/idle-session-store.spec.ts

## Purpose

Unit tests for the **idle clock** slice of the Pinia session store. Verifies that the idle timeout is read from the server's `touch` response, advanced by the client's own `noteActivity()`, cleared by `signalIdle()`, and handled gracefully when the touch request fails. Only the HTTP transport is mocked; all store logic runs for real.

## Key elements

- **`touchAnswer`** (module-level `let`) — holds the next server response for `POST /account/session/touch`; each test overwrites it before calling `touchSession()`.
- **`vi.mock('@/infrastructure/http', …)`** — factory mock of `orvalMutator` that routes every request through `parseOrvalFixture`, returning `touchAnswer` only for the touch URL.
- **`describe('the idle clock')`** — five `it` blocks:
  - *read from the server*: asserts `idle.timeoutMs` / `idle.lastActiveAt` are populated from the envelope for a staff account.
  - *absent for a shopper*: when the envelope omits `idleTimeoutSeconds`, `session.idle` is `undefined`.
  - *moves on with this tab's requests*: after `noteActivity()`, `lastActiveAt` is within 5 s of `Date.now()`.
  - *ends with the session*: `signalIdle()` sets `idle = undefined`, `idleSignal = 1`, `expiredSignal = 0`.
  - *survives a failed read*: a rejected `orvalMutator` call leaves `idle` undefined and the promise resolves (no throw).

## Relationships

- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `orvalEnvelope` (wraps a payload in the orval response envelope) and `parseOrvalFixture` (validates method + URL and returns the fixture). Both are used inside the transport mock to build realistic server responses without hitting a real API.
- **`@/infrastructure/session.ts`** — the `useSessionStore` Pinia store under test; its `touchSession`, `noteActivity`, `signalIdle`, and reactive `idle` / `idleSignal` / `expiredSignal` state are the subjects of every assertion.
- **`@/infrastructure/http`** — the real `orvalMutator` transport, fully replaced by the `vi.mock` factory so no network call is made.

## Notes

- The mock factory reads the **mutable** `touchAnswer` variable at call time (not at module-load time), which is how each test can set a different server response without re-mocking.
- `beforeEach` resets Pinia (`setActivePinia(createPinia())`) and clears the mock call history; `touchAnswer` is **not** reset, so every test must set it explicitly.
- The "failed read" test uses `mockRejectedValueOnce`, so subsequent tests in the same run are unaffected.
- Timestamp comparisons use `Date.parse` on the ISO string to avoid timezone drift in assertions.

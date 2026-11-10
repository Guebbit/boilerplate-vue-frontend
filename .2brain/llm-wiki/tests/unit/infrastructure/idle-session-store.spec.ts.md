---
source: tests/unit/infrastructure/idle-session-store.spec.ts
sha256: 84da399302e20794dbfb0ede3b296c0d68cbb22ad1353015be17abdca9587352
signature: f2465635369396f3e1005c6da80c944d93864e7978e3e941b44dbb1dfa900848
generated_at: 2026-11-10T08:00:53.690570+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/idle-session-store.spec.ts

## Purpose

Unit tests for the idle-session clock on the Pinia session store. Verifies that idle-timeout metadata is taken from server responses (sign-in, `GET /account`, or the touch endpoint), advanced by the local tab's activity, and cleared when the session ends. Only the HTTP transport (`orvalMutator`) is mocked; all store logic runs for real.

## Key elements

- **`touchAnswer`** (module-level `let`) — controls what `POST /account/sessions/current/touch` returns; each test sets it before calling `touchSession()`.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a stub that routes every call through `parseOrvalFixture(method, url, …)`, returning a validated fixture instead of a raw object.
- **`answer(activity)`** — helper that builds a full server response shape (`abilities` + `activity`) for use with `session.setViewer`.
- **`describe('the idle clock, carried by the answer that sets the viewer')`** — asserts idle state is populated from the viewer-setting response, is absent for shoppers (no `idleTimeoutSeconds`), is wiped by `clearSession()`, and that abilities survive a viewer update that carries no activity.
- **`describe('the idle clock')`** — covers `touchSession()` (reads server values, converts seconds→ms), `noteActivity()` (updates `lastActiveAt` locally), `signalIdle()` (clears idle, sets `idleSignal = 1`), and a rejected-network case (store resolves silently, `idle` stays `undefined`).

## Relationships

- **`tests/support/unit/orval-fixture-schema.ts`** → `parseOrvalFixture` is called inside the `orvalMutator` mock to shape and validate the fixture response for a given method + URL. This is the sole interaction with a graph-neighbor file; the store under test (`@/infrastructure/session.ts`) and the HTTP layer (`@/infrastructure/http`) are consumed but are not listed as graph neighbors here.

## Notes

- The mock inspects `config.url` to decide whether to inject `touchAnswer`; all other calls receive `undefined` as the third arg to `parseOrvalFixture`, so they must resolve from the fixture schema alone.
- The `noteActivity` assertion uses a 5-second tolerance (`toBeLessThan(5000)`) rather than an exact timestamp, to avoid flakiness.
- `signalIdle` sets `idleSignal` to `1` while leaving `expiredSignal` at `0`; the test explicitly checks both.
- `vi.mocked(orvalMutator).mockClear()` runs in `beforeEach`, so each test starts with zero call history.

---
source: tests/unit/infrastructure/http/keepalive.spec.ts
sha256: f1671db0ab693768343c9b8100d550633855fec1b1e9cdc569f4e3ca89a60fbb
signature: cadaa663e0a959ff59586ad56fe3eaa7dfcef4c50acd702e48889c736f4b8e20
generated_at: 2026-11-10T07:58:54.019665+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/keepalive.spec.ts

## Purpose

Unit tests for `sendKeepalive`, the last request a page can issue while it is being torn down. Verifies that the call uses native `fetch` with `keepalive: true` (not axios, which dies with the page), carries the correct authentication depending on session mode, is a no-op when unsigned, and never throws to the caller.

## Key elements

- **`fetchMock`** — `vi.fn` stub replacing global `fetch`; resolves `200` by default, rejectable per-call.
- **`beforeEach`** — fresh Pinia instance, global `fetch` stub, and `instance.defaults.baseURL` pinned to `http://api.test`.
- **`afterEach`** — clears all mocks.
- **`describe('sendKeepalive')`** — four cases:
  - *bearer mode*: asserts URL, method, `keepalive: true`, `Authorization` header, and JSON-serialised body.
  - *cookie mode*: asserts `credentials: 'include'` is set and **no** `Authorization` header is present.
  - *unsigned*: asserts `fetch` is never called.
  - *failure*: asserts a rejected `fetch` does not propagate a throw (fire-and-forget semantics).

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The SUT is called **synchronously** in tests (no `await`); the "swallows a failed send" case only verifies the synchronous call path doesn't throw — it does **not** assert that the rejection is actually caught downstream.
- Cookie-mode test relies on `startCookieSession()` to flip internal state; without it the store defaults to bearer mode.
- `fetchMock` is installed via `vi.stubGlobal`, not `vi.mock('fetch')`, so the SUT's reference to the global `fetch` is what gets intercepted.

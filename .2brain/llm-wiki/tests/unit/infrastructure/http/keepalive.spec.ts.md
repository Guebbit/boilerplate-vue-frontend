---
source: tests/unit/infrastructure/http/keepalive.spec.ts
sha256: acd346ea64e461bcb3ca72016ba11a4629471602486cbf6a4fdf461480e60612
generated_at: 2026-10-17T02:36:31.011898+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/keepalive.spec.ts

## Purpose

Unit tests for `sendKeepalive`, the last request a page can fire during unload. The tests verify that the call uses native `fetch` with `keepalive: true` (not axios, which is destroyed with the page), attaches the correct auth header depending on session mode, is a silent no-op for signed-out callers, and never throws to the page-teardown caller.

## Key elements

- **`fetchMock`** — a `vi.fn` global `fetch` stub that resolves a `200` by default; used to assert URL, method, headers, body, and `keepalive` flag.
- **`beforeEach` / `afterEach`** — fresh Pinia instance per test, `fetch` stubbed globally, `instance.defaults.baseURL` set to `http://api.test`; all stubs/mocks cleaned after each test.
- **`describe('sendKeepalive')`** — four cases:
  - Bearer mode: asserts full URL, `PUT` method, `keepalive: true`, `Authorization: Bearer …`, and JSON-stringified body.
  - Cookie mode: asserts `credentials: 'include'` and **absence** of an `Authorization` header.
  - Signed-out: asserts `fetch` is never called.
  - Rejected send: asserts `sendKeepalive` does not throw (error is swallowed).

## Relationships

- Imports the module under test: `@/infrastructure/http/keepalive.ts` (`sendKeepalive`).
- Imports the shared axios `instance` from `@/infrastructure/http/client.ts` solely to set `defaults.baseURL` so the relative path in the assertion resolves to the expected absolute URL.
- Imports `useSessionStore` from `@/infrastructure/session.ts` to configure auth mode and token before each scenario.

## Notes

- Tests stub **global** `fetch` rather than mocking a module — intentional, because `sendKeepalive` must call `fetch` directly (axios would already be dead at page-close time).
- The "signed-out" case expects a silent no-op, not a 401 response: the function short-circuits before any network call.
- The cookie-mode test explicitly checks that the `Authorization` key is **absent** from the headers record, guarding against accidentally sending a stale bearer token alongside the session cookie.

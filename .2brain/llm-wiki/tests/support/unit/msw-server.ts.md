---
source: tests/support/unit/msw-server.ts
sha256: 671cd83773fdb7b51df7e3600d76ad99c7aee371c1cdca0b514ff5c9157c00e7
signature: 6c47394aef440cbdf8c97491942a4c391631f1f6eee701fe9f88b9bb4b9470b4
generated_at: 2026-11-10T07:42:16.453978+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/msw-server.ts

## Purpose

Single shared MSW (Mock Service Worker) server instance for the unit-test suite. It provides a `fetch`/XHR/`node:http(s)` interceptor that refuses any request not explicitly mocked, ensuring tests never hit the network. It is intentionally created with zero handlers so that specs must declare their own expectations.

## Key elements

- **`server`** (exported const) — The MSW `setupServer()` instance. Specs import it and call `server.use(...)` inside a test to register handlers for that test only. Because it is instantiated with no handlers, any unmocked request is rejected rather than forwarded.

## Relationships

- **`tests/support/unit/setup.ts`** — Starts the server before tests and resets it after each test (per the file's doc comment). This file owns the server's lifecycle (`.listen()`, `.resetHandlers()`, `.close()`).
- **`src/modules/account/tests/account-export-download-view.spec.ts`**, **`src/modules/account/tests/profile-export-data.spec.ts`**, **`src/modules/shop-tasks/tests/work-feed.spec.ts`**, **`src/modules/tasks/tests/detail-view.spec.ts`**, **`src/modules/tasks/tests/inbox-view.spec.ts`**, **`src/modules/tasks/tests/task-badge.spec.ts`**, **`src/modules/users/tests/review-badge.spec.ts`**, **`src/modules/webhooks/tests/auto-disabled-badge.spec.ts`**, **`tests/unit/infrastructure/http/http-etag.spec.ts`**, **`tests/unit/infrastructure/http/http-refresh.spec.ts`**, **`tests/unit/infrastructure/http/http-validate-requests.spec.ts`**, **`tests/unit/infrastructure/http/http-validate-responses.spec.ts`**, **`tests/unit/infrastructure/http/step-up.spec.ts`**, **`tests/unit/scripts/e2e/webhook-tester.spec.ts`** — Import `server` from this module and register per-test handlers. They do not create their own MSW instances.
- **`msw/node`** (external) — The only runtime dependency; keeping the import limited to this package prevents the app module graph from leaking into the test setup.

## Notes

- Do **not** register persistent handlers here. The no-handler default is a deliberate safety net: a missing mock fails the test loudly instead of silently calling a real endpoint.
- The file is meant to be imported by specs only; the lifecycle is owned by `setup.ts`.
- Because it imports only `msw/node`, it is safe to pull into the jest setup without pulling in application code.

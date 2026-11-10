---
source: tests/unit/infrastructure/utils/errors.spec.ts
sha256: 7cf78d96122c42fe4357a8fd8d48eed0510e39e5c4c7647fa8ad41e3a66bcc79
signature: 65bbe8e1de323b306e590187fd2cfee8edeacc9b59aa4b4d69ac113050f67ab8
generated_at: 2026-11-10T08:04:53.438392+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/errors.spec.ts

## Purpose

Unit tests for the error-handling utilities in `@/infrastructure/utils/errors.ts`. Verifies the classification logic (transport failure vs. answered response), the "absence" detection used by stores, the message-extraction priority chain, and the user-facing notification path (including its observability side-effect).

## Key elements

- **`describe('notifyErrorMessages')`** — Exercises the string/Error/error-like/unknown-input branches, the empty-message guards, and asserts that `captureException` (stubbed via `vi.mock` on the observability store) receives the *original* value, not the derived display string.
- **`describe('isTransportFailure')`** — Table-driven checks: `undefined`, `null`, bare strings/numbers, and envelopes lacking a numeric non-zero `status` all classify as transport failures; any real HTTP status code classifies as an answered response. Specifically asserts `{ status: 0 }` is a transport failure.
- **`describe('absentIs')`** — Confirms the function matches only the caller-supplied status(es) and never reads a transport failure as "resource absent."
- **`describe('rethrowUnlessAbsent')`** — Verifies the function returns silently for named absence statuses but rethrows the *original* error object (not a wrapped one) for any other status, including transport failures.
- **`describe('isPreconditionFailed')`** — True only for `status: 412`; false for other 4xx/5xx codes and all transport-failure shapes.
- **`describe('getErrorMessage')`** — Priority chain: first `errors[].message` → `detail` → envelope `message` → caller-supplied fallback → translated generic (`enMessages['api-errors'].unknown`).
- **`beforeAll` / `vi.mock` setup** — Loads the `en` locale dictionary so fallback assertions compare against real copy; replaces the observability store with a mock whose `captureException` is a `vi.fn()`, making the reporting path observable (the real store is a no-op until Faro is wired up).

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The file contains several deliberate "invisible-in-review" guard tests (empty string, `Error('')`, `{ message: '' }`, `null`, non-string `message`). These exist because each falsy shape is individually easy to regress; they are intentionally separate cases rather than one combined test.
- `status: 0` is a project-specific sentinel written by `onResponseReject` in `http/interceptors.ts` to mean "no HTTP answer at all" (offline, timeout, CORS, cancel). The tests pin that it must classify as a transport failure, not a real status code.
- The observability store mock is required because the real `captureException` is currently a no-op; without it, every "was it reported?" assertion would pass vacuously.
- The file was truncated in the provided content; the `getErrorMessage` block and any further `describe` blocks may contain additional cases not listed above.

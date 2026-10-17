---
source: tests/unit/infrastructure/utils/use-missing-record.spec.ts
sha256: fc2eaabccc8938a93f4762440bf01c6e496ffaf0fa7dcf690c3fdd2195db9ee5
generated_at: 2026-10-17T02:40:31.090092+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/use-missing-record.spec.ts

## Purpose
Unit tests for the `useMissingRecord` composable, verifying the routing vs. toast decision it makes based on an API response status: 404/403 redirect to a dedicated Error page, while any other failure (HTTP or network) stays on the page and surfaces a toast.

## Key elements
- **`useMissingRecord`** (imported from `@/infrastructure/utils/use-missing-record.ts`) — the composable under test; called and then invoked with a response/error object.
- **`replaceMock`** — stub for `vue-router`'s `replace`, asserting navigation targets and params.
- **`addMessageMock`** — stub for the toast dispatcher (`useNotificationsStore.addMessage`).
- **`captureExceptionMock`** — stub for the observability store's exception reporting.
- **`vi.mock` blocks** — replace `vue-router`, `@guebbit/vue-toolkit`, the observability store, and `@/i18n` (translate passes keys through) so the test isolates the status→action decision.
- **Four test cases** — 404 (not-found wording), 403 (forbidden wording), 500 (toast + exception, no navigation), and a non-HTTP `Error` (offline, toast only).

## Relationships
No graph neighbors are recorded for this file. It depends solely on the `useMissingRecord` composable it imports; all other collaborators (router, toast store, observability store, i18n) are mocked and not tracked as file-level dependencies.

## Notes
- The i18n mock returns the key verbatim, so assertions compare against raw keys like `'error-page.not-found'` and `'navigation.error-forbidden'` rather than translated strings.
- `useMissingRecord()` is called without arguments inside each test and the *returned* function is what receives the response object — a two-step invocation pattern.
- The 500 case also verifies `captureException` is called with the full error object, not just the message.
- `beforeEach` calls `vi.clearAllMocks()` to prevent cross-test contamination of the three spies.

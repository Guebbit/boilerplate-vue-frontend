---
source: src/modules/products/tests/use-active-locales.spec.ts
sha256: 77e43cb0868553a0931232b9edcb1855cb4557b15084bc85f647e623184e5787
generated_at: 2026-10-17T01:34:58.573646+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/use-active-locales.spec.ts

## Purpose

Vitest suite that verifies `useActiveLocales` degrades gracefully when the backend `GET /locales` endpoint is unavailable (404, network error) or returns a valid manifest. It exists to guard against a regression where a failed locale fetch would leave a product form with zero tabs and a perpetually-visible skeleton loader.

## Key elements

- **`vi.mock('@api', …)`** — Replaces `getLocales` with a `vi.fn()` while preserving all other `@api` exports via `importOriginal`.
- **`beforeEach` → `vi.mocked(getLocales).mockReset()`** — Resets the mock between tests so each case starts clean.
- **`describe('GET /locales unavailable')`** — Two tests:
  - Asserts the composable falls back to exactly one tab (`en`) and sets `fallbackLocale` to `'en'`.
  - Asserts `fetchActiveLocales()` resolves (never rejects), so callers don't need their own `try/catch`.
- **`describe('GET /locales answers')`** — One test:
  - Feeds a full Italian-locale manifest and confirms `locales.value` and `fallbackLocale` reflect the server response rather than the fallback.

## Relationships

- **`src/modules/products/composables/use-active-locales.ts`** — The system under test. This spec imports `useActiveLocales` and exercises its return values (`locales`, `fallbackLocale`, `fetchActiveLocales`).
- **`@api` (module)** — The `getLocales` function is the sole external dependency being stubbed; no other `@api` exports are exercised here.

## Notes

- The module-level docblock in this file is deliberately descriptive: it states *why* the fallback matters (preventing an infinite skeleton), not just *what* the tests assert.
- The "never rejects" contract is load-bearing — downstream form components call `fetchActiveLocales()` without a surrounding `catch`. Any refactor that makes the composable throw will break those call sites silently.
- Tests use `vi.mocked(getLocales)` (not the raw import) for assertions, so type information is preserved without a cast.

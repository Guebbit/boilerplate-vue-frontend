---
source: tests/unit/infrastructure/http/http.spec.ts
sha256: 2e8e49a04e6aaf4193ca9354034019464df3b1a888a41d24bcdf6b8f3bfb3e74
signature: a75c471d22777cdb0b58ed4b4bbc5a187ea062ea4e4c3c734fb831ea5c15a677
generated_at: 2026-11-10T07:58:14.009139+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/http.spec.ts

## Purpose

Unit tests for `onResponseReject` (exported from `@/infrastructure/http`), verifying that every axios rejection—whether the API sent a well-formed problem-details body or the failure is a raw transport/gateway error—is normalized into a consistent, user-safe shape before it reaches the UI. The file exists to guard the error-normalization contract, especially the boundary between API-provided messages and locally synthesized fallbacks.

## Key elements

- **`makeAxiosError(status, data, headers)`** — local helper that builds the object shape of an axios rejection (`response.status`, `response.data`, `response.headers`, `config.url`).
- **`describe('onResponseReject')`** — tests the problem-details pass-through path: unchanged fields, `details.field` lifting, `x-request-id`/`traceparent` enrichment, method+path preservation, 401/403 normalization, absent-header omission, and `application/problem+json` media-type handling.
- **`describe('onResponseReject — fallback normalisation')`** — tests the non-problem path: 5xx canonicalization (including the exact 500 boundary), 499 must *not* be canonicalized, guaranteed `minItems: 1` on `errors`, `status: 0` + `NETWORK_ERROR` for transport failures, axios `code` → error-code mapping (`ECONNABORTED`/`ETIMEDOUT` → `TIMEOUT`, `ERR_CANCELED` → `CANCELED`), `statusText` preference over `message`, and the `||`-vs-`??` empty-string fallback.
- **`vi.mock('@/infrastructure/session')`** — stubs `useSessionStore` so the SUT can be imported without a real session.
- **`vi.mock('pinia')`** — provides a no-op `defineStore` because `@/infrastructure/http` transitively imports `reauth-prompt.ts`, whose `defineStore` call executes at import time.
- **`vi.mock('@/i18n')`** — only `getCurrentLocale` is stubbed; `translate` is deliberately left real so assertions validate the actual English copy from `enMessages`.
- **`beforeAll`** — calls `loadLocale('en')` so the real i18n instance is ready.

## Relationships

- **`tests/support/unit/fixtures.ts`** — provides the `aProblem(status, errors)` factory used throughout to construct realistic RFC 7807 problem-detail objects for both the pass-through and fallback test cases.

## Notes

- Every test body uses a dynamic `import('@/infrastructure/http')` rather than a top-level static import. This ensures the module (and its transitive `pinia`/`step-up`/`reauth-prompt` imports) is loaded *after* the `vi.mock` calls are registered, avoiding a real `defineStore` execution.
- The 500-boundary test ("treats exactly 500 as a server error") is a deliberate regression guard: with `> 500` the most common server error would fall through to the raw `statusText` branch.
- The empty-`statusText` test documents that the code uses `||` (not `??`) so that axios's `statusText: ''` is treated as falsy and the `message` field is used instead, preventing a blank error toast.
- `enMessages` is imported directly from `@/locales/en.json` (not via the i18n instance) to avoid coupling the test assertions to the loaded-locale state while still verifying the exact English strings a user would see.

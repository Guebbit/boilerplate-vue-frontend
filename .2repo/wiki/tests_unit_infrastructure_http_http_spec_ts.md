# tests/unit/infrastructure/http/http.spec.ts

## Purpose

Unit tests for the `onResponseReject` axios interceptor, verifying that every shape of API error (well-formed reject envelopes, transport failures, gateway errors, network-level failures) is normalised into the single `success / status / message / errors / requestId / traceId` envelope the UI consumes.

## Key elements

- **`makeAxiosError(status, data, headers)`** — local helper that builds a minimal axios-error-shaped object with a `response` payload, used by every test case.
- **`describe('onResponseReject')`** — happy-path / envelope tests:
  - Pass-through of a standard `{ success, message, errors }` envelope.
  - Enrichment with `requestId` / `traceId` pulled from `x-request-id` / `x-trace-id` response headers.
  - 401 and 403 normalisation into i18n `unauthorized` / `forbidden` messages.
  - Absence of `requestId` / `traceId` keys when headers are not present.
- **`describe('onResponseReject — fallback normalisation')`** — edge-case / boundary tests:
  - Any 5xx (including exactly 500) canonicalised to `internal-server-error`.
  - 499 left un-canonicalised (boundary check for the `>= 500` branch).
  - Non-401/403 fallbacks produce an empty `errors` array.
  - No `response` object at all → default status 500.
  - Message fallback chain: `statusText` → axios `message` → i18n `unknown`.
  - Empty `errors: []` in a valid envelope is still treated as an envelope (not re-synthesised).
- **Mocks** — `useSessionStore`, `storeToRefs`, and `getCurrentLocale` are stubbed; `translate` is intentionally left as the **real** vue-i18n function so assertions check actual user-visible strings.

## Relationships

- **`src/infrastructure/http/index.ts`** — the module under test. Every test case dynamically imports `onResponseReject` (and its `loadLocale` side-effect) from this file.
- **`@/locales/en.json`** — imported as `enMessages` and used to assert the exact i18n keys (`api-errors.unauthorized`, `.forbidden`, `.internal-server-error`, `.unknown`) that the interceptor must surface.
- **`@/infrastructure/i18n`** — partially mocked (`getCurrentLocale` stubbed to `'en'`); the real `translate` and `loadLocale` are exercised to validate end-to-end message resolution.

## Notes

- Tests use **dynamic `import('@/infrastructure/http')`** inside each `it` block rather than a top-level static import, ensuring the module is loaded after all `vi.mock` registrations are in place.
- The 5xx boundary is explicitly tested at **500 (included)** and **499 (excluded)**; a regression to `> 500` would silently mis-handle the most common server error.
- Envelope detection in the code under test relies on `hasOwnProperty('errors')`, not truthiness — the empty-`errors` test guards against a regression to a `.length` or `Boolean(errors)` check.
- `statusText` fallback uses `||` (not `??`) because axios sets `statusText` to `''` on many adapters; the empty-string test exists to pin that behaviour.

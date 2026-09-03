# tests/unit/infrastructure/http/http.spec.ts

## Purpose

Unit tests for `onResponseReject`, the Axios error-interceptor in `@/infrastructure/http`. The file verifies both the "envelope passthrough" path (well-formed API reject bodies) and the "fallback normalisation" path (transport failures, bare status codes, missing messages), ensuring that whatever reaches the UI is a safe, localized, user-facing message rather than a raw Axios string or server-internal detail.

## Key elements

- **`makeAxiosError(status, data, headers?)`** – helper that builds a minimal Axios-style error object (`response.status`, `response.statusText`, `response.data`, `response.headers`, `message`, `config.url`) so tests can simulate any HTTP failure without a real network call.
- **`vi.mock('@/infrastructure/i18n', …)`** – partial mock: only `getCurrentLocale` is stubbed to return `'en'`; `translate` is intentionally left as the real vue-i18n implementation so assertions compare against actual localized strings.
- **`vi.mock('@/infrastructure/session', …)` / `vi.mock('pinia', …)`** – stub the Pinia session store so importing the HTTP module doesn't require a live store.
- **`beforeAll → loadLocale('en')`** – loads the English locale into the real i18n instance before any test runs.
- **`describe('onResponseReject')`** – 6 tests covering: envelope passthrough, `x-request-id`/`x-trace-id` header capture, fallback header capture, 401 normalization, 403 normalization, and absence of header fields when not present.
- **`describe('onResponseReject — fallback normalisation')`** – 8 tests covering: 5xx canonicalisation (including the `>= 500` boundary at exactly 500), 499 *not* being canonicalised, empty `errors` array for non-401/403 fallbacks, missing `response` defaulting to status 500, `statusText` preference over Axios `message`, empty-`statusText` falling through to `message`, generic fallback when both are empty, and empty `errors[]` array still being detected as an API envelope (via `hasOwnProperty`, not truthiness).
- **`enMessages`** (`@/locales/en.json`) – imported to build expected assertion values so tests assert against the *actual* shipped strings rather than hardcoded literals.

## Relationships

No dependency-graph neighbors are recorded for this file. It imports the module under test (`@/infrastructure/http`) via dynamic `import()` inside each test to keep module-level mocks isolated, and references `@/locales/en.json` for expected strings.

## Notes

- Tests use `import('@/infrastructure/http')` inside each `it` body rather than a top-level import, so every test gets a fresh module evaluation under the current mock set.
- The `||`-vs-`??` distinction is explicitly tested: Axios sets `statusText` to `''` (not `undefined`) on many adapters, so the implementation must treat empty string as falsy. A regression to `??` would surface a blank toast.
- Envelope detection is `hasOwnProperty('errors')`, *not* `errors.length > 0`. A test confirms that an API response carrying `errors: []` is still treated as the API's own envelope and passed through unchanged.
- The 5xx boundary is tested at exactly 500 and at 499 (the "other side"), guarding against an off-by-one (`> 500` vs `>= 500`) that would mis-message the single most common server failure.
- No snapshot or e2e coverage exists here; all assertions are against the shape and localized content of the rejected value.

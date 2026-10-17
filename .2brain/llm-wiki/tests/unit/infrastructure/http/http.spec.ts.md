---
source: tests/unit/infrastructure/http/http.spec.ts
sha256: ff53d9af8fb1ffeb42ce6bdc8edf74eb300d7543123fa844e767f8ffa6b84244
generated_at: 2026-10-17T02:36:06.389379+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/http.spec.ts

## Purpose
Unit tests for `onResponseReject`, the axios response-reject interceptor exported from `@/infrastructure/http`. The suite verifies that every HTTP failure—whether a well-formed API reject envelope, a 401/403 state change, a 5xx server error, or a pure transport failure—is normalised into a consistent error shape with user-safe messages before it reaches the UI.

## Key elements
- **`makeAxiosError(status, data, headers?)`** – Builds the object shape of an axios rejection (`response.status`, `response.data`, `response.headers`, `config.url`) so tests don't depend on real network calls.
- **`describe('onResponseReject')`** – Tests the "well-formed envelope" path: pass-through of API-supplied `message`/`errors`, lifting `details.field` onto the error item, attaching `x-request-id` / `traceparent`, and preserving `method`/`path` on the normalised object.
- **`describe('onResponseReject — fallback normalisation')`** – Tests the fallback path (no valid envelope): 5xx canonicalisation (including the 500 boundary), 401/403 mapping to i18n state messages, empty `errors` array for other 4xx, `status: 0` + `NETWORK_ERROR` for missing responses, axios-code mapping (`ECONNABORTED`→`TIMEOUT`, `ETIMEDOUT`→`TIMEOUT`, `ERR_CANCELED`→`CANCELED`), and `statusText` vs `message` precedence.
- **Mocks** – `@/infrastructure/session` (pinia store with no token), `pinia` (`storeToRefs` identity, `defineStore` no-op), `@/i18n` (only `getCurrentLocale` stubbed; `translate` and `loadLocale` are real).

## Relationships
- **`@/infrastructure/http`** – the module under test; imported dynamically inside each test.
- **`@/locales/en.json`** – imported statically; its `api-errors.*` strings are the expected values in 401/403/5xx assertions.
- **`@/i18n`** – partially mocked; `loadLocale('en')` is called in `beforeAll` so the real translator resolves English strings.
- **`pinia` / `@/infrastructure/session`** – fully mocked to prevent real store instantiation triggered by transitive imports (`step-up.ts` → `reauth-prompt.ts`).

No additional graph-neighbor files are recorded.

## Notes
- Every test uses **dynamic `import('@/infrastructure/http')`** rather than a top-level static import. This defers module evaluation until after the `vi.mock` calls are registered and avoids executing `defineStore` at import time (a real Pinia is not booted).
- `translate` is deliberately **not** mocked. The i18n assertions compare against `enMessages` from the JSON file, ensuring the tests catch locale-key regressions rather than silently passing with a stub.
- The 500 vs 499 boundary is explicitly tested: the implementation uses `>= 500` (not `> 500`). A regression to `>` would let a bare 500 leak its raw `statusText`.
- `statusText` falls back via `||` (not `??`) because axios sets it to `''` on many adapters; an empty-string message would render as a blank toast.
- `status: 0` is the sentinel for "no response received" (DNS failure, CORS block, refused connection), distinguishing transport failures from answered requests for `isTransportFailure` in `utils/errors.ts`.

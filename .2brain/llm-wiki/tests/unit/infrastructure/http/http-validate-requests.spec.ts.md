---
source: tests/unit/infrastructure/http/http-validate-requests.spec.ts
sha256: d0a9dd850ba42d1d464ed33cb4e0a1010b3885bd7f14c0b4d201d2a018bfffdb
signature: fd95b6adf3058947f682784cf7336447497d0e0fbe0e3f0c6ab95249cf59c264
generated_at: 2026-11-10T07:57:47.921072+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/http-validate-requests.spec.ts

## Purpose

Unit-tests the request-validation layer of `orvalMutator` (gated by `VITE_VALIDATE_REQUESTS`) against a live MSW server, proving that a skipped `toRequestBody` call is loudly rejected, a conforming body passes through byte-for-byte, and the behavior is correct across dev, PROD report-only, and PROD+throw configurations.

## Key elements

- **`loadHttp()`** – Resets modules, stubs `VITE_API_URL`, then dynamically imports `@/infrastructure/http`, registers response-schema rows from enabled modules (mirroring `src/main.ts` boot), and returns the http module.
- **`patchAccount(data)`** – Convenience wrapper that calls `orvalMutator` with `PATCH /account` and the supplied body.
- **`received`** – Module-level `unknown` set by the MSW handler to capture exactly what hit the wire, so tests can assert the body was (or was not) sent untouched.
- **`beforeEach`** – Resets Pinia, clears `received`, and registers a `PATCH /account` MSW handler that records the parsed JSON body.
- **Test cases** (11 `it` blocks):
  - Validation is off by default under Vitest (partial body passes).
  - Invalid body is rejected with the offending field named; nothing reaches the network.
  - Conforming body (`phone: null`) is forwarded exactly as given.
  - `null` for a field that refuses it is rejected, not silently repaired ("never rewrites").
  - Explicit `VITE_VALIDATE_REQUESTS=false` disables validation.
  - PROD report-only (`VITE_CONTRACT_THROW` unset): reports to Faro via `captureException` **and** still sends.
  - PROD + `VITE_CONTRACT_THROW=true`: throws like dev, never sends.
  - `FormData` (multipart) bodies are skipped—JSON schema does not describe them.
  - Routes absent from the schema table fail open (request passes through).
  - Bodyless calls (e.g. `GET`) are never validated.

## Relationships

- **`tests/support/unit/msw-server.ts`** – Imports the shared `server` instance used to register per-test MSW handlers (the `PATCH /account` stub and ad-hoc routes like `/nope`, `/account` GET).

## Notes

- `vi.resetModules()` + dynamic `import()` in `loadHttp()` is required because `VITE_*` env vars are read at module-evaluation time; a static import would cache the first env snapshot.
- The PROD report-only test stubs `VITE_CONTRACT_THROW` to an empty string (falsy) to distinguish it from the PROD+throw test, which sets it to `'true'`.
- The `eslint-disable` on `expect.stringContaining` is a workaround for Vitest's type treating placeholder matchers as `any`; it is not a real type error.

---
source: tests/unit/infrastructure/http/envelope.spec.ts
sha256: ccda5ba00d5a8c28dd287c500d7d4951495827417b06b0bcc4488e03fac0a516
signature: 78fc0a940bec17f2cab85dba7c96c7df56df08a1d71a5041dc180aeea0c348a0
generated_at: 2026-11-10T07:56:10.064643+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/envelope.spec.ts

## Purpose

Unit tests for the two problem-details reader functions (`getFirstApiError`, `getRetryAfter`) exported by the HTTP envelope module. Each case is named after the concrete response shape it validates rather than an abstract scenario, ensuring the readers handle the real envelopes that `onResponseReject` and its callers (step-up, 2FA store, CSV export) actually produce.

## Key elements

- **`describe('getFirstApiError', …)`** — six `it` blocks covering:
  - Extracting the first `{ code, … }` object from a structured reject envelope.
  - Parsing a body that arrived as a JSON *string* (the `responseType: 'text'` path used by the orders CSV export), including the non-JSON `<html>` fallback → `undefined`.
  - Passing `details` through untouched (the 429 / `retryAfter` shape the 2FA store reads).
  - Returning `undefined` for an empty `errors` array, a missing/non-array `errors` key, or a non-object entry.
  - Returning `undefined` when the input is `undefined`, a bare string, or `null` (transport-failure / thrown-string cases).

- **`tooSoon(code, retryAfter)`** — local helper that builds a 429 problem via the `aProblem` fixture, used by every `getRetryAfter` case.

- **`describe('getRetryAfter', …)`** — two `it` blocks covering:
  - Returning the numeric `retryAfter` when the problem's error `code` matches the requested code.
  - Returning `undefined` when the code differs, `retryAfter` is a non-number (e.g. the string `'42'`), or the input is a generic `Error` (network failure).

## Relationships

- **`tests/support/unit/fixtures.ts`** — provides the `aProblem(status, errors)` factory. The `tooSoon` helper in this file calls it to construct well-shaped 429 problem objects for every `getRetryAfter` assertion. This is the sole import from the test-support layer.

## Notes

- The module doc comment explicitly states the naming convention: each case names the *response shape* it stands for, not an invented passing scenario. New tests should follow this.
- `getFirstApiError` is deliberately permissive about input type (object, JSON string, or garbage) — it never throws. Tests assert `undefined` for every malformed path rather than an exception.
- `getRetryAfter` requires *both* a matching `code` and a numeric `retryAfter`; a correct code with a string value still yields `undefined`. This is stricter than simply reading `details.retryAfter`.
- The empty-`errors`-array case is called out in a comment as type-legal but semantically empty — downstream readers must guard with `?.` rather than indexing blindly.
- Comments in the test body reference production callers (`onResponseReject`, `step-up.ts`, the 2FA store, the orders CSV export) to explain *why* each shape matters; they are not imports and have no runtime dependency on this file.

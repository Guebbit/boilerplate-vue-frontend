---
source: tests/support/problem-stub.ts
sha256: 8ace0f4a8722c6fc03cc3bb00894738824921c6b19f62e003e9e6ef5168aba2a
signature: 7558df4ba67b02a0aada954796ee7f0541dac91e6369cf271098257a4a0855ca
generated_at: 2026-11-10T07:38:49.114472+00:00
model: ollama:qwen3.8:27b
---

# tests/support/problem-stub.ts

## Purpose

Builds RFC 9457 Problem+JSON rejection responses for Cypress stubs. It centralises the shape (status, headers, body) and the `errors[]` array so every e2e stub matches exactly what `rejectResponse` on the backend produces, preventing hand-typed drift from going unnoticed.

## Key elements

- **`REASON_PHRASES`** (private const) — Maps common HTTP status codes (400–503) to their RFC 9110 English phrases, used to fill the `title` field.
- **`PROBLEM_MEDIA_TYPE`** (exported const) — The string `'application/problem+json'`, used in the `content-type` header of every stub response.
- **`ProblemBody`** (exported interface) — Hand-written structural type for the Problem+JSON body: `type`, `title`, `status`, `detail`, and `errors: { code: ErrorCode; message: string }[]`.
- **`RejectResponse`** (exported interface) — The subset of a static-response shape a rejection uses: `statusCode`, `headers`, `body: ProblemBody`.
- **`rejectEnvelope(status, code, message?)`** (exported function) — Returns a fully-populated `RejectResponse`. `message` defaults to the `code` value if omitted. `code` is typed as `ErrorCode`, so a typo is a compile error.

## Relationships

- **`contracts/rest/error-codes.ts`** — Imports the `ErrorCode` union type; this is the sole compile-time dependency.
- **`tests/unit/scripts/e2e/problem-stub.spec.ts`** — Unit-test spec that assigns a `rejectEnvelope` body to the generated `Problem` type, catching any member the contract adds later.
- **`tests/support/e2e/action-table.ts`**, **`tests/support/e2e/envelope.ts`**, **`src/modules/account/tests/e2e/auth.cy.ts`**, **`tests/e2e/specs/journeys/fr6-too-many-attempts.cy.ts`**, **`tests/e2e/specs/journeys/vi3-a-guest-writes-to-the-shop.cy.ts`** — Consumers that call `rejectEnvelope` to build stub rejection responses.

## Notes

- `ProblemBody` is hand-typed rather than imported from the generated contract. Importing the generated type would drag the entire app through `contracts/rest/index.ts` into the Cypress bundle. The unit spec above closes the gap by cross-checking against the generated type.
- `REASON_PHRASES` is not exported; callers always go through `rejectEnvelope`.
- The `type` field is hard-coded to `'about:blank'` per the project's convention; it is not parameterised.
- `message` parameter defaults to the `code` string, so a minimal call site is `rejectEnvelope(429, 'RATE_LIMITED')`.

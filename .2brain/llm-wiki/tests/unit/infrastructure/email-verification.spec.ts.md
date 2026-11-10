---
source: tests/unit/infrastructure/email-verification.spec.ts
sha256: 07374170452681098c8da3742871491bcc6f3e300f48c99de1a797fd421130a7
signature: 9699faea43c7497942c7bc8badc775fadb53a415a18bb5686f4666b6ec2a9652
generated_at: 2026-11-10T07:55:05.906113+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/email-verification.spec.ts

## Purpose

Unit tests for `src/infrastructure/email-verification.ts`. Verifies that `requestEmailVerification` passes through the server's own resend-cooldown value, and that `emailVerifyResendRetryAfter` returns `undefined` for errors that are not the shared 429 resend cooldown.

## Key elements

- **`requestEmailVerificationMock`** — a deliberately untyped `vi.fn()` that stands in for the `@api` request call; kept untyped because the generated return types reject the ad-hoc fixture shapes used in tests.
- **`vi.mock('@api', …)`** — factory mock that routes `requestEmailVerification` to the mock; only the `@api` barrel is stubbed.
- **`requestEmailVerification`** (imported from `@/infrastructure/email-verification.ts`) — the function under test; expected to resolve with the numeric `resendAfter` value from the response.
- **`emailVerifyResendRetryAfter`** (same module) — helper that extracts a retry-seconds value from a 429 rejection; tested here only for the negative case (non-cooldown error → `undefined`).
- **`contractResponse`** (from `tests/support/unit/orval-fixture-schema.ts`) — builds a schema-conformant fixture payload from a generated schema, here `schemas.RequestEmailVerificationResponse`.

## Relationships

- **`tests/support/unit/orval-fixture-schema.ts`** — provides `contractResponse`, which wraps a raw object in the shape the generated Orval schema expects, so the mock can return a realistic response without hand-building nested types.

## Notes

- The module under test is imported via `await import()` *after* `vi.mock` is registered, ensuring the mock is active before the module's top-level code runs.
- The file intentionally tests only the **happy path** for `requestEmailVerification` and the **non-cooldown** path for `emailVerifyResendRetryAfter`; the 429-extraction happy path is presumably covered elsewhere or is a thin pass-through not worth a dedicated case here.
- An `eslint-disable` comment suppresses `@typescript-eslint/no-unsafe-return` on the mock factory — the untyped `vi.fn()` is a known, accepted trade-off documented inline.

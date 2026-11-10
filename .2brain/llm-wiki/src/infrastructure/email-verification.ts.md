---
source: src/infrastructure/email-verification.ts
sha256: aa8b23b67d66d2178247b4560eac0129e56a2b4f2ec2bf85c822c14c5f457774
signature: 86e427048bd1f8d9e3fbd671ed7a33f8e8144ef31b46ce646cd3e7ff1f4b0e12
generated_at: 2026-11-10T03:02:26.661849+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/email-verification.ts

## Purpose

Stateless helpers for the email-verification resend flow: one function calls the API to resend the verification mail, the other extracts the server's cooldown from a `429` rejection. Both the banner (`POST /account/email-verification/resend`) and the profile page (`POST /account/email-change/resend`) share this module so the retry logic and the single `EMAIL_VERIFY_RESEND_TOO_SOON` code live in one place.

## Key elements

- **`emailVerifyResendRetryAfter(error: unknown): number | undefined`** — Pulls the `Retry-After` value (seconds) out of a thrown error, but only when the error carries `ERROR_CODES.EMAIL_VERIFY_RESEND_TOO_SOON`. Returns `undefined` for any other rejection. Delegates to `getRetryAfter` from the HTTP envelope helper.
- **`requestEmailVerification(): Promise<number>`** — Calls `requestEmailVerification` from `@api` and unwraps the response to return `resendAfter` (the server-assigned cooldown in seconds). The caller receives the server's number directly; it never surfaces the underlying 429.

## Relationships

No graph neighbors are recorded for this file. It depends on `@api` (the generated API client), `@api/error-codes`, and `@/infrastructure/http/envelope.ts` (`getRetryAfter`), but none of those appear as tracked neighbors in the dependency graph.

## Notes

- No state, no store — purely functional. Safe to import anywhere without side effects.
- The 429 the *client* would receive is intentionally hidden: `requestEmailVerification` resolves with the cooldown number, so a counting-down caller never handles the 429 itself.
- Both resend endpoints (banner and profile page) funnel through the same `ERROR_CODES.EMAIL_VERIFY_RESEND_TOO_SOON` constant, so any change to the cooldown semantics is a single-point edit here.

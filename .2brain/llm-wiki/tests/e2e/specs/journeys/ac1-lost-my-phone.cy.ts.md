---
source: tests/e2e/specs/journeys/ac1-lost-my-phone.cy.ts
sha256: 90d1f2daaba7cc8be7f916cf81f78b8fe264faa33f2428861c0939c85f1bf3f0
signature: 5594458cb8d9e25edb787bb7f16775cc79f88e3351a79485706ad4b5064e8770
generated_at: 2026-11-10T06:44:19.736166+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac1-lost-my-phone.cy.ts

## Purpose

End-to-end journey test for Acceptance Criterion 1 ("I lost my phone"): a customer whose second factor is unreachable signs in with a one-use backup code. The test verifies that each code burns after a single use, that regenerating the set invalidates every old code (used or not), and—on the demo profile—that step-up re-authentication (password + code) is enforced after the sensitive/critical time windows lapse.

## Key elements

- **`Persona`** (interface) — the shape of the object yielded by `cy.accountOf('twoFactor')`: `email`, `password`, optional `backupCodes`.
- **`codesOf(account)`** — pulls the persona's backup codes and asserts at least four are present before returning them.
- **`PAST_SENSITIVE_MS`** (`1_000_000`) — a duration just beyond the 900 s sensitive window; used with `cy.travel` to force a re-auth prompt on address change.
- **`PAST_CRITICAL_MS`** (`400_000`) — a duration just beyond the 300 s critical window; used to trigger the re-auth prompt on account deletion.
- **`describe('AC1 · I lost my phone: backup codes')`** — single test that walks the full journey: challenge → first code accepted → same code refused → second code accepted → regeneration (proven with third code) → fourth (unused) code dead → fresh code works → *(demo only)* time-travel, address-change re-auth, and deletion re-auth.
- **`beforeEach`** — visits `/en` and calls `cy.restore()` to reset demo state.

## Relationships

- **`tests/support/e2e/security-steps.ts`** — primary interaction layer. Imports `loginToChallenge`, `submitBackupCode`, `revealedBackupCodes`, and `dismissBackupCodes` for all 2FA / backup-code UI steps.
- **`tests/support/e2e/commands.ts`** — imports `byTemplate`, a selector/matcher for inbox messages (used to assert the "old address told about it" email).
- **`scripts/e2e/mail-filters.ts`** — indirect dependency: `byTemplate` (re-exported via `commands.ts`) ultimately delegates template-based inbox filtering to this module.

## Notes

- The `// requires-module: account` comment at the top is a prerequisite tag consumed by the test runner; the `account` module must be loaded before this spec executes.
- The test is profile-aware: everything up to "a new code signs in" runs on both live and demo profiles. The `cy.travel` block (address-change and deletion re-auth) is **skipped** when `liveProfile` is true because time travel is only available on the demo backend.
- The test relies entirely on the seeded `twoFactor` persona (pre-armed email 2FA + five known codes); it never reads email to *discover* codes, only to *verify* the change-notice at the end.
- `PAST_SENSITIVE_MS` and `PAST_CRITICAL_MS` are set deliberately a little above the documented thresholds (900 s / 300 s) to avoid race conditions with server-side clock checks.
